// Service worker push handler — augments the vite-plugin-pwa generated sw
// vite-plugin-pwa injects its precaching logic; this file handles push events.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const { title, body, url } = data;

  event.waitUntil(
    self.registration.showNotification(title ?? 'Orbit', {
      body: body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data: { url: url ?? '/' },
      vibrate: [100, 50, 100],
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) return client.focus();
        }
        return clients.openWindow(url);
      }),
  );
});
