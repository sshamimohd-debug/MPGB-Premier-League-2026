(async function(){
  renderNav("teams.html");
  const teamsData = await APP.loadJSON("data/teams.json");
  const rules = await APP.loadJSON("data/rules.json");
  const state = APP.loadState();

  if(!state.teams || Object.keys(state.teams).length===0){
    for(const [g,info] of Object.entries(teamsData.groups)){
      for(const t of info.teams){
        state.teams[t] = { name:t, group:g, venue:info.venue, squad:[], xi:[] };
      }
    }
    APP.saveState(state);
  }

  const wrap = document.getElementById("wrap");
  wrap.innerHTML = `
    <div class="grid cols2">
      <div class="card">
        <h3>Official Teams (Group-wise)</h3>
        <div class="small">Click a team to manage players.</div>
        <hr class="sep"/>
        ${Object.entries(teamsData.groups).map(([g,info])=>`
          <div class="card" style="padding:12px; margin-bottom:12px">
            <div class="row" style="justify-content:space-between">
              <div><b>Group ${g}</b> <span class="pill">${info.venue}</span></div>
              <div class="small mono">${info.teams.length} teams</div>
            </div>
            <div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:8px">
              ${info.teams.map(t=>`<a class="pill" href="#team=${encodeURIComponent(t)}">${t}</a>`).join("")}
            </div>
          </div>
        `).join("")}
      </div>

      <div class="card">
        <h3>Player Registration</h3>
        <div class="small">Squad size: ${rules.playing_xi.squad_size}. Playing XI: ${rules.playing_xi.xi_size}.</div>
        <hr class="sep"/>
        <div id="teamPane" class="small">Select a team.</div>
      </div>
    </div>
  `;

  function teamFromHash(){
    const m = location.hash.match(/team=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function renderTeamPane(teamName){
    const pane = document.getElementById("teamPane");
    if(!teamName || !state.teams[teamName]){ pane.textContent="Select a team."; return; }
    const team = state.teams[teamName];
    const squad = team.squad || [];
    const xiSet = new Set(team.xi || []);

    pane.innerHTML = `
      <div class="row" style="justify-content:space-between; align-items:flex-start">
        <div>
          <div style="font-size:16px; font-weight:900">${teamName}</div>
          <div class="small">Group ${team.group} • Venue: ${team.venue}</div>
        </div>
        <div class="pill">Squad: ${squad.length}/${rules.playing_xi.squad_size}</div>
      </div>

      <hr class="sep"/>

      <div class="grid cols2">
        <div><label>Player Name</label><input class="input" id="pName" placeholder="e.g., Rahul Sharma"/></div>
        <div><label>Mobile Number</label><input class="input" id="pMobile" placeholder="10-digit"/></div>
        <div><label>Employee ID</label><input class="input" id="pEmp" placeholder="Employee ID"/></div>
        <div><label>Designation</label><input class="input" id="pDesig" placeholder="Designation"/></div>
        <div><label>Branch / Office</label><input class="input" id="pBranch" placeholder="Branch/Office"/></div>
        <div>
          <label>Playing Role</label>
          <select id="pRole"><option>Batsman</option><option>Bowler</option><option>All-Rounder</option><option>Wicket Keeper</option></select>
        </div>
        <div>
          <label>Bowling Arm</label>
          <select id="pArm"><option>Right</option><option>Left</option><option>NA</option></select>
        </div>
        <div>
          <label>Cricket Frequency</label>
          <select id="pFreq"><option>Regular</option><option>Weekly</option><option>Occasionally</option></select>
        </div>
        <div style="grid-column:1 / -1"><label>Previous Tournament Experience (optional)</label><input class="input" id="pExp"/></div>
        <div style="grid-column:1 / -1"><label>Serious Disease / Allergy (optional)</label><input class="input" id="pMedical"/></div>
      </div>

      <div class="row" style="margin-top:12px">
        <button class="btn primary" id="addPlayer">Add Player</button>
        <button class="btn" id="exportTeam">Export Team JSON</button>
      </div>

      <hr class="sep"/>

      <div class="row" style="justify-content:space-between">
        <div><b>Squad List</b></div>
        <div class="small">Toggle XI (max 11).</div>
      </div>

      <div style="margin-top:10px; overflow:auto">
        <table class="table">
          <thead><tr><th>#</th><th>Name</th><th>Role</th><th>Arm</th><th>Mobile</th><th>XI</th><th></th></tr></thead>
          <tbody>
            ${squad.map((p,i)=>`
              <tr>
                <td>${i+1}</td>
                <td>${p.name}</td>
                <td>${p.role}</td>
                <td>${p.arm}</td>
                <td class="mono">${p.mobile||""}</td>
                <td><button class="btn ${xiSet.has(p.id)?"ok":""}" data-xi="${p.id}">${xiSet.has(p.id)?"In XI":"XI"}</button></td>
                <td><button class="btn danger" data-del="${p.id}">Delete</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById("addPlayer").onclick = () => {
      const name = document.getElementById("pName").value.trim();
      if(!name){ alert("Enter player name"); return; }
      if((team.squad||[]).length >= rules.playing_xi.squad_size){ alert("Squad is full (15)."); return; }
      const p = { id: APP.uid("p"), name,
        mobile:document.getElementById("pMobile").value.trim(),
        empId:document.getElementById("pEmp").value.trim(),
        designation:document.getElementById("pDesig").value.trim(),
        branch:document.getElementById("pBranch").value.trim(),
        role:document.getElementById("pRole").value,
        arm:document.getElementById("pArm").value,
        frequency:document.getElementById("pFreq").value,
        experience:document.getElementById("pExp").value.trim(),
        medical:document.getElementById("pMedical").value.trim()
      };
      team.squad ||= []; team.squad.push(p);
      state.teams[teamName]=team; APP.saveState(state); renderTeamPane(teamName);
    };

    document.getElementById("exportTeam").onclick = () => {
      const blob = new Blob([JSON.stringify(team,null,2)], {type:"application/json"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${teamName.replace(/\\s+/g,"_")}_team.json`;
      a.click();
    };

    pane.querySelectorAll("[data-xi]").forEach(btn=>{
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-xi");
        team.xi ||= [];
        const s = new Set(team.xi);
        if(s.has(id)) s.delete(id); else s.add(id);
        if(s.size > rules.playing_xi.xi_size){ alert("Playing XI cannot exceed 11."); return; }
        team.xi = Array.from(s);
        state.teams[teamName]=team; APP.saveState(state); renderTeamPane(teamName);
      });
    });

    pane.querySelectorAll("[data-del]").forEach(btn=>{
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-del");
        if(!confirm("Delete this player?")) return;
        team.squad = (team.squad||[]).filter(p=>p.id!==id);
        team.xi = (team.xi||[]).filter(x=>x!==id);
        state.teams[teamName]=team; APP.saveState(state); renderTeamPane(teamName);
      });
    });
  }

  window.addEventListener("hashchange", ()=>renderTeamPane(teamFromHash()));
  renderTeamPane(teamFromHash());
})();