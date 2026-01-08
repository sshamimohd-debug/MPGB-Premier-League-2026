(function(){
  renderNav("admin.html");
  function setStatus(msg, ok=true){
    const el=document.getElementById("status");
    el.textContent=msg;
    el.className="pill "+(ok?"ok":"danger");
  }
  document.getElementById("pinForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const p=document.getElementById("pin").value.trim();
    const p2=document.getElementById("pin2").value.trim();
    if(p.length<4){setStatus("PIN must be at least 4 digits.",false);return;}
    if(p!==p2){setStatus("PIN confirmation does not match.",false);return;}
    await APP.setAdminPin(p);
    setStatus("Admin PIN set successfully.");
    document.getElementById("pin").value="";document.getElementById("pin2").value="";
  });
  document.getElementById("exportAll").onclick=()=>{
    const blob=new Blob([JSON.stringify(APP.loadState(),null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);
    a.download=`mpgb_cricket_backup_${new Date().toISOString().slice(0,10)}.json`;a.click();
  };
  document.getElementById("importFile").addEventListener("change", async (e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    try{ const data=JSON.parse(await f.text());
      localStorage.setItem(APP.KEY, JSON.stringify(data));
      setStatus("Import successful. Refreshing...");
      setTimeout(()=>location.reload(),700);
    }catch(err){ setStatus("Invalid JSON file.",false); }
  });
  document.getElementById("resetAll").onclick=()=>{
    if(!confirm("This will clear all matches/players from this browser. Continue?")) return;
    localStorage.removeItem(APP.KEY);
    setStatus("Data cleared. Refreshing...");
    setTimeout(()=>location.reload(),700);
  };
  setStatus(APP.hasAdminPin() ? "Admin PIN is set on this device." : "Admin PIN is not set yet.", APP.hasAdminPin());
})();