/*
 * OWNER: growth (push), scenes (place models)
 * Allworld's service worker. It does three things: show a notification when a push arrives, open the
 * game when that notification is tapped, and keep the unique place models (see PLACE MODELS below).
 * It caches nothing else and intercepts no other request: the one fetch handler answers only
 * /assets/places/<hash>.glb and the two shared atlas files next to them, so it cannot serve a stale
 * game or change how anything else loads.
 *
 * SCOPE AND UPDATES. Registered at "/" by the Stay in touch app when a player switches notifications
 * on, and by the game itself after the first place model has been shown (src/scene/places/persist.ts),
 * so a return visit can find the models on the device. The browser re-checks this file on its own (at
 * most every 24 hours, and on navigation); a changed file takes over at once (skipWaiting +
 * clients.claim), which is safe because the only state it holds is the place cache, whose entries are
 * content-addressed and never change. Switching notifications off unsubscribes; the worker then simply
 * never receives anything.
 *
 * A push payload is JSON { title, body, url, tag } made by server/growth/outreach.ts. The words
 * are the server's own; nothing in a payload is run or inserted as markup.
 */
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(Promise.all([self.clients.claim(), dropOldPlaceCaches()])); });

/*
 * PLACE MODELS. Every venue has its own model at /assets/places/<sha256>.glb and the models share one atlas at
 * /assets/places/trim-<sha256>.webp (2048) and trim-1024-<sha256>.webp. Each address names the SHA-256 of the file's own bytes, so
 * a cached answer can never be stale: it is cache-first, in Cache Storage under 'allworld-places-v1', which (with
 * navigator.storage.persist(), asked once by the game) the browser keeps longer than its HTTP cache. Only a plain 200 from this
 * origin is stored: an error, a redirect or a partial answer is never kept. A request with a Range header, any other method, any
 * other origin and any other path is left to the browser. If Cache Storage fails, the network answer is used as it is.
 */
const PLACES_CACHE = 'allworld-places-v1';
const PLACE_FILE = /^\/assets\/places\/(?:[0-9a-f]{64}\.glb|trim(?:-1024)?-[0-9a-f]{64}\.webp)$/;
function dropOldPlaceCaches() {
  return self.caches.keys().then((keys) => Promise.all(keys.filter((key) => /^allworld-places-v\d+$/.test(key) && key !== PLACES_CACHE).map((key) => self.caches.delete(key)))).catch(() => undefined);
}
function fromNetwork(event, request, key, cache) {
  return fetch(request).then((response) => {
    if (response.status === 200 && response.ok && response.type === 'basic' && !response.redirected) {
      const copy = response.clone();
      event.waitUntil(cache.put(key, copy).catch(() => undefined));
    }
    return response;
  });
}
function placeResponse(event, request, key) {
  return self.caches.open(PLACES_CACHE).then(
    (cache) => cache.match(key).then((hit) => hit || fromNetwork(event, request, key, cache)),
    () => fetch(request),
  );
}
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  let url;
  try { url = new URL(request.url); } catch (error) { return; }
  if (url.origin !== self.location.origin || !PLACE_FILE.test(url.pathname)) return;
  event.respondWith(placeResponse(event, request, url.origin + url.pathname));
});

/*
 * A message from a friend (kind 'chat') is shown only when no visible window of the game is open: someone who is looking at the game
 * is told by the game itself, and an active chat does not buzz the phone. One notification per conversation (the tag), which updates
 * in place and carries the count; the app badge (where the browser has one) shows the number of unread messages.
 */
function windows() { return self.clients.matchAll({ type: 'window', includeUncontrolled: true }); }
function showing(list) { return list.some((client) => client.visibilityState === 'visible'); }
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (error) { data = {}; }
  const title = typeof data.title === 'string' && data.title ? data.title.slice(0, 80) : 'Allworld';
  const url = typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//') ? data.url : '/';
  const chat = data.kind === 'chat';
  event.waitUntil(windows().then((list) => {
    if (chat && showing(list)) return undefined;
    const badge = Number.isSafeInteger(data.badge) && data.badge >= 0 ? data.badge : null;
    if (badge !== null && self.navigator && typeof self.navigator.setAppBadge === 'function') { try { (badge ? self.navigator.setAppBadge(badge) : self.navigator.clearAppBadge()).catch(() => {}); } catch (error) { /* no badge here */ } }
    return self.registration.showNotification(title, {
      body: typeof data.body === 'string' ? data.body.slice(0, 160) : '', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
      tag: typeof data.tag === 'string' ? data.tag.slice(0, 32) : 'allworld', renotify: chat, data: { url, conv: typeof data.conv === 'string' ? data.conv.slice(0, 120) : null },
    });
  }));
});

/* Tapping a notification: an open window of the game is focused AND told to open the conversation; with none open the game is opened at its address. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const info = event.notification.data || {};
  const url = info.url ? info.url : '/';
  event.waitUntil(windows().then((list) => {
    for (const client of list) {
      if (!('focus' in client)) continue;
      if (info.conv && typeof client.postMessage === 'function') client.postMessage({ type: 'open-chat', conv: info.conv });
      return client.focus();
    }
    return self.clients.openWindow(url);
  }));
});
