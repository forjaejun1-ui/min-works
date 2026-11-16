importScripts('/min-works/push-sw.js?v=save103');
const CACHE = 'min-works-v110-report-upload';
const ASSETS = ['./training-print.js?v=field109','./document-forms.html?doc=hot-work-permit&v=field109','./photo-ledger-theme.css?v=photo107','/min-works/employee-account.js?v=login105','/min-works/employee-account.css?v=login104','/min-works/push-notifications.js?v=save103','/min-works/push-notifications.css?v=save103','./storage-buy-guide.css?v=storage101','./qa-assistant.css?v=qa97','./qa-assistant.js?v=qa97','./guide-current.css?v=guide96','./guide-current.js?v=photo107','./vendor-integration.js?v=region106','./vendor-directory.html?v=region106','./vendor-directory.js?v=region106','./assets/PretendardVariable.woff2','./schedule-integration.js?v=field109', './schedule-tool.html?v=field109', './mobile-controls.js?v=weather108',
  './', './device-session.js?v=63', './mobile-update.css?v=weather108', './plus-icon-design-180.png', './plus-icon-design-192.png', './plus-icon-design-512.png', './plus-icon-design-maskable-512.png', './index.html?v=login104', './app-latest.css?v=89', './ui-foundation.css?v=57', './ui-modern.css?v=57', './ui-linear.css?v=57',
  './report-update.js?v=report110','./report-update.css?v=report110','./documents-update.js?v=issues22','./documents-update.css?v=57','./navigation-refresh.js?v=vendors95', './app-latest.js?v=report110', './issue-owner-sync.js?v=issues22', './patch-notes-current.js?v=report110', './qa-board.js?v=qa97', './qa-board.css?v=qa97', './assets/share-min-works.png', './assets/share-min-works-plus.png', './ui-experience.js?v=staff94', './manifest.webmanifest?v=design68',
  './reader.html', './reader.js?v=save103', './reader.css?v=design85', './reader.webmanifest?v=design81', './plus-auth.js?v=login105', './plus-auth.css?v=design81', './plus-opening.js?v=design81', './plus-icon-design.svg', './reader-admin.js?v=66', './safety-engine.js?v=field109', './safety-enhancements.js?v=docs20', './safety-forms.css?v=docs20', './safety-native.js?v=field109', './safety-native.css?v=photo107', './assets/icons/min-works-design-180.png', './assets/icons/min-works-design-192.png',
  './assets/icons/min-works-design-512.png', './assets/icons/min-works-design-maskable-512.png', './document-forms.html?v=field109', './document-forms.js?v=field109', './document-forms.css?v=field109', './document-tool-theme.css?v=docs20', './new-hire-print.html?v=field109', './worker-pledge-print.html?v=field109', './ppe-print.html?v=field109', './tbm-tool.html?v=docs20', './risk-tool.html?v=field109', './photo-ledger-pro-v1.html?v=photo107'
];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(asset => new Request(asset, {cache:'reload'})))).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('min-works-v') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET'||new URL(event.request.url).origin!==self.location.origin) return;
  const isPage = event.request.mode === 'navigate';
  event.respondWith((async()=>{
    try {
      const response=await fetch(event.request, isPage ? {cache:'no-cache'} : undefined);
      if(response.ok){const cache=await caches.open(CACHE);cache.put(event.request,response.clone())}
      return response;
    } catch(error) {
      const cached=await caches.match(event.request,{ignoreSearch:isPage});
      if(cached)return cached;
      if(isPage){const page=await caches.match(new URL(event.request.url).pathname.endsWith('/reader.html')?'./reader.html':'./index.html?v=login104');if(page)return page}
      throw error;
    }
  })());
});

