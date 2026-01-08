
import { loadState, getMatch, updateMatch, getTeam, getPlayersByTeam, addPlayer } from "./db.js";
import { el, q, byId, ballsToOvers, sha256Hex, uid, clamp } from "./utils.js";
import { newInnings, applyBall, inningsComplete } from "./scoring.js";

const params = new URLSearchParams(location.search);
const matchId = params.get("matchId");
if(!matchId){
  alert("matchId missing"); location.href="index.html";
}

const SESSION_KEY = `mpgb_admin_unlocked_${matchId}`;

function isUnlocked(){
  return sessionStorage.getItem(SESSION_KEY)==="1";
}
function lock(){
  sessionStorage.removeItem(SESSION_KEY);
  render();
}
async function unlock(){
  const st = loadState();
  const hash = st.settings.adminPinHash;
  if(!hash){
    if(confirm("No PIN set. Unlock admin without PIN? (You can set PIN in Admin page)")){
      sessionStorage.setItem(SESSION_KEY,"1");
      render();
    }
    return;
  }
  const pin = prompt("Enter Admin PIN (4-10 digits):");
  if(pin==null) return;
  const h = await sha256Hex(pin.trim());
  if(h===hash){
    sessionStorage.setItem(SESSION_KEY,"1");
    render();
  }else{
    alert("Wrong PIN.");
  }
}
function assertAdmin(){
  if(!isUnlocked()) throw new Error("Admin locked. Click Unlock Admin.");
}

function teamName(tid){
  const t = getTeam(tid);
  return t?.name || tid || "—";
}
function teamShort(tid){
  const st = loadState();
  const t = st.teams.find(x=>x.id===tid);
  return t?.short || t?.name || tid || "—";
}

function startMatchWithToss({wonBy, decision}){
  assertAdmin();
  const st = loadState();
  const oversLimit = st.settings.oversPerInnings || 20;
  updateMatch(matchId, (m)=>{
    m.toss = {wonBy, decision};
    const other = (m.teamA===wonBy) ? m.teamB : m.teamA;
    const firstBat = (decision==="Bat") ? wonBy : other;
    const firstBowl = (firstBat===m.teamA) ? m.teamB : m.teamA;
    m.innings = [
      newInnings({battingTeam:firstBat, bowlingTeam:firstBowl, oversLimit}),
    ];
    m.status = "Live";
    m.result = null;
    return m;
  });
}

function ensureSecondInnings(){
  const st = loadState();
  const oversLimit = st.settings.oversPerInnings || 20;
  updateMatch(matchId, (m)=>{
    if(m.innings.length>=2) return m;
    const inn1 = m.innings[0];
    const secondBat = inn1.bowlingTeam;
    const secondBowl = inn1.battingTeam;
    m.innings.push(newInnings({battingTeam: secondBat, bowlingTeam: secondBowl, oversLimit}));
    return m;
  });
}

function recomputeInnings(inn){
  // Rebuild from balls array for accurate undo
  const rebuilt = newInnings({battingTeam: inn.battingTeam, bowlingTeam: inn.bowlingTeam, oversLimit: inn.oversLimit});
  // Keep last selected players if possible
  rebuilt.strike = structuredClone(inn.strike || rebuilt.strike);
  for(const b of (inn.balls||[])){
    // applyBall will push ball; we want to keep same meta, so reapply on copies without timestamp fields
    const copy = structuredClone(b);
    // remove derived fields
    delete copy.totalRuns; delete copy.isLegal; delete copy.timestamp;
    applyBall(rebuilt, copy);
  }
  return rebuilt;
}

function currentInningsIndex(m){
  if(!m.innings || m.innings.length===0) return 0;
  if(m.innings.length===1) return 0;
  // if first complete and second not complete -> 1
  const c0 = inningsComplete(m.innings[0]);
  const c1 = inningsComplete(m.innings[1]);
  if(c0 && !c1) return 1;
  if(!c0) return 0;
  return 1;
}

function overBallLabel(inn){
  const balls = inn.score.balls;
  const o = Math.floor(balls/6);
  const b = balls%6;
  return `${o}.${b}`;
}

function renderToss(m){
  const wrap = byId("tossWrap");
  wrap.innerHTML = "";
  if(m.status!=="Scheduled" && m.toss){
    const t = m.toss;
    wrap.appendChild(el("div",{class:"badge ok"},[
      `Toss: ${teamShort(t.wonBy)} won • opted to ${t.decision}`
    ]));
    return;
  }
  if(m.status!=="Scheduled") return;

  const st = loadState();
  const selWon = el("select",{id:"tWon"},[
    el("option",{value:""},["Toss won by…"]),
    el("option",{value:m.teamA},[teamName(m.teamA)]),
    el("option",{value:m.teamB},[teamName(m.teamB)]),
  ]);
  const selDec = el("select",{id:"tDec"},[
    el("option",{value:""},["Decision…"]),
    el("option",{value:"Bat"},["Bat first"]),
    el("option",{value:"Bowl"},["Bowl first"]),
  ]);

  const card = el("div",{class:"card", style:"padding:12px"},[
    el("h3",{},["Toss & Start Match"]),
    el("div",{class:"row"},[
      el("div",{},[el("label",{},["Toss won by"]), selWon]),
      el("div",{},[el("label",{},["Decision"]), selDec]),
    ]),
    el("div",{class:"btnbar"},[
      el("button",{class:"primary", onclick:()=>{
        try{
          const wonBy = selWon.value;
          const decision = selDec.value;
          if(!wonBy || !decision) return alert("Select toss winner + decision.");
          startMatchWithToss({wonBy, decision});
          render();
        }catch(e){ alert(e.message||String(e)); }
      }},["Start Match"]),
    ]),
  ]);
  wrap.appendChild(card);
}

function renderLive(m){
  const wrap = byId("liveWrap");
  wrap.innerHTML = "";
  if(m.status!=="Live") return;
  if(!m.innings || m.innings.length===0) return;

  const idx = currentInningsIndex(m);
  const inn = m.innings[idx];

  const st = loadState();
  const canEdit = isUnlocked();
  const title = `${idx===0 ? "1st" : "2nd"} Innings • ${teamShort(inn.battingTeam)} batting`;
  const target = (idx===1) ? (m.innings[0].score.runs + 1) : null;

  const playersBat = getPlayersByTeam(inn.battingTeam);
  const playersBowl = getPlayersByTeam(inn.bowlingTeam);

  function playerSelect(id, list, value){
    const sel = el("select",{id},[
      el("option",{value:""},["Select…"]),
      ...list.map(p=>el("option",{value:p.id},[p.name])),
      el("option",{value:"__new"},["+ Add new…"])
    ]);
    sel.value = value || "";
    sel.addEventListener("change", ()=>{
      if(sel.value==="__new"){
        const name = prompt("Enter player name:");
        if(!name){ sel.value=""; return; }
        const p = addPlayer({teamId: list===playersBat ? inn.battingTeam : inn.bowlingTeam, name, role:""});
        // re-render for updated dropdowns
        render();
        // set value after render (best effort)
        setTimeout(()=>{
          const s2 = byId(id);
          if(s2) s2.value = p.id;
        }, 50);
      }else{
        updateMatch(matchId, (mm)=>{
          mm.innings[idx].strike[id==="selStriker"?"striker": id==="selNonStriker"?"nonStriker":"bowler"] = sel.value || null;
          return mm;
        });
      }
    });
    return sel;
  }

  const selStr = playerSelect("selStriker", playersBat, inn.strike.striker);
  const selNon = playerSelect("selNonStriker", playersBat, inn.strike.nonStriker);
  const selBow = playerSelect("selBowler", playersBowl, inn.strike.bowler);

  const exWd = el("input",{type:"number", min:"0", max:"10", value:"0", id:"exWd"});
  const exNb = el("input",{type:"number", min:"0", max:"10", value:"0", id:"exNb"});
  const exB = el("input",{type:"number", min:"0", max:"10", value:"0", id:"exB"});
  const exLb = el("input",{type:"number", min:"0", max:"10", value:"0", id:"exLb"});

  function resetExtras(){
    exWd.value="0"; exNb.value="0"; exB.value="0"; exLb.value="0";
  }

  function addDelivery({runsOffBat=0, wicket=null}){
    try{
      assertAdmin();
      const striker = byId("selStriker").value;
      const nonStriker = byId("selNonStriker").value;
      const bowler = byId("selBowler").value;
      if(!striker || !nonStriker || !bowler) return alert("Select Striker, Non-striker & Bowler.");
      if(striker===nonStriker) return alert("Striker and Non-striker cannot be same.");
      const extras = {
        wd: clamp(parseInt(exWd.value||"0",10),0,10),
        nb: clamp(parseInt(exNb.value||"0",10),0,10),
        b: clamp(parseInt(exB.value||"0",10),0,10),
        lb: clamp(parseInt(exLb.value||"0",10),0,10),
      };
      const ball = { runsOffBat, extras, wicket, striker, nonStriker, bowler };
      updateMatch(matchId, (mm)=>{
        const innNow = mm.innings[idx];
        applyBall(innNow, ball);
        // keep strike selections updated
        return mm;
      });
      resetExtras();
      render();
    }catch(e){ alert(e.message||String(e)); }
  }

  function doWicket(){
    try{
      assertAdmin();
      const kind = prompt("Wicket type (e.g., Bowled / Caught / LBW / Run Out / Stumped / Hit Wicket):","Bowled");
      if(!kind) return;
      const outDefault = byId("selStriker").value || "";
      const outId = prompt("Player out: paste Player ID? (Leave blank to use current striker)", "");
      // We will use striker unless user explicitly chooses from dropdown via prompt list next
      let playerOut = outDefault;
      // better: choose from list prompt by name
      const names = getPlayersByTeam(inn.battingTeam).map(p=>`${p.name}::${p.id}`).join("\n");
      const pick = prompt("Choose player out (copy one line):\n"+names, "");
      if(pick){
        const parts = pick.split("::");
        if(parts[1]) playerOut = parts[1].trim();
      }
      if(!playerOut) return alert("Player out not selected.");
      const fielders = getPlayersByTeam(inn.bowlingTeam).map(p=>`${p.name}::${p.id}`).join("\n");
      const fPick = prompt("Fielder (optional). Copy one line or leave blank:\n"+fielders, "");
      let fielder = null;
      if(fPick){
        const parts = fPick.split("::");
        if(parts[1]) fielder = parts[1].trim();
      }
      addDelivery({runsOffBat:0, wicket:{kind, playerOut, fielder}});
    }catch(e){ alert(e.message||String(e)); }
  }

  function undo(){
    try{
      assertAdmin();
      updateMatch(matchId, (mm)=>{
        const innNow = mm.innings[idx];
        if(!innNow.balls.length) return mm;
        innNow.balls.pop();
        mm.innings[idx] = recomputeInnings(innNow);
        return mm;
      });
      render();
    }catch(e){ alert(e.message||String(e)); }
  }

  function endInnings(){
    try{
      assertAdmin();
      if(!confirm("End innings now?")) return;
      // just mark complete by setting balls to limit if needed; we will set a flag by pushing a note
      updateMatch(matchId, (mm)=>{
        mm.innings[idx].manualEnded = true;
        return mm;
      });
      // if first innings ended, create second
      if(idx===0) ensureSecondInnings();
      render();
    }catch(e){ alert(e.message||String(e)); }
  }

  function finishMatch(){
    try{
      assertAdmin();
      const mm = getMatch(matchId);
      if(!mm || mm.innings.length<2) return alert("Second innings not available yet.");
      const i1 = mm.innings[0], i2 = mm.innings[1];
      const r1 = i1.score.runs, r2 = i2.score.runs;
      const typeAuto = (r2>r1) ? "Win" : (r2===r1 ? "Tie" : "Win");
      let winnerAuto = null;
      if(typeAuto==="Win"){
        winnerAuto = (r2>r1) ? i2.battingTeam : i1.battingTeam;
      }
      const type = prompt("Result type: Win / Tie / NR", typeAuto);
      if(!type) return;
      let winnerTeamId = null;
      if(type.toLowerCase()==="win"){
        const w = prompt(`Winner team short (enter 1 for ${teamShort(mm.teamA)} or 2 for ${teamShort(mm.teamB)}):`, winnerAuto===mm.teamA?"1": winnerAuto===mm.teamB?"2":"1");
        if(w==="1") winnerTeamId = mm.teamA;
        else if(w==="2") winnerTeamId = mm.teamB;
        else return alert("Invalid winner selection.");
      }
      const notes = prompt("Notes (optional):","") || "";
      updateMatch(matchId, (m2)=>{
        m2.status = "Completed";
        m2.result = { type: (type[0].toUpperCase()+type.slice(1).toLowerCase()), winnerTeamId, notes };
        return m2;
      });
      render();
    }catch(e){ alert(e.message||String(e)); }
  }

  const box = el("div",{class:"card", style:"padding:12px;margin-top:14px"},[
    el("div",{style:"display:flex;justify-content:space-between;align-items:center;gap:10px"},[
      el("div",{},[
        el("div",{style:"font-weight:900"},[title]),
        target ? el("div",{class:"muted small"},[`Target: ${target}`]) : el("div",{class:"muted small"},[`Overs limit: ${inn.oversLimit}`])
      ]),
      el("span",{class:`badge ${canEdit?"ok":"warn"}`},[canEdit?"Admin unlocked":"Locked"])
    ]),
    el("div",{class:"hr", style:"margin:10px 0"}),
    el("div",{class:"row"},[
      el("div",{},[el("label",{},["Striker"]), selStr]),
      el("div",{},[el("label",{},["Non-striker"]), selNon]),
      el("div",{},[el("label",{},["Bowler"]), selBow]),
    ]),
    el("div",{class:"row"},[
      el("div",{},[el("label",{},["Wide (wd)"]), exWd]),
      el("div",{},[el("label",{},["No ball (nb)"]), exNb]),
      el("div",{},[el("label",{},["Byes (b)"]), exB]),
      el("div",{},[el("label",{},["Leg byes (lb)"]), exLb]),
    ]),
    el("div",{class:"btnbar"},[
      ...[0,1,2,3,4,5,6].map(r=>el("button",{onclick:()=>addDelivery({runsOffBat:r})},[String(r)])),
      el("button",{class:"danger", onclick:doWicket},["Wicket"]),
      el("button",{onclick:undo},["Undo"]),
      el("button",{class:"blue", onclick:endInnings},["End Innings"]),
      el("button",{class:"primary", onclick:finishMatch},["Finish Match"]),
    ])
  ]);

  wrap.appendChild(box);
}

function renderSummary(m){
  const elSum = byId("liveSummary");
  const bbb = byId("bbb");
  elSum.innerHTML = "";
  bbb.innerHTML = "";

  if(!m.innings || m.innings.length===0){
    elSum.innerHTML = `<div class="muted">Match not started.</div>`;
    return;
  }

  const blocks = [];
  for(let i=0;i<m.innings.length;i++){
    const inn = m.innings[i];
    const title = `${i===0?"1st":"2nd"} Innings: ${teamShort(inn.battingTeam)}`;
    const runs = inn.score.runs, wkts = inn.score.wkts, balls = inn.score.balls;
    blocks.push(el("div",{class:"box"},[
      el("div",{class:"val"},[`${runs}/${wkts}`]),
      el("div",{class:"lbl mono"},[`${title} • ${ballsToOvers(balls)} ov`]),
    ]));
  }
  elSum.appendChild(el("div",{class:"kpi"}, blocks));

  // bbb: latest 24 balls across current innings
  const idx = currentInningsIndex(m);
  const inn = m.innings[idx];
  const last = [...(inn.balls||[])].slice(-24).reverse();
  if(last.length===0){
    bbb.innerHTML = `<div class="muted">No balls yet.</div>`;
    return;
  }
  const st = loadState();
  const nameById = (pid)=> st.players.find(p=>p.id===pid)?.name || "—";
  for(const b of last){
    const ex = b.extras||{};
    const extrasText = Object.entries(ex).filter(([k,v])=>+v>0).map(([k,v])=>`${k}:${v}`).join(" ");
    const w = b.wicket?.kind ? ` • W: ${b.wicket.kind} (${nameById(b.wicket.playerOut)})` : "";
    const line = `${nameById(b.bowler)} to ${nameById(b.striker)} • ${b.totalRuns} run(s)${extrasText?` • ${extrasText}`:""}${w}`;
    bbb.appendChild(el("div",{class:"badge", style:"margin-bottom:8px"},[
      el("span",{class:"mono"},[b.isLegal ? "●" : "○"]),
      line
    ]));
  }
}

function renderScorecard(m){
  const sc = byId("scorecard");
  sc.innerHTML = "";
  const st = loadState();
  const nameById = (pid)=> st.players.find(p=>p.id===pid)?.name || pid || "—";

  if(!m.innings || m.innings.length===0){
    sc.innerHTML = `<div class="muted">Scorecard will appear after match starts.</div>`;
    return;
  }

  function battingTable(inn){
    const rows = Object.entries(inn.bat||{}).map(([pid,s])=>{
      const sr = s.balls>0 ? (s.runs*100/s.balls) : 0;
      return {pid, ...s, sr};
    });
    // order: those who batted appear; keep as is
    const body = rows.map(r=>el("tr",{},[
      el("td",{},[nameById(r.pid)]),
      el("td",{class:"muted"},[r.out ? r.howOut : "not out"]),
      el("td",{class:"mono"},[String(r.runs)]),
      el("td",{class:"mono"},[String(r.balls)]),
      el("td",{class:"mono"},[String(r.fours)]),
      el("td",{class:"mono"},[String(r.sixes)]),
      el("td",{class:"mono"},[r.sr.toFixed(1)]),
    ]));
    const t = el("table",{class:"table"},[
      el("thead",{},[el("tr",{},[
        el("th",{},["Batter"]),
        el("th",{},["How out"]),
        el("th",{},["R"]),
        el("th",{},["B"]),
        el("th",{},["4s"]),
        el("th",{},["6s"]),
        el("th",{},["SR"]),
      ])]),
      el("tbody",{}, body.length?body:[el("tr",{},[el("td",{colspan:"7", class:"muted"},["No batting data yet."])])])
    ]);
    return t;
  }

  function bowlingTable(inn){
    const rows = Object.entries(inn.bowl||{}).map(([pid,s])=>{
      const ov = ballsToOvers(s.balls);
      const eco = s.balls>0 ? (s.runs / (s.balls/6)) : 0;
      return {pid, ...s, ov, eco};
    });
    const body = rows.map(r=>el("tr",{},[
      el("td",{},[nameById(r.pid)]),
      el("td",{class:"mono"},[r.ov]),
      el("td",{class:"mono"},[String(r.runs)]),
      el("td",{class:"mono"},[String(r.wkts)]),
      el("td",{class:"mono"},[String(r.wides||0)]),
      el("td",{class:"mono"},[String(r.noballs||0)]),
      el("td",{class:"mono"},[r.eco.toFixed(2)]),
    ]));
    const t = el("table",{class:"table"},[
      el("thead",{},[el("tr",{},[
        el("th",{},["Bowler"]),
        el("th",{},["O"]),
        el("th",{},["R"]),
        el("th",{},["W"]),
        el("th",{},["Wd"]),
        el("th",{},["Nb"]),
        el("th",{},["Eco"]),
      ])]),
      el("tbody",{}, body.length?body:[el("tr",{},[el("td",{colspan:"7", class:"muted"},["No bowling data yet."])])])
    ]);
    return t;
  }

  for(let i=0;i<m.innings.length;i++){
    const inn = m.innings[i];
    const head = el("div",{class:"card", style:"padding:12px;margin-bottom:14px"},[
      el("div",{style:"display:flex;justify-content:space-between;align-items:center;gap:10px"},[
        el("div",{style:"font-weight:900"},[
          `${i===0?"1st":"2nd"} Innings • ${teamName(inn.battingTeam)}`
        ]),
        el("div",{class:"badge"},[
          `${inn.score.runs}/${inn.score.wkts} (${ballsToOvers(inn.score.balls)} ov)`
        ])
      ]),
      el("div",{class:"muted small"},[
        `Extras: wd ${inn.score.extras.wd}, nb ${inn.score.extras.nb}, b ${inn.score.extras.b}, lb ${inn.score.extras.lb}`
      ]),
      el("div",{class:"hr", style:"margin:10px 0"}),
      el("h3",{},["Batting"]),
      battingTable(inn),
      el("div",{class:"hr", style:"margin:10px 0"}),
      el("h3",{},["Bowling"]),
      bowlingTable(inn),
    ]);
    sc.appendChild(head);
  }

  if(m.status==="Completed" && m.result){
    const r = m.result;
    const line = r.type==="Win" ? `Result: ${teamName(r.winnerTeamId)} won` : `Result: ${r.type}`;
    sc.appendChild(el("div",{class:"card", style:"padding:12px"},[
      el("div",{style:"font-weight:900"},[line]),
      r.notes ? el("div",{class:"muted small"},[r.notes]) : el("div",{class:"muted small"},["—"])
    ]));
  }
}

function renderHeader(m){
  const st = loadState();
  const tA = teamShort(m.teamA), tB = teamShort(m.teamB);
  byId("matchTitle").textContent = st.settings.tournamentName || "MPGB Cricket Manager";
  byId("matchSub").textContent = `${tA} vs ${tB}`;
  byId("hTeams").textContent = `${teamName(m.teamA)} vs ${teamName(m.teamB)}`;
  byId("hMeta").textContent = `Group ${m.group||"-"} • ${m.date||"—"} • ${m.venue||"—"}`;
  byId("hStatus").textContent = m.status;

  const badge = byId("adminBadge");
  badge.textContent = isUnlocked() ? "Admin unlocked" : "View only";
  badge.className = `badge ${isUnlocked()?"ok":"warn"}`;

  byId("btnUnlock").disabled = isUnlocked();
  byId("btnLock").disabled = !isUnlocked();
}

function render(){
  const m = getMatch(matchId);
  if(!m){ alert("Match not found."); location.href="index.html"; return; }

  renderHeader(m);
  renderToss(m);
  renderLive(m);
  renderSummary(m);
  renderScorecard(m);
}

byId("btnUnlock").addEventListener("click", unlock);
byId("btnLock").addEventListener("click", lock);
byId("btnPrint").addEventListener("click", ()=>window.print());

render();
window.addEventListener("focus", render);
