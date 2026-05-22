const CACHE = 'sng-admin-v1';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['admin.html', 'manifest.json']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('push', e => {
  let data = { title: '🛍️ SNG Shop', body: 'Có thông báo mới', tag: 'sng-order' };
  try { data = e.data.json(); } catch (_) {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      tag:     data.tag || 'sng-order',
      icon:    'icon-192.png',
      badge:   'icon-192.png',
      vibrate: [200, 100, 200],
      data:    { url: data.url || './admin.html' },
      actions: [
        { action: 'open',    title: '📋 Xem đơn' },
        { action: 'dismiss', title: 'Đóng' }
      ]
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;

  const url = (e.notification.data && e.notification.data.url) || './admin.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('admin') && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});
