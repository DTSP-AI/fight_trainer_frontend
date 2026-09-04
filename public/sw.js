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
  // M4: a static service worker cannot read config, so the fallback title is
  // deliberately brand-free. Every real push carries its own title; this only
  // shows if the payload is malformed.
  let data = { title: 'New notification', body: '', url: '/', kind: 'generic' };
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
      // Unique tag per entity so concurrent notifications never replace each
      // other; renotify covers the deliberate-replacement case (same entity).
      tag: data.entity_id ? `${data.kind}:${data.entity_id}` : undefined,
      renotify: Boolean(data.entity_id),
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (clients) => {
        for (const client of clients) {
          try {
            // navigate() rejects on clients this SW doesn't control — fall
            // through to the next client (or openWindow) instead of focusing
            // a tab stuck on the wrong page.
            const navigated = await client.navigate(url);
            return (navigated || client).focus();
          } catch (_) {
            /* uncontrolled client — try the next one */
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
