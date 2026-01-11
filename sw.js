
self.addEventListener('install', e=>{
  e.waitUntil(caches.open('mpgb-pl').then(c=>c.addAll(['./'])));
});
