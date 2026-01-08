
import { loadState, createMatch } from "./db.js";
import { byId, el, fmtDateInput } from "./utils.js";

function option(label, value){
  return el("option", {value}, [label]);
}
function teamLabel(t){
  const bits = [t.name];
  if(t.region) bits.push(`(${t.region})`);
  return bits.join(" ");
}
function render(){
  const st = loadState();
  byId("brandTitle").textContent = st.settings.tournamentName || "MPGB Cricket Manager";
  byId("kpiTeams").textContent = st.teams.length;
  byId("kpiMatches").textContent = st.matches.length;
  byId("kpiLive").textContent = st.matches.filter(m=>m.status==="Live").length;

  const selA = byId("mTeamA"), selB = byId("mTeamB");
  selA.innerHTML = ""; selB.innerHTML = "";
  selA.appendChild(option("Select Team A", ""));
  selB.appendChild(option("Select Team B", ""));
  for(const t of st.teams){
    selA.appendChild(option(teamLabel(t), t.id));
    selB.appendChild(option(teamLabel(t), t.id));
  }

  const list = byId("matchList");
  if(st.matches.length===0){
    list.innerHTML = `<div class="muted">No matches yet.</div>`;
    return;
  }
  list.innerHTML = "";
  const sorted = [...st.matches].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  for(const m of sorted){
    const ta = st.teams.find(t=>t.id===m.teamA)?.short || "Team A";
    const tb = st.teams.find(t=>t.id===m.teamB)?.short || "Team B";
    const badge = m.status==="Completed" ? "ok" : (m.status==="Live" ? "warn" : "");
    const b = el("div", {class:"card", style:"padding:12px;margin-bottom:10px"}, [
      el("div", {class:"row", style:"align-items:center;justify-content:space-between"}, [
        el("div", {}, [
          el("div", {style:"font-weight:800"}, [`${ta} vs ${tb}`]),
          el("div", {class:"muted small"}, [`Group ${m.group||"-"} • ${m.date||"—"} • ${m.venue||"—"}`])
        ]),
        el("div", {}, [
          el("span", {class:`badge ${badge}`}, [m.status]),
        ])
      ]),
      el("div", {class:"btnbar"}, [
        el("a", {class:"pill", href:`match.html?matchId=${encodeURIComponent(m.id)}`}, ["Open"]),
      ])
    ]);
    list.appendChild(b);
  }
}

byId("mDate").value = fmtDateInput(new Date());

byId("btnCreateMatch").addEventListener("click", ()=>{
  try{
    const m = createMatch({
      group: byId("mGroup").value,
      date: byId("mDate").value,
      venue: byId("mVenue").value,
      teamA: byId("mTeamA").value,
      teamB: byId("mTeamB").value,
    });
    location.href = `match.html?matchId=${encodeURIComponent(m.id)}`;
  }catch(e){
    alert(e.message || String(e));
  }
});

render();
window.addEventListener("focus", render);
