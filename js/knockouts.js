(async function(){
  renderNav("knockouts.html");
  const teamsData = await APP.loadJSON("data/teams.json");
  const rules = await APP.loadJSON("data/rules.json");
  const state = APP.loadState();
  const maxBalls = rules.format.overs_per_innings*6;

  function done(inn){ return inn && (inn.completed || inn.balls>=maxBalls || inn.wkts>=10); }

  function groupWinner(group){
    const rows = teamsData.groups[group].teams.map(t=>({team:t, pts:0}));
    const idx=new Map(rows.map(r=>[r.team,r]));
    for(const m of Object.values(state.matches||{})){
      if(m.stage!=="League" || m.group!==group) continue;
      if(!m.innings1 || !m.innings2) continue;
      if(!done(m.innings1) || !done(m.innings2)) continue;
      const i1=m.innings1, i2=m.innings2;
      const sA=(i1.battingTeam===m.teamA?i1:i2).runs;
      const sB=(i1.battingTeam===m.teamB?i1:i2).runs;
      if(sA>sB) idx.get(m.teamA).pts += 2;
      else if(sB>sA) idx.get(m.teamB).pts += 2;
      else { idx.get(m.teamA).pts += 1; idx.get(m.teamB).pts += 1; }
    }
    rows.sort((a,b)=>b.pts-a.pts);
    if(rows.length>1 && rows[0].pts===rows[1].pts) return null;
    return rows[0]?.team||null;
  }

  const wA=groupWinner("A"), wB=groupWinner("B"), wC=groupWinner("C"), wD=groupWinner("D");

  document.getElementById("wrap").innerHTML = `
    <div class="grid cols2">
      <div class="card">
        <h3>Semi Final 1</h3>
        <div class="kv">
          <div class="k">Team 1</div><div>${wA||"TBD (Group A Winner)"}</div>
          <div class="k">Team 2</div><div>${wC||"TBD (Group C Winner)"}</div>
        </div>
        <hr class="sep"/>
        <a class="btn ${wA&&wC?'primary':''}" href="match.html">Open Match Module</a>
      </div>
      <div class="card">
        <h3>Semi Final 2</h3>
        <div class="kv">
          <div class="k">Team 1</div><div>${wB||"TBD (Group B Winner)"}</div>
          <div class="k">Team 2</div><div>${wD||"TBD (Group D Winner)"}</div>
        </div>
        <hr class="sep"/>
        <a class="btn ${wB&&wD?'primary':''}" href="match.html">Open Match Module</a>
      </div>
      <div class="card" style="grid-column:1 / -1">
        <h3>Final</h3>
        <div class="small">Final teams will appear after semi-finals are completed.</div>
      </div>
    </div>
  `;
})();