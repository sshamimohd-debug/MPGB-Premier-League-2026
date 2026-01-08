
import { loadState, addTeam, addPlayer } from "./db.js";
import { byId, el } from "./utils.js";

function option(label, value){ return el("option",{value},[label]); }

function render(){
  const st = loadState();
  byId("brandTitle").textContent = (st.settings.tournamentName || "MPGB Cricket Manager") + " • Teams";
  const pTeam = byId("pTeam");
  pTeam.innerHTML = "";
  pTeam.appendChild(option("Select team", ""));
  for(const t of st.teams){
    pTeam.appendChild(option(`${t.name}${t.region?` (${t.region})`:""}`, t.id));
  }

  const list = byId("teamList");
  if(st.teams.length===0){
    list.innerHTML = `<div class="muted">No teams added yet.</div>`;
    return;
  }
  list.innerHTML = "";
  for(const t of st.teams){
    const players = st.players.filter(p=>p.teamId===t.id);
    const card = el("div", {class:"card", style:"padding:12px;margin-bottom:10px"}, [
      el("div", {style:"display:flex;justify-content:space-between;gap:10px;align-items:flex-start"}, [
        el("div", {}, [
          el("div", {style:"font-weight:900;font-size:14px"}, [`${t.name} `, el("span",{class:"badge"},[t.short||"—"])]),
          el("div", {class:"muted small"}, [`${t.branch||"—"} • ${t.region||"—"}`]),
        ]),
        el("div", {class:"badge"}, [`Players: ${players.length}`])
      ]),
      el("div", {class:"hr", style:"margin:10px 0"}),
      el("div", {class:"small"}, [
        players.length ? "" : el("span",{class:"muted"},["No players yet."])
      ]),
      ...(players.length ? [el("table",{class:"table", style:"margin-top:10px"},[
        el("thead",{},[el("tr",{},[
          el("th",{},["Name"]), el("th",{},["Role"])
        ])]),
        el("tbody",{}, players.map(p=>el("tr",{},[
          el("td",{},[p.name]),
          el("td",{class:"muted"},[p.role||"—"])
        ])))
      ])] : [])
    ]);
    list.appendChild(card);
  }
}

byId("btnAddTeam").addEventListener("click", ()=>{
  try{
    addTeam({
      name: byId("tName").value,
      short: byId("tShort").value,
      branch: byId("tBranch").value,
      region: byId("tRegion").value
    });
    byId("tName").value=""; byId("tShort").value=""; byId("tBranch").value=""; byId("tRegion").value="";
    render();
  }catch(e){ alert(e.message||String(e)); }
});

byId("btnAddPlayer").addEventListener("click", ()=>{
  try{
    addPlayer({
      teamId: byId("pTeam").value,
      name: byId("pName").value,
      role: byId("pRole").value
    });
    byId("pName").value=""; byId("pRole").value="";
    render();
  }catch(e){ alert(e.message||String(e)); }
});

render();
window.addEventListener("focus", render);
