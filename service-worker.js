/* Bump CACHE_VERSION after editing index.html or a theme file. */
const CACHE_VERSION = 'v3';
const CACHE_NAME = 'guest-guide-' + CACHE_VERSION;

const PRECACHE_URLS = [
  './', './index.html', './config.json', './manifest.json',
  './icon-192.png', './icon-512.png',
  './themes/yunque.css', './themes/slate.css'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c =>
    Promise.all(PRECACHE_URLS.map(u => c.add(u).catch(() => null)))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Content: network-first so edits land as soon as the tablet is online.
  if (req.url.includes('config') && req.url.includes('.json')) {
    e.respondWith(
      fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return res;
      }).catch(() => caches.match(req, {ignoreSearch:true}))
    );
    return;
  }

  // Shell, themes, fonts: cache-first, refreshed in the background.
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
