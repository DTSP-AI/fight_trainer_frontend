/* Fight Trainer service worker — Web Push display + click-through.
 * Payload shape (see backend push_service): { title, body, url, kind }.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'Fight Trainer', body: '', url: '/', kind: 'generic' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {
    /* non-JSON payload — show defaults */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: { url: data.url, kind: data.kind },
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.kind,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
