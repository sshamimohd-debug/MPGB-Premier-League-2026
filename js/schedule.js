(async function(){
  renderNav("schedule.html");
  const schedule = await APP.loadJSON("data/schedule.json");
  const teams = await APP.loadJSON("data/teams.json");

  document.getElementById("note").textContent = schedule.note;

  const venueSet = new Set(schedule.matches.map(m=>m.venue));
  const venues = ["All Venues", ...Array.from(venueSet)];

  document.getElementById("filters").innerHTML = `
    <div class="card">
      <div class="grid cols3">
        <div>
          <label>Venue</label>
          <select id="venueSel">
            ${venues.map(v=>`<option value="${v}">${v}</option>`).join("")}
          </select>
        </div>
        <div>
          <label>Group</label>
          <select id="groupSel">
            <option value="ALL">All Groups</option>
            ${Object.keys(teams.groups).map(g=>`<option value="${g}">Group ${g}</option>`).join("")}
          </select>
        </div>
        <div>
          <label>League Match Dates</label>
          <div class="pill mono">${schedule.league_match_dates[0]} • ${schedule.league_match_dates[1]}</div>
          <div class="small">Official league-match dates (revised).</div>
        </div>
      </div>
    </div>
  `;

  function renderTable(){
    const venue = document.getElementById("venueSel").value;
    const group = document.getElementById("groupSel").value;

    let ms = schedule.matches.slice();
    if(venue !== "All Venues") ms = ms.filter(m=>m.venue===venue);
    if(group !== "ALL") ms = ms.filter(m=>m.group===group);

    ms.sort((a,b)=> a.group.localeCompare(b.group) || a.time.localeCompare(b.time));

    document.getElementById("tableWrap").innerHTML = `
      <div class="card">
        <h3>League Match Schedule</h3>
        <div class="small">Time slots as per official schedule. Use Live Match page to start scoring for any fixture.</div>
        <hr class="sep"/>
        <table class="table">
          <thead>
            <tr>
              <th>ID</th><th>Group</th><th>Venue</th><th>Time</th><th>Team A</th><th>Team B</th><th></th>
            </tr>
          </thead>
          <tbody>
            ${ms.map(m=>`
              <tr>
                <td class="mono">${m.id}</td>
                <td>Group ${m.group}</td>
                <td>${m.venue}</td>
                <td class="mono">${m.time}</td>
                <td>${m.teams[0]}</td>
                <td>${m.teams[1]}</td>
                <td><a class="btn" href="match.html?fixture=${encodeURIComponent(m.id)}">Open</a></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  document.getElementById("venueSel").addEventListener("change", renderTable);
  document.getElementById("groupSel").addEventListener("change", renderTable);
  renderTable();
})();