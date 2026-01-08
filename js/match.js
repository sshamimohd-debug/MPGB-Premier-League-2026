(async function(){
  renderNav("match.html");
  const rules = await APP.loadJSON("data/rules.json");
  const schedule = await APP.loadJSON("data/schedule.json");
  const teamsData = await APP.loadJSON("data/teams.json");
  const state = APP.loadState();

  // init teams
  if(!state.teams || Object.keys(state.teams).length===0){
    for(const [g,info] of Object.entries(teamsData.groups)){
      for(const t of info.teams){
        state.teams[t]={name:t,group:g,venue:info.venue,squad:[],xi:[]};
      }
    }
    APP.saveState(state);
  }

  const params=new URLSearchParams(location.search);
  const fixtureId=params.get("fixture");
  const matchId=params.get("match");

  function save(){ APP.saveState(state); }

  function defaultXI(teamName){
    const t=state.teams[teamName];
    const squad=t?.squad||[];
    const xiIds=(t?.xi||[]).slice();
    let xi=squad.filter(p=>xiIds.includes(p.id));
    if(xi.length<rules.playing_xi.xi_size){
      xi = xi.concat(squad.filter(p=>!xiIds.includes(p.id))).slice(0,rules.playing_xi.xi_size);
    }
    if(xi.length===0){
      xi = Array.from({length:rules.playing_xi.xi_size}).map((_,i)=>({id:`ph_${teamName}_${i+1}`, name:`Player ${i+1}`}));
    }
    return xi.map(p=>({id:p.id,name:p.name}));
  }

  function newInnings(battingTeam,bowlingTeam){
    const xi=defaultXI(battingTeam);
    const bats=xi.map(p=>({id:p.id,name:p.name,r:0,b:0,_4:0,_6:0,out:false,how:"",by:""}));
    return {battingTeam,bowlingTeam,runs:0,wkts:0,balls:0,wides:0,noballs:0,
      striker:0,nonStriker:1,batsmen:bats,bowlers:{},overLog:[],completed:false,currentBowler:""};
  }

  function ensureBowler(inn,name){
    inn.bowlers[name] ||= {name,balls:0,runs:0,wkts:0,wides:0,noballs:0};
    return inn.bowlers[name];
  }

  function applyBall(inn, ev){
    const st=inn.batsmen[inn.striker];
    const bw=ensureBowler(inn, ev.bowler);
    inn.overLog.push(ev);

    if(ev.type==="WD"){
      inn.runs += 1 + (ev.runs||0);
      inn.wides += 1;
      bw.runs += 1 + (ev.runs||0);
      bw.wides += 1;
      if(((ev.runs||0)%2)===1){ [inn.striker,inn.nonStriker]=[inn.nonStriker,inn.striker]; }
      return;
    }
    if(ev.type==="NB"){
      inn.runs += 1 + (ev.runs||0);
      inn.noballs += 1;
      bw.runs += 1 + (ev.runs||0);
      bw.noballs += 1;
      const batRuns = ev.batRuns ?? (ev.runs||0);
      st.r += batRuns;
      if(batRuns===4) st._4 += 1;
      if(batRuns===6) st._6 += 1;
      if((batRuns%2)===1){ [inn.striker,inn.nonStriker]=[inn.nonStriker,inn.striker]; }
      return;
    }

    // legal ball
    inn.balls += 1;
    st.b += 1;
    bw.balls += 1;

    if(ev.type==="WKT"){
      if(/lbw/i.test(ev.how||"")) throw new Error("LBW is not applicable.");
      inn.wkts += 1;
      bw.wkts += 1;
      bw.runs += (ev.runs||0);
      const batRuns = ev.batRuns ?? (ev.runs||0);
      inn.runs += (ev.runs||0);
      st.r += batRuns;
      if(batRuns===4) st._4 += 1;
      if(batRuns===6) st._6 += 1;
      st.out = true; st.how = ev.how||"Out"; st.by = ev.by||ev.bowler||"";
      // next batsman
      for(let i=0;i<inn.batsmen.length;i++){
        if(!inn.batsmen[i].out && i!==inn.striker && i!==inn.nonStriker && inn.batsmen[i].b===0 && inn.batsmen[i].r===0){
          inn.striker = i; break;
        }
      }
      if(((ev.runs||0)%2)===1){ [inn.striker,inn.nonStriker]=[inn.nonStriker,inn.striker]; }
    }else{
      const r=ev.runs||0;
      inn.runs += r;
      st.r += r;
      bw.runs += r;
      if(r===4) st._4 += 1;
      if(r===6) st._6 += 1;
      if((r%2)===1){ [inn.striker,inn.nonStriker]=[inn.nonStriker,inn.striker]; }
    }

    if(inn.balls % 6 === 0){
      [inn.striker,inn.nonStriker]=[inn.nonStriker,inn.striker];
    }
  }

  function rebuildInnings(inn, log){
    const fresh = newInnings(inn.battingTeam, inn.bowlingTeam);
    // preserve batsman order/names
    fresh.batsmen = inn.batsmen.map(b=>({id:b.id,name:b.name,r:0,b:0,_4:0,_6:0,out:false,how:"",by:""}));
    for(const ev of log){
      applyBall(fresh, ev);
    }
    Object.assign(inn, fresh);
  }

  function undoBall(inn){
    if(!inn.overLog.length) return;
    const log = inn.overLog.slice(0,-1);
    rebuildInnings(inn, log);
  }

  function inningsOver(inn){
    const maxBalls = rules.format.overs_per_innings*6;
    return inn.completed || inn.balls>=maxBalls || inn.wkts>=10;
  }

  function computeResult(m){
    if(!m.innings1 || !m.innings2) return null;
    if(!inningsOver(m.innings1) || !inningsOver(m.innings2)) return null;
    const a=m.teamA,b=m.teamB;
    const scoreA = (m.innings1.battingTeam===a ? m.innings1 : m.innings2).runs;
    const scoreB = (m.innings1.battingTeam===b ? m.innings1 : m.innings2).runs;
    if(scoreA>scoreB) return {status:"Completed", winner:a, margin:`${scoreA-scoreB} runs`};
    if(scoreB>scoreA) return {status:"Completed", winner:b, margin:`${scoreB-scoreA} runs`};
    return {status:"Tied", winner:null, margin:"Tie"};
  }

  async function requireAdmin(){
    const pin=prompt("Enter Admin PIN:");
    if(pin===null) return false;
    const ok=await APP.verifyAdminPin(pin);
    if(!ok) alert("Invalid PIN");
    return ok;
  }

  function makeMatchFromFixture(fx){
    const id = fx ? fx.id : APP.uid("M");
    const teamA = fx ? fx.teams[0] : Object.keys(state.teams)[0];
    const teamB = fx ? fx.teams[1] : Object.keys(state.teams)[1];
    const group = fx ? fx.group : "A";
    const venue = fx ? fx.venue : "";
    const time = fx ? fx.time : "";
    return {id, fixtureId: fx?fx.id:null, stage:"League", group, venue, time,
      teamA, teamB, createdAt:new Date().toISOString(),
      toss:{done:false,winner:"",decision:""}, innings1:null, innings2:null, status:"Not Started"};
  }

  function renderSelector(){
    const existing = Object.values(state.matches||{});
    document.getElementById("selectWrap").innerHTML = `
      <div class="card">
        <h3>Start / Open Match</h3>
        <div class="grid cols2">
          <div>
            <label>Official Fixture</label>
            <select id="fixtureSel">
              <option value="">Select fixture...</option>
              ${schedule.matches.map(f=>`<option value="${f.id}">${f.id} • Group ${f.group} • ${f.time} • ${f.teams[0]} vs ${f.teams[1]} (${f.venue})</option>`).join("")}
            </select>
            <div class="row" style="margin-top:10px">
              <button class="btn primary" id="openFixture">Open Fixture</button>
            </div>
          </div>
          <div>
            <label>Existing Matches (this device)</label>
            <div style="max-height:260px; overflow:auto; border:1px solid var(--border); border-radius:12px; padding:10px">
              ${existing.length ? existing.map(m=>`
                <div class="row" style="justify-content:space-between; margin-bottom:8px">
                  <div>
                    <div><b class="mono">${m.id}</b> <span class="pill">Group ${m.group}</span></div>
                    <div class="small">${m.teamA} vs ${m.teamB} • ${m.status}</div>
                  </div>
                  <a class="btn" href="match.html?match=${encodeURIComponent(m.id)}">Open</a>
                </div>`).join("") : `<div class="small">No saved matches yet.</div>`}
            </div>
          </div>
        </div>
        <hr class="sep"/>
        <button class="btn" id="custom">Create Custom Match</button>
      </div>
    `;
    document.getElementById("openFixture").onclick = ()=>{
      const id=document.getElementById("fixtureSel").value;
      if(!id){alert("Select a fixture.");return;}
      const fx=schedule.matches.find(x=>x.id===id);
      const existingMatch = Object.values(state.matches||{}).find(m=>m.fixtureId===id);
      const m = existingMatch || makeMatchFromFixture(fx);
      state.matches[m.id]=m; save();
      location.href=`match.html?match=${encodeURIComponent(m.id)}`;
    };
    document.getElementById("custom").onclick=()=>{
      const m=makeMatchFromFixture(null);
      state.matches[m.id]=m; save();
      location.href=`match.html?match=${encodeURIComponent(m.id)}`;
    };
  }

  function renderLive(id){
    const m=state.matches?.[id];
    if(!m){document.getElementById("liveWrap").innerHTML="";return;}

    const teams=Object.keys(state.teams);
    const res=computeResult(m);
    const i1=m.innings1,i2=m.innings2;

    const scoreLine = (inn)=> inn ? `${inn.runs}/${inn.wkts} (${APP.fmtOverBalls(inn.balls)} ov)` : "-";

    document.getElementById("liveWrap").innerHTML = `
      <div class="grid cols2">
        <div class="card">
          <div class="row" style="justify-content:space-between">
            <div>
              <div class="small">Match ID</div>
              <div class="mono" style="font-size:18px; font-weight:900">${m.id}</div>
              <div class="small">Group ${m.group} • ${m.venue||"-"} • ${m.time||"-"}</div>
            </div>
            <div class="pill ${(res?.status==='Completed')?'ok':(res?.status==='Tied'?'warn':'')}">${res?res.status:m.status}</div>
          </div>

          <hr class="sep"/>

          <div class="grid cols2">
            <div><label>Team A</label><select id="teamA">${teams.map(t=>`<option ${t===m.teamA?'selected':''}>${t}</option>`).join("")}</select></div>
            <div><label>Team B</label><select id="teamB">${teams.map(t=>`<option ${t===m.teamB?'selected':''}>${t}</option>`).join("")}</select></div>
          </div>
          <div class="row" style="margin-top:10px">
            <button class="btn" id="saveTeams">Save Teams</button>
            <button class="btn danger" id="deleteMatch">Delete Match (Admin)</button>
          </div>

          <hr class="sep"/>

          <h3>Toss</h3>
          <div class="grid cols2">
            <div>
              <label>Toss Winner</label>
              <select id="tossWinner">
                <option value="">Select...</option>
                <option value="${m.teamA}" ${m.toss.winner===m.teamA?'selected':''}>${m.teamA}</option>
                <option value="${m.teamB}" ${m.toss.winner===m.teamB?'selected':''}>${m.teamB}</option>
              </select>
            </div>
            <div>
              <label>Decision</label>
              <select id="tossDecision">
                <option value="">Select...</option>
                <option ${m.toss.decision==="Bat"?'selected':''}>Bat</option>
                <option ${m.toss.decision==="Bowl"?'selected':''}>Bowl</option>
              </select>
            </div>
          </div>
          <div class="row" style="margin-top:10px">
            <button class="btn primary" id="lockToss">${m.toss.done?"Update Toss":"Lock Toss (Admin)"}</button>
          </div>

          <hr class="sep"/>

          <h3>Scores</h3>
          <div class="kv">
            <div class="k">Innings 1</div><div class="mono">${i1?`${i1.battingTeam} ${scoreLine(i1)}`:"-"}</div>
            <div class="k">Innings 2</div><div class="mono">${i2?`${i2.battingTeam} ${scoreLine(i2)}`:"-"}</div>
            <div class="k">Result</div><div>${res?(res.status==="Completed"?`${res.winner} won by ${res.margin}`:"Tied"):"-"}</div>
          </div>

          <hr class="sep"/>

          <div class="row">
            <a class="btn ok" href="scorecard.html?match=${encodeURIComponent(m.id)}" target="_blank">Scorecard (Print/PDF)</a>
            <a class="btn" href="points.html">Points Table</a>
          </div>
        </div>

        <div class="card" id="scoringPane">
          <h3>Live Scoring</h3>
          <div class="small">10 overs • Powerplay: first 3 overs • Bowler max 2 overs • No LBW</div>
          <hr class="sep"/>
          <div id="scoreInner"></div>
        </div>
      </div>
    `;

    document.getElementById("saveTeams").onclick=()=>{
      m.teamA=document.getElementById("teamA").value;
      m.teamB=document.getElementById("teamB").value;
      if(m.teamA===m.teamB){alert("Teams must be different");return;}
      save(); renderLive(id);
    };

    document.getElementById("deleteMatch").onclick=async ()=>{
      const ok=await requireAdmin(); if(!ok) return;
      if(!confirm("Delete match from this device?")) return;
      delete state.matches[m.id]; save(); location.href="match.html";
    };

    document.getElementById("lockToss").onclick=async ()=>{
      const ok=await requireAdmin(); if(!ok) return;
      const tw=document.getElementById("tossWinner").value;
      const td=document.getElementById("tossDecision").value;
      if(!tw||!td){alert("Select toss winner and decision");return;}
      m.toss={done:true,winner:tw,decision:td};
      if(!m.innings1){
        const batFirst = (td==="Bat") ? tw : (tw===m.teamA?m.teamB:m.teamA);
        const bowlFirst = (batFirst===m.teamA?m.teamB:m.teamA);
        m.innings1=newInnings(batFirst,bowlFirst);
        m.innings2=newInnings(bowlFirst,batFirst);
        m.status="In Progress";
      }
      save(); renderLive(id);
    };

    const inner=document.getElementById("scoreInner");
    if(!m.innings1){ inner.innerHTML=`<div class="small">Lock Toss to start innings.</div>`; return; }

    const active = !inningsOver(m.innings1) ? m.innings1 : (!inningsOver(m.innings2) ? m.innings2 : null);
    if(!active){
      const r=computeResult(m);
      if(r && r.status==="Tied"){
        inner.innerHTML=`<div class="pill warn">Match Tied</div><div class="small" style="margin-top:10px">As per IOM, Super Over should be played to decide the winner.</div>`;
      }else{
        inner.innerHTML=`<div class="pill ok">Scoring Completed</div>`;
      }
      return;
    }

    const striker=active.batsmen[active.striker], non=active.batsmen[active.nonStriker];
    inner.innerHTML = `
      <div class="row" style="justify-content:space-between">
        <div><b>${active.battingTeam}</b> batting</div>
        <div class="pill">${active.bowlingTeam} bowling</div>
      </div>
      <div class="small">Score: <span class="mono">${active.runs}/${active.wkts} (${APP.fmtOverBalls(active.balls)} ov)</span></div>

      <hr class="sep"/>

      <div class="grid cols2">
        <div class="card" style="padding:12px"><div class="small">Striker</div><div style="font-weight:900">${striker.name}</div><div class="small mono">${striker.r} (${striker.b})</div></div>
        <div class="card" style="padding:12px"><div class="small">Non-striker</div><div style="font-weight:900">${non.name}</div><div class="small mono">${non.r} (${non.b})</div></div>
      </div>

      <hr class="sep"/>

      <div class="grid cols2">
        <div>
          <label>Bowler (required)</label>
          <input class="input" id="bowler" placeholder="Bowler name" value="${active.currentBowler||""}"/>
          <div class="small">Max 2 overs per bowler (enforced).</div>
        </div>
        <div>
          <label>Actions</label>
          <div class="row">
            <button class="btn" id="swap">Swap Strike (Admin)</button>
            <button class="btn" id="undo">Undo (Admin)</button>
          </div>
        </div>
      </div>

      <hr class="sep"/>

      <div class="row">
        ${[0,1,2,3,4,6].map(r=>`<button class="btn primary" data-run="${r}">${r}</button>`).join("")}
        <button class="btn" id="wd">Wide</button>
        <button class="btn" id="nb">No-ball</button>
        <button class="btn danger" id="wkt">Wicket</button>
      </div>

      <div class="row" style="margin-top:10px">
        <button class="btn ok" id="endInnings">End Innings (Admin)</button>
      </div>

      <hr class="sep"/>

      <div class="small">Last 6 balls:</div>
      <div class="row" style="margin-top:8px">
        ${active.overLog.slice(-6).map(ev=>`<span class="pill mono">${ev.label}</span>`).join("") || `<span class="small">No balls yet.</span>`}
      </div>
    `;

    function bowlerCanBowl(name){
      if(!name) return false;
      const b=active.bowlers[name];
      const max=rules.format.max_overs_per_bowler*6;
      return !b || b.balls < max;
    }

    async function addEvent(ev){
      const ok=await requireAdmin(); if(!ok) return;
      const bowler=document.getElementById("bowler").value.trim();
      if(!bowler){alert("Enter bowler name");return;}
      if(!bowlerCanBowl(bowler)){alert("Bowler reached max overs.");return;}
      ev.bowler=bowler; active.currentBowler=bowler;
      try{ applyBall(active, ev); }catch(e){ alert(e.message); return; }
      if(inningsOver(active)) active.completed=true;
      save(); renderLive(id);
    }

    inner.querySelectorAll("[data-run]").forEach(btn=>{
      btn.addEventListener("click", ()=>addEvent({type:"RUN",runs:parseInt(btn.getAttribute("data-run"),10),label:btn.getAttribute("data-run")}));
    });

    document.getElementById("wd").onclick=async ()=>{
      const ok=await requireAdmin(); if(!ok) return;
      const extra=prompt("Wide + additional runs (0-6):","0"); if(extra===null) return;
      const r=APP.clamp(parseInt(extra,10)||0,0,6);
      const bowler=document.getElementById("bowler").value.trim();
      if(!bowler){alert("Enter bowler name");return;}
      if(!bowlerCanBowl(bowler)){alert("Bowler reached max overs.");return;}
      addEvent({type:"WD",runs:r,label:`Wd+${r}`});
    };

    document.getElementById("nb").onclick=async ()=>{
      const ok=await requireAdmin(); if(!ok) return;
      const bat=prompt("No-ball: bat runs (0-6):","0"); if(bat===null) return;
      const r=APP.clamp(parseInt(bat,10)||0,0,6);
      addEvent({type:"NB",runs:r,batRuns:r,label:`Nb+${r}`});
    };

    document.getElementById("wkt").onclick=async ()=>{
      const ok=await requireAdmin(); if(!ok) return;
      const how=prompt("Wicket type (LBW not allowed):","Bowled"); if(how===null) return;
      if(/lbw/i.test(how)){alert("LBW not allowed.");return;}
      addEvent({type:"WKT",runs:0,how, label:"W"});
    };

    document.getElementById("swap").onclick=async ()=>{
      const ok=await requireAdmin(); if(!ok) return;
      [active.striker,active.nonStriker]=[active.nonStriker,active.striker];
      save(); renderLive(id);
    };

    document.getElementById("undo").onclick=async ()=>{
      const ok=await requireAdmin(); if(!ok) return;
      undoBall(active);
      save(); renderLive(id);
    };

    document.getElementById("endInnings").onclick=async ()=>{
      const ok=await requireAdmin(); if(!ok) return;
      if(!confirm("End this innings?")) return;
      active.completed=true;
      save(); renderLive(id);
    };
  }

  renderSelector();

  if(fixtureId && !matchId){
    const fx=schedule.matches.find(x=>x.id===fixtureId);
    const existing = Object.values(state.matches||{}).find(m=>m.fixtureId===fixtureId);
    const m = existing || makeMatchFromFixture(fx);
    state.matches[m.id]=m; save();
    location.href = `match.html?match=${encodeURIComponent(m.id)}`;
    return;
  }

  if(matchId){
    renderLive(matchId);
  }
})();