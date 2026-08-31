const CACHE = 'min-works-v24';
const ASSETS = [
  './', './index.html', './styles.css', './app.js',
  './revision-1.css', './revision-2.css', './revision-3.css', './revision-4.css',
  './revision-5.css', './revision-7.css', './revision-8.css', './revision-8.js',
  './revision-11.css', './revision-14.css', './revision-15.css', './revision-16.css',
  './revision-17.css', './revision-17.js', './revision-18.css', './revision-18.js',
  './revision-19.css', './revision-19.js', './revision-20.css', './revision-20.js', './revision-21.css', './revision-21.js', './revision-22.css', './revision-22.js', './config.js', './security.css', './security.js', './weather.js', './manifest.webmanifest',
  './assets/icons/min-works-v4-180.png', './assets/icons/min-works-v4-192.png',
  './assets/icons/min-works-v4-512.png'
];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then(response => response || caches.match('./index.html'))));
});
