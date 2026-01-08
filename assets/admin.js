
import { loadState, saveState, exportState, importState, resetState } from "./db.js";
import { byId, sha256Hex, downloadText, readFileAsText } from "./utils.js";

function render(){
  const st = loadState();
  byId("brandTitle").textContent = (st.settings.tournamentName || "MPGB Cricket Manager") + " • Admin";
  byId("sName").value = st.settings.tournamentName || "";
  byId("sOvers").value = st.settings.oversPerInnings || 20;
}

byId("btnSaveSettings").addEventListener("click", ()=>{
  const st = loadState();
  st.settings.tournamentName = byId("sName").value.trim() || "MPGB Premier League 2026";
  st.settings.oversPerInnings = Math.max(1, Math.min(50, parseInt(byId("sOvers").value||"20",10)));
  saveState(st);
  alert("Saved.");
  render();
});

byId("btnSetPin").addEventListener("click", async ()=>{
  const p1 = byId("pin1").value.trim();
  const p2 = byId("pin2").value.trim();
  if(!/^\d{4,10}$/.test(p1)) return alert("PIN must be 4-10 digits.");
  if(p1!==p2) return alert("PIN mismatch.");
  const st = loadState();
  st.settings.adminPinHash = await sha256Hex(p1);
  saveState(st);
  byId("pin1").value=""; byId("pin2").value="";
  alert("PIN updated.");
});

byId("btnClearPin").addEventListener("click", ()=>{
  if(!confirm("Remove admin PIN? Anyone can edit matches in this browser.")) return;
  const st = loadState();
  st.settings.adminPinHash = null;
  saveState(st);
  alert("PIN removed.");
});

byId("btnExport").addEventListener("click", ()=>{
  const json = exportState();
  const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
  downloadText(`mpgb-cricket-backup-${ts}.json`, json);
});

byId("fileImport").addEventListener("change", async (e)=>{
  const f = e.target.files?.[0];
  if(!f) return;
  try{
    const txt = await readFileAsText(f);
    importState(txt);
    alert("Imported. Reloading…");
    location.reload();
  }catch(err){
    alert(err.message || String(err));
  }finally{
    e.target.value="";
  }
});

byId("btnReset").addEventListener("click", ()=>{
  if(!confirm("Reset ALL data in this browser?")) return;
  resetState();
  alert("Done. Reloading…");
  location.reload();
});

render();
