const CACHE = 'min-works-v58';
const ASSETS = [
  './', './index.html?v=57', './app-latest.css?v=53', './ui-foundation.css?v=57', './ui-modern.css?v=57', './ui-linear.css?v=57',
  './report-update.js?v=57','./report-update.css?v=57','./documents-update.js?v=57','./documents-update.css?v=57','./navigation-refresh.js?v=57', './app-latest.js?v=57', './ui-experience.js?v=57', './manifest.webmanifest?v=57',
  './reader.html', './reader.js?v=2', './reader.css?v=2', './reader.webmanifest', './reader-admin.js?v=58', './safety-engine.js?v=57', './safety-enhancements.js?v=57.1', './safety-native.js?v=57', './safety-forms.css?v=57', './safety-native.css?v=57', './assets/icons/min-works-v4-180.png', './assets/icons/min-works-v4-192.png',
  './assets/icons/min-works-v4-512.png'
];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET'||new URL(event.request.url).origin!==self.location.origin) return;
  const isPage = event.request.mode === 'navigate';
  event.respondWith((async()=>{
    try {
      const response=await fetch(event.request);
      if(response.ok){const cache=await caches.open(CACHE);cache.put(event.request,response.clone())}
      return response;
    } catch(error) {
      const cached=await caches.match(event.request,{ignoreSearch:isPage});
      if(cached)return cached;
      if(isPage){const page=await caches.match(new URL(event.request.url).pathname.endsWith('/reader.html')?'./reader.html':'./index.html?v=57');if(page)return page}
      throw error;
    }
  })());
});
