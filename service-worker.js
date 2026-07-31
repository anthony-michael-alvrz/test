/* ============================================================
   Offline support.
   Bump CACHE_VERSION whenever you want tablets to force-refresh
   everything on their next online load.
   ============================================================ */
const CACHE_VERSION = 'v2';
const CACHE_NAME = 'guest-guide-' + CACHE_VERSION;

const PRECACHE_URLS = [
  './',
  './index.html',
  './config.json',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll fails entirely if one file 404s, so add individually
      Promise.all(PRECACHE_URLS.map((u) => cache.add(u).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isConfig = req.url.includes('config') && req.url.endsWith('.json');

  if (isConfig) {
    // Network-first for content, so edits land as soon as the tablet is online.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first for the shell and fonts — instant load, refreshed in background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
