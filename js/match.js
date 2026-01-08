// js/match.js
import { db } from "./firebase.js";
import {
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ---------- READ MATCH ID ---------- */
const params = new URLSearchParams(window.location.search);
const matchId = params.get("id");

const scoreEl = document.getElementById("score");
const detailsEl = document.getElementById("details");

if (!matchId) {
  scoreEl.innerText = "Invalid match";
  throw new Error("Match ID missing");
}

/* ---------- ATTACH LIVE LISTENER ---------- */
const ref = doc(db, "liveMatches", matchId);

onSnapshot(ref, (snap) => {
  if (!snap.exists()) {
    scoreEl.innerText = "Score not started yet";
    detailsEl.innerHTML = "";
    return;
  }

  const d = snap.data();

  // MAIN SCORE
  scoreEl.innerText =
    `${d.battingTeam} ${d.runs}/${d.wickets} (${d.overs})`;

  // DETAILS
  detailsEl.innerHTML = `
    <p><b>Striker:</b> ${d.striker}</p>
    <p><b>Non-Striker:</b> ${d.nonStriker}</p>
    <p><b>Bowler:</b> ${d.bowler}</p>
    <p><b>Status:</b> ${d.status}</p>
  `;
});
