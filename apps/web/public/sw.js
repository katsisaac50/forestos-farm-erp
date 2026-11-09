const CACHE='forestos-field-shell-v2';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.add('/manifest.webmanifest')));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('forestos-field-shell-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET') return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin) return;
 event.respondWith(fetch(req).then(response=>{
   if(response.ok && (req.mode==='navigate'||url.pathname.startsWith('/_next/static/'))){const copy=response.clone();caches.open(CACHE).then(c=>c.put(req,copy));}
   return response;
 }).catch(async()=> (await caches.match(req)) || Response.error()));
});
