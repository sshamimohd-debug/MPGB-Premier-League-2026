
import { uid } from "./utils.js";

const KEY = "mpgb_cricket_state_v1";

const defaultState = {
  version: 1,
  settings: {
    tournamentName: "MPGB Premier League 2026",
    adminPinHash: null,     // SHA-256 hex
    oversPerInnings: 20,
    allowDLS: false
  },
  teams: [],    // {id,name,branch,region,short}
  players: [],  // {id,teamId,name,role}
  matches: []   // {id,group,date,venue,teamA,teamB,status,createdAt, updatedAt, toss, innings:[..], result}
};

export function loadState(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return structuredClone(defaultState);
    const st = JSON.parse(raw);
    return { ...structuredClone(defaultState), ...st, settings: { ...defaultState.settings, ...(st.settings||{}) } };
  }catch(e){
    console.warn("State load failed, resetting.", e);
    return structuredClone(defaultState);
  }
}
export function saveState(state){
  state.updatedAt = Date.now();
  localStorage.setItem(KEY, JSON.stringify(state));
}
export function resetState(){
  localStorage.removeItem(KEY);
}
export function exportState(){
  return JSON.stringify(loadState(), null, 2);
}
export function importState(jsonText){
  const st = JSON.parse(jsonText);
  if(!st || typeof st !== "object") throw new Error("Invalid JSON");
  localStorage.setItem(KEY, JSON.stringify(st));
  return loadState();
}

/* Teams */
export function addTeam(partial){
  const st = loadState();
  const t = {
    id: uid("t"),
    name: (partial.name||"").trim(),
    short: (partial.short||"").trim() || (partial.name||"").trim().slice(0,3).toUpperCase(),
    branch: (partial.branch||"").trim(),
    region: (partial.region||"").trim()
  };
  if(!t.name) throw new Error("Team name required");
  st.teams.push(t);
  saveState(st);
  return t;
}
export function addPlayer(partial){
  const st = loadState();
  const p = {
    id: uid("p"),
    teamId: partial.teamId,
    name: (partial.name||"").trim(),
    role: (partial.role||"").trim()
  };
  if(!p.teamId) throw new Error("Select team");
  if(!p.name) throw new Error("Player name required");
  st.players.push(p);
  saveState(st);
  return p;
}

/* Match creation */
export function createMatch(partial){
  const st = loadState();
  const m = {
    id: uid("m"),
    group: (partial.group||"A").trim(),
    date: partial.date || "",
    venue: (partial.venue||"").trim(),
    teamA: partial.teamA,
    teamB: partial.teamB,
    status: "Scheduled", // Scheduled | Live | Completed
    createdAt: Date.now(),
    updatedAt: Date.now(),
    toss: null,  // {wonBy: teamId, decision:"Bat"|"Bowl"}
    innings: [], // filled on start
    result: null // {type:"Win"|"Tie"|"NR", winnerTeamId?, notes?}
  };
  if(!m.teamA || !m.teamB || m.teamA===m.teamB) throw new Error("Select two different teams");
  st.matches.push(m);
  saveState(st);
  return m;
}

export function updateMatch(matchId, updater){
  const st = loadState();
  const idx = st.matches.findIndex(x=>x.id===matchId);
  if(idx<0) throw new Error("Match not found");
  const old = st.matches[idx];
  const nu = updater(structuredClone(old));
  nu.updatedAt = Date.now();
  st.matches[idx] = nu;
  saveState(st);
  return nu;
}

export function getMatch(matchId){
  const st = loadState();
  return st.matches.find(x=>x.id===matchId) || null;
}

export function deleteMatch(matchId){
  const st = loadState();
  st.matches = st.matches.filter(x=>x.id!==matchId);
  saveState(st);
}

export function getTeam(teamId){
  const st = loadState();
  return st.teams.find(t=>t.id===teamId) || null;
}
export function getPlayersByTeam(teamId){
  const st = loadState();
  return st.players.filter(p=>p.teamId===teamId);
}
