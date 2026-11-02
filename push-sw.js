/* Shared Web Push handling for the main app and the separately installed Plus app. */
self.addEventListener('push',event=>{
 event.waitUntil((async()=>{
  let data;try{data=event.data?.json()}catch{}if(data?.type!=='mw-report')return;
  const u=new URL(data.url,self.location.origin);if(u.origin!==self.location.origin||!['/min-works/','/min-works-plus/'].includes(u.pathname))return;
  const plus=u.pathname==='/min-works-plus/';
  await self.registration.showNotification(String(data.title).slice(0,80),{body:String(data.body).slice(0,200),icon:plus?'/min-works/plus-icon-design-192.png':'/min-works/assets/icons/min-works-design-192.png',badge:'/min-works/assets/icons/min-works-design-192.png',tag:'mw-report-'+String(data.id).slice(0,200),data:{url:u.href},renotify:false});
  for(const c of await self.clients.matchAll({type:'window',includeUncontrolled:false}))if(c.visibilityState==='visible')c.postMessage(data);
 })());
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();event.waitUntil((async()=>{
  let url;try{url=new URL(event.notification.data?.url)}catch{return}if(url.origin!==self.location.origin||!['/min-works/','/min-works-plus/'].includes(url.pathname))return;
  // Never navigate an existing editor: it may contain an unsaved report.
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const exact=windows.find(c=>c.url===url.href);if(exact)return exact.focus();return self.clients.openWindow(url.href);
 })());
});
