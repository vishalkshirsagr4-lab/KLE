const router = require('express').Router();
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const { Notification, PushSubscription, User } = require('../models');
const { emitNotificationUpdate, getVapidPublicKey } = require('../lib/notifications');

router.use(auth);

router.get('/unread-count', async (req, res) => {
  const unreadCount = await Notification.countDocuments({ recipientId: req.user.id, isRead: false });
  res.json({ unreadCount });
});

router.get('/push/public-key', (req, res) => {
  const publicKey = getVapidPublicKey();
  res.json({ enabled: Boolean(publicKey), publicKey });
});

router.post('/push/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!getVapidPublicKey()) return res.status(503).json({ error: 'Browser push is not configured.' });
  if (
    typeof endpoint !== 'string' || endpoint.length > 2048 ||
    !/^https:\/\//i.test(endpoint) ||
    !keys || typeof keys.p256dh !== 'string' || keys.p256dh.length > 256 ||
    typeof keys.auth !== 'string' || keys.auth.length > 256
  ) {
    return res.status(400).json({ error: 'Invalid browser push subscription.' });
  }
  const user = await User.findById(req.user.id).select('_id role emailVerified');
  if (!user || user.role !== 'participant' || !user.emailVerified) {
    return res.status(403).json({ error: 'Only verified participants can enable browser push.' });
  }

  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { $set: { userId: user._id, endpoint, keys } },
    { upsert: true, new: true, runValidators: true }
  );
  res.status(204).end();
});

router.delete('/push/subscribe', async (req, res) => {
  const endpoint = req.body?.endpoint;
  if (typeof endpoint !== 'string' || endpoint.length > 2048) {
    return res.status(400).json({ error: 'A valid subscription endpoint is required.' });
  }
  await PushSubscription.deleteOne({ endpoint, userId: req.user.id });
  res.status(204).end();
});

router.get('/', async (req, res) => {
  const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1));
  const limit = Math.max(1, Math.min(50, Number.parseInt(req.query.limit, 10) || 20));
  const query = { recipientId: req.user.id };
  const [notifications, total] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(query)
  ]);
  res.json({
    notifications: notifications.map((notification) => ({
      id: notification._id.toString(),
      title: notification.title,
      message: notification.message,
      type: notification.type,
      announcementId: notification.announcementId ? notification.announcementId.toString() : null,
      isRead: notification.isRead,
      readAt: notification.readAt || null,
      createdAt: notification.createdAt,
      metadata: notification.metadata || {}
    })),
    page,
    limit,
    total,
    hasMore: page * limit < total
  });
});

router.patch('/read-all', async (req, res) => {
  const result = await Notification.updateMany(
    { recipientId: req.user.id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  emitNotificationUpdate(req.user.id, { allRead: true });
  res.json({ updated: result.modifiedCount });
});

router.delete('/clear', async (req, res) => {
  const result = await Notification.deleteMany({ recipientId: req.user.id });
  emitNotificationUpdate(req.user.id, { clear: true });
  res.json({ deleted: result.deletedCount || 0 });
});

router.patch('/:id/read', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid notification ID.' });
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipientId: req.user.id },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );
  if (!notification) return res.status(404).json({ error: 'Notification not found.' });
  const payload = {
    id: notification._id.toString(),
    isRead: notification.isRead,
    readAt: notification.readAt
  };
  emitNotificationUpdate(req.user.id, payload);
  res.json(payload);
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid notification ID.' });
  const notification = await Notification.findOneAndDelete({ _id: req.params.id, recipientId: req.user.id });
  if (!notification) return res.status(404).json({ error: 'Notification not found.' });
  emitNotificationUpdate(req.user.id, { id: notification._id.toString(), deleted: true });
  res.json({ deleted: true, wasUnread: !notification.isRead });
});

module.exports = router;
