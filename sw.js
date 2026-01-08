const CACHE_NAME="mpgb-cricket-v1";
const ASSETS=[
  "index.html","schedule.html","teams.html","match.html","points.html","knockouts.html","documents.html","admin.html","scorecard.html",
  "css/style.css",
  "js/app.js","js/nav.js","js/index.js","js/schedule.js","js/teams.js","js/match.js","js/points.js","js/knockouts.js","js/documents.js","js/admin.js","js/scorecard.js",
  "data/teams.json","data/schedule.json","data/rules.json",
  "docs/IOM_02.01.2026_MPGB_Premier_League.pdf",
  "docs/MPGB_Premier_League_Revised_Schedule.pdf"
];
self.addEventListener("install",(e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));
});
self.addEventListener("activate",(e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));
});
self.addEventListener("fetch",(e)=>{
  e.respondWith(
    caches.match(e.request).then(res=>res || fetch(e.request).then(fr=>{
      const copy=fr.clone();
      caches.open(CACHE_NAME).then(c=>c.put(e.request,copy)).catch(()=>{});
      return fr;
    }).catch(()=>caches.match("index.html")))
  );
});