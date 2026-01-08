
import { loadState } from "./db.js";
import { el, ballsToOvers } from "./utils.js";

function calcFromMatch(m){
  // Return per team contribution: {teamId: {forRuns, forBalls, agRuns, agBalls, win/loss/tie/nr}}
  if(m.status!=="Completed" || !m.innings || m.innings.length<2) return {};
  const inn1 = m.innings[0], inn2 = m.innings[1];
  const aBatTeam = inn1.battingTeam;
  const bBatTeam = inn2.battingTeam;
  const res = {};
  function add(teamId, forRuns, forBalls, agRuns, agBalls){
    if(!res[teamId]) res[teamId] = {forRuns:0, forBalls:0, agRuns:0, agBalls:0, w:0,l:0,t:0,nr:0, pts:0, played:0};
    res[teamId].forRuns += forRuns; res[teamId].forBalls += forBalls;
    res[teamId].agRuns += agRuns; res[teamId].agBalls += agBalls;
  }
  add(inn1.battingTeam, inn1.score.runs, inn1.score.balls, inn2.score.runs, inn2.score.balls);
  add(inn2.battingTeam, inn2.score.runs, inn2.score.balls, inn1.score.runs, inn1.score.balls);

  // result points
  const type = m.result?.type || "NR";
  const winner = m.result?.winnerTeamId || null;
  const teams = [m.teamA, m.teamB];
  for(const t of teams){
    if(!res[t]) res[t] = {forRuns:0, forBalls:0, agRuns:0, agBalls:0, w:0,l:0,t:0,nr:0, pts:0, played:0};
    res[t].played += 1;
  }
  if(type==="Win" && winner){
    const loser = teams.find(x=>x!==winner);
    res[winner].w += 1; res[winner].pts += 2;
    if(loser){ res[loser].l += 1; }
  }else if(type==="Tie"){
    for(const t of teams){ res[t].t += 1; res[t].pts += 1; }
  }else{
    for(const t of teams){ res[t].nr += 1; res[t].pts += 1; }
  }

  return res;
}

function nrr(row){
  const rf = row.forBalls>0 ? (row.forRuns / (row.forBalls/6)) : 0;
  const ra = row.agBalls>0 ? (row.agRuns / (row.agBalls/6)) : 0;
  return rf - ra;
}

function render(){
  const st = loadState();
  const wrap = document.getElementById("pointsWrap");
  wrap.innerHTML = "";

  const groups = {};
  for(const m of st.matches){
    const g = (m.group||"A").toString().trim().toUpperCase();
    groups[g] ||= [];
    groups[g].push(m);
  }
  const groupKeys = Object.keys(groups).sort();

  if(groupKeys.length===0){
    wrap.innerHTML = `<div class="muted">No matches yet.</div>`;
    return;
  }

  for(const g of groupKeys){
    // init table rows for teams in group
    const rows = {};
    const matches = groups[g];
    // collect teams appearing in group
    const teamIds = new Set();
    matches.forEach(m=>{ if(m.teamA) teamIds.add(m.teamA); if(m.teamB) teamIds.add(m.teamB); });
    for(const tid of teamIds){
      rows[tid] = {teamId:tid, played:0,w:0,l:0,t:0,nr:0,pts:0,forRuns:0,forBalls:0,agRuns:0,agBalls:0};
    }

    for(const m of matches){
      const contrib = calcFromMatch(m);
      for(const [tid,val] of Object.entries(contrib)){
        if(!rows[tid]) rows[tid] = {teamId:tid, played:0,w:0,l:0,t:0,nr:0,pts:0,forRuns:0,forBalls:0,agRuns:0,agBalls:0};
        const r = rows[tid];
        for(const k of Object.keys(val)) r[k] += val[k];
      }
    }

    const arr = Object.values(rows).map(r=>({ ...r, nrr: nrr(r) }));
    arr.sort((a,b)=> (b.pts-a.pts) || (b.nrr-a.nrr) || (b.w-a.w));

    const table = el("table",{class:"table"},[
      el("thead",{},[el("tr",{},[
        el("th",{},["#"]),
        el("th",{},["Team"]),
        el("th",{},["P"]),
        el("th",{},["W"]),
        el("th",{},["L"]),
        el("th",{},["T"]),
        el("th",{},["NR"]),
        el("th",{},["Pts"]),
        el("th",{},["NRR"]),
        el("th",{},["For"]),
        el("th",{},["Against"]),
      ])]),
      el("tbody",{}, arr.map((r,idx)=>{
        const t = st.teams.find(x=>x.id===r.teamId);
        const name = t?.short || t?.name || r.teamId;
        return el("tr",{},[
          el("td",{class:"muted"},[String(idx+1)]),
          el("td",{},[name]),
          el("td",{},[String(r.played)]),
          el("td",{},[String(r.w)]),
          el("td",{},[String(r.l)]),
          el("td",{},[String(r.t)]),
          el("td",{},[String(r.nr)]),
          el("td",{},[String(r.pts)]),
          el("td",{class:"mono"},[r.nrr.toFixed(3)]),
          el("td",{class:"mono"},[`${r.forRuns}/${ballsToOvers(r.forBalls)}`]),
          el("td",{class:"mono"},[`${r.agRuns}/${ballsToOvers(r.agBalls)}`]),
        ]);
      }))
    ]);

    wrap.appendChild(el("div",{class:"card", style:"padding:12px;margin-bottom:14px"},[
      el("div",{style:"display:flex;justify-content:space-between;align-items:center;gap:10px"},[
        el("div",{style:"font-weight:900"},[`Group ${g}`]),
        el("span",{class:"badge"},[`${matches.length} match(es)`])
      ]),
      el("div",{class:"hr", style:"margin:10px 0"}),
      table
    ]));
  }
}

render();
window.addEventListener("focus", render);
