self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { message: event.data ? event.data.text() : '' };
  }

  event.waitUntil(self.registration.showNotification(data.title || 'New KLE Announcement', {
    body: data.message || 'You have a new KLE update.',
    icon: '/kle-logo.jpg',
    badge: '/kle-logo.jpg',
    tag: data.id || 'kle-notification',
    data: {
      id: data.id || '',
      type: data.type || 'ANNOUNCEMENT',
      url: data.url || '/portal?view=notifications'
    }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const view = data.type === 'TEAM' ? 'teams' : 'announcements';
  const target = new URL(data.url || `/portal?view=${view}`, self.location.origin);
  if (target.origin !== self.location.origin) return;
  if (data.id) target.searchParams.set('notificationId', data.id);

  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
    const existing = clients.find((client) => new URL(client.url).origin === target.origin);
    if (existing) {
      await existing.navigate(target.href);
      return existing.focus();
    }
    return self.clients.openWindow(target.href);
  }));
});
