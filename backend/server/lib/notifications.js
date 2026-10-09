const webpush = require('web-push');
const { Notification, PushSubscription } = require('../models');
const { getRealtimeServer } = require('./realtime');

let vapidConfigured = false;

function publicNotification(notification) {
  return {
    id: notification._id.toString(),
    title: notification.title,
    message: notification.message,
    type: notification.type,
    announcementId: notification.announcementId ? notification.announcementId.toString() : null,
    isRead: notification.isRead,
    readAt: notification.readAt || null,
    createdAt: notification.createdAt,
    metadata: notification.metadata || {}
  };
}

function pushEnabled() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

async function sendPush(notification) {
  if (!pushEnabled()) return;
  if (!vapidConfigured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    vapidConfigured = true;
  }

  const subscriptions = await PushSubscription.find({ userId: notification.recipientId }).lean();
  const payload = JSON.stringify({
    id: notification._id.toString(),
    title: notification.title,
    message: notification.message,
    type: notification.type,
    url: notification.type === 'TEAM'
      ? '/portal?view=teams'
      : notification.type === 'ANNOUNCEMENT'
        ? '/portal?view=announcements'
        : notification.metadata?.url || '/portal?view=notifications'
  });
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: subscription.keys
      }, payload);
    } catch (error) {
      console.error('Web Push delivery failed:', error.statusCode || error.message);
      if (error.statusCode === 404 || error.statusCode === 410) {
        await PushSubscription.deleteOne({ _id: subscription._id });
      }
    }
  }));
}

async function createNotification(data) {
  let notification;
  try {
    notification = await Notification.create({
      recipientId: data.recipientId,
      announcementId: data.announcementId || undefined,
      title: data.title,
      message: data.message,
      type: data.type || 'OTHER',
      dedupeKey: data.dedupeKey,
      metadata: data.metadata || {}
    });
  } catch (error) {
    if (error.code === 11000) return null;
    throw error;
  }

  const payload = publicNotification(notification);
  const io = getRealtimeServer();
  if (io) {
    io.to(`user:${notification.recipientId}`).emit('notification', payload);
    io.to(`user:${notification.recipientId}`).emit('notification:new', payload);
  }

  try {
    await sendPush(notification);
  } catch (error) {
    console.error('Web Push notification service failed:', error.message);
  }
  return payload;
}

async function markInvitationNotificationRead(recipientId, invitationId, invitationStatus) {
  const set = { isRead: true, readAt: new Date() };
  if (invitationStatus) set['metadata.invitationStatus'] = invitationStatus;
  const notification = await Notification.findOneAndUpdate(
    { recipientId, type: 'TEAM', 'metadata.invitationId': invitationId.toString() },
    { $set: set },
    { new: true }
  );
  if (notification) {
    emitNotificationUpdate(recipientId, {
      id: notification._id.toString(),
      isRead: true,
      readAt: notification.readAt,
      metadata: notification.metadata
    });
  }
}

async function createAnnouncementNotifications(announcement, users) {
  const result = [];
  for (let offset = 0; offset < users.length; offset += 25) {
    const created = await Promise.all(users.slice(offset, offset + 25).map((user) => createNotification({
      recipientId: user._id,
      announcementId: announcement._id,
      title: 'Hackathon Announcement',
      message: announcement.message,
      type: 'ANNOUNCEMENT',
      dedupeKey: `announcement:${announcement._id}:${user._id}`,
      metadata: { url: '/portal?view=announcements' }
    })));
    result.push(...created.filter(Boolean));
  }
  return result;
}

function emitNotificationUpdate(recipientId, update) {
  const io = getRealtimeServer();
  if (io) io.to(`user:${recipientId}`).emit('notification:updated', update);
}

function getVapidPublicKey() {
  return pushEnabled() ? process.env.VAPID_PUBLIC_KEY : null;
}

module.exports = {
  createNotification,
  createAnnouncementNotifications,
  markInvitationNotificationRead,
  emitNotificationUpdate,
  getVapidPublicKey
};
