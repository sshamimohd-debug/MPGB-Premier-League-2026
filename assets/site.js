
import { loadState } from "./db.js";
import { q, qa } from "./utils.js";

(function initNav(){
  const page = location.pathname.split("/").pop() || "index.html";
  const key = page.replace(".html","");
  qa("[data-nav]").forEach(a=>{
    if(a.getAttribute("data-nav")===key) a.classList.add("active");
  });
  const st = loadState();
  const title = q("#brandTitle");
  if(title) title.textContent = st.settings.tournamentName || "MPGB Cricket Manager";
})();

if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
  });
}
