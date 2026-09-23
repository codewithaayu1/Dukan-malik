// Offline-first service worker. Caches the app shell so it opens with no internet;
// Firebase (cloud) calls always go to the network directly (not cached).
const VERSION = 'v3';
const CACHE = 'msm-' + VERSION;
const ASSETS = [
  './', './index.html', './manifest.json',
  './css/style.css',
  './js/app.js', './js/store.js', './js/ui.js', './js/utils.js', './js/auth.js',
  './js/views_main.js', './js/views_txn.js', './js/views_settings.js',
  './js/storage.js', './js/cloud.js', './js/config.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-192-maskable.png', './icons/icon-512-maskable.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Never cache Firebase / Google APIs — those need to hit the real network.
  if (/googleapis|gstatic|firebase/.test(url.hostname)) return;
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => cached || caches.match('./index.html'));
      return cached || fetchPromise;
    })
  );
});
