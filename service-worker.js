
const CACHE = "mpgb-cricket-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./teams.html",
  "./points.html",
  "./admin.html",
  "./match.html",
  "./manifest.json",
  "./assets/style.css",
  "./assets/print.css",
  "./assets/site.js",
  "./assets/index.js",
  "./assets/teams.js",
  "./assets/points.js",
  "./assets/admin.js",
  "./assets/match.js",
  "./assets/db.js",
  "./assets/utils.js",
  "./assets/scoring.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
];

self.addEventListener("install", (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate", (e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE?null:caches.delete(k)))).then(()=>self.clients.claim())
  );
});
self.addEventListener("fetch", (e)=>{
  const req = e.request;
  e.respondWith(
    caches.match(req).then(hit=> hit || fetch(req).then(res=>{
      const copy = res.clone();
      caches.open(CACHE).then(c=>c.put(req, copy)).catch(()=>{});
      return res;
    }).catch(()=>caches.match("./index.html")))
  );
});
