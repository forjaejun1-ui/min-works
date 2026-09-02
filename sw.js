const CACHE = 'min-works-v51';
const ASSETS = [
  './', './index.html?v=51', './app-latest.css?v=51', './app-latest.js?v=51', './manifest.webmanifest',
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
      if(isPage){const page=await caches.match('./index.html?v=51');if(page)return page}
      throw error;
    }
  })());
});
