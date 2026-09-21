const CACHE = 'min-works-v67-docs20';
const ASSETS = ['./mobile-controls.js?v=66',
  './', './device-session.js?v=63', './mobile-update.css?v=66', './plus-icon-180.png', './plus-icon-192.png', './plus-icon-512.png', './index.html?v=docs20', './app-latest.css?v=53', './ui-foundation.css?v=57', './ui-modern.css?v=57', './ui-linear.css?v=57',
  './report-update.js?v=57','./report-update.css?v=57','./documents-update.js?v=57','./documents-update.css?v=57','./navigation-refresh.js?v=57', './app-latest.js?v=64', './ui-experience.js?v=57', './manifest.webmanifest?v=57',
  './reader.html', './reader.js?v=61', './reader.css?v=61', './reader.webmanifest?v=61', './plus-auth.js?v=63', './plus-auth.css?v=61', './plus-icon.svg', './reader-admin.js?v=66', './safety-engine.js?v=docs20', './safety-enhancements.js?v=docs20', './safety-native.js?v=docs20', './safety-forms.css?v=docs20', './safety-native.css?v=docs20', './assets/icons/min-works-v4-180.png', './assets/icons/min-works-v4-192.png',
  './assets/icons/min-works-v4-512.png', './document-forms.html?v=docs20', './document-forms.js?v=docs20', './document-forms.css?v=docs20', './document-tool-theme.css?v=docs20', './new-hire-print.html?v=docs20', './worker-pledge-print.html?v=docs20', './ppe-print.html?v=docs20', './tbm-tool.html?v=docs20', './risk-tool.html?v=docs20', './photo-ledger-pro-v1.html?v=docs20'
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
      if(isPage){const page=await caches.match(new URL(event.request.url).pathname.endsWith('/reader.html')?'./reader.html':'./index.html?v=docs20');if(page)return page}
      throw error;
    }
  })());
});

