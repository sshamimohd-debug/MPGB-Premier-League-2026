(async function(){
  renderNav("points.html");
  const schedule = await APP.loadJSON("data/schedule.json");
  const teamsData = await APP.loadJSON("data/teams.json");
  const rules = await APP.loadJSON("data/rules.json");
  const state = APP.loadState();

  function initTable(){
    const t={};
    for(const [g,info] of Object.entries(teamsData.groups)){
      t[g]=info.teams.map(team=>({team,group:g,p:0,w:0,l:0,pts:0,forR:0,forB:0,agR:0,agB:0}));
    }
    return t;
  }
  const table=initTable();
  const idx={};
  for(const [g,rows] of Object.entries(table)){
    idx[g]={};
    for(const r of rows) idx[g][r.team]=r;
  }
  const maxBalls=rules.format.overs_per_innings*6;

  function done(inn){ return inn && (inn.completed || inn.balls>=maxBalls || inn.wkts>=10); }

  function nrr(r){
    const forOv = r.forB ? (r.forR/(r.forB/6)) : 0;
    const agOv = r.agB ? (r.agR/(r.agB/6)) : 0;
    const v = forOv - agOv;
    return isFinite(v)?v:0;
  }

  function addForAgainst(row, forS, agS){
    row.forR += forS.runs; row.forB += forS.balls;
    row.agR += agS.runs; row.agB += agS.balls;
  }

  for(const m of Object.values(state.matches||{})){
    if(m.stage!=="League") continue;
    if(!m.innings1 || !m.innings2) continue;
    if(!done(m.innings1) || !done(m.innings2)) continue;
    const g=m.group;
    const a=idx[g]?.[m.teamA], b=idx[g]?.[m.teamB];
    if(!a || !b) continue;

    a.p += 1; b.p += 1;

    const i1=m.innings1, i2=m.innings2;
    const scoreA = (i1.battingTeam===m.teamA? i1 : i2);
    const scoreB = (i1.battingTeam===m.teamB? i1 : i2);

    addForAgainst(a, scoreA, scoreB);
    addForAgainst(b, scoreB, scoreA);

    if(scoreA.runs > scoreB.runs){
      a.w += 1; a.pts += 2;
      b.l += 1;
    }else if(scoreB.runs > scoreA.runs){
      b.w += 1; b.pts += 2;
      a.l += 1;
    }else{
      // Ideally resolved by Super Over as per IOM; fallback as tie.
      a.pts += 1; b.pts += 1;
    }
  }

  function groupStatus(rows){
    const s=rows.slice().sort((x,y)=> y.pts-x.pts || nrr(y)-nrr(x));
    if(s.length<2) return {winner:s[0]?.team||null, note:""};
    if(s[0].pts===s[1].pts){
      return {winner:null, note:"Top two teams are level on points. As per IOM, an additional match is required to decide qualification."};
    }
    return {winner:s[0].team, note:""};
  }

  const wrap=document.getElementById("wrap");
  wrap.innerHTML = `
    <div class="card">
      <h3>League Points</h3>
      <div class="small">Win: 2 points. Qualification: Only Group Winner. If top two teams are level on points, an additional match is required (IOM).</div>
    </div>
    <div style="height:12px"></div>
    ${Object.entries(table).map(([g,rows])=>{
      const s=rows.slice().sort((x,y)=> y.pts-x.pts || nrr(y)-nrr(x));
      const st=groupStatus(rows);
      return `
        <div class="card" style="margin-bottom:12px">
          <div class="row" style="justify-content:space-between">
            <div><b>Group ${g}</b> <span class="pill">${teamsData.groups[g].venue}</span></div>
            <div class="pill ${st.winner?'ok':'warn'}">${st.winner?`Qualified: ${st.winner}`:"Qualifier Pending"}</div>
          </div>
          ${st.note?`<div class="small" style="margin-top:8px">${st.note}</div>`:""}
          <hr class="sep"/>
          <div style="overflow:auto">
            <table class="table">
              <thead><tr><th>Team</th><th>P</th><th>W</th><th>L</th><th>Pts</th><th>NRR (approx.)</th></tr></thead>
              <tbody>
                ${s.map(r=>`
                  <tr>
                    <td>${r.team}</td>
                    <td class="mono">${r.p}</td>
                    <td class="mono">${r.w}</td>
                    <td class="mono">${r.l}</td>
                    <td class="mono">${r.pts}</td>
                    <td class="mono">${nrr(r).toFixed(3)}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }).join("")}
  `;
})();