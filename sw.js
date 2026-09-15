const CACHE = 'min-works-v55';
const ASSETS = [
  './', './index.html?v=55', './app-latest.css?v=53', './ui-foundation.css?v=55', './ui-modern.css?v=55', './ui-linear.css?v=55',
  './report-update.js?v=55','./report-update.css?v=55','./documents-update.js?v=55','./documents-update.css?v=55','./navigation-refresh.js?v=55', './app-latest.js?v=55', './ui-experience.js?v=55', './manifest.webmanifest?v=55',
  './assets/icons/min-works-v4-180.png', './assets/icons/min-works-v4-192.png',
  './assets/icons/min-works-v4-512.png'
];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const isPage = event.request.mode === 'navigate';
  event.respondWith((async()=>{
    try {
      const response=await fetch(event.request);
      if(response.ok){const cache=await caches.open(CACHE);cache.put(event.request,response.clone())}
      return response;
    } catch(error) {
      const cached=await caches.match(event.request,{ignoreSearch:isPage});
      if(cached)return cached;
      if(isPage){const page=await caches.match('./index.html?v=55');if(page)return page}
      throw error;
    }
  })());
});
