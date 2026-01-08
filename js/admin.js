// js/admin.js
import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ---------- AUTH ---------- */
const loginBox = document.getElementById("loginBox");
const adminPanel = document.getElementById("adminPanel");

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Email / Password required");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert("Login failed");
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginBox.classList.add("hidden");
    adminPanel.classList.remove("hidden");
  } else {
    loginBox.classList.remove("hidden");
    adminPanel.classList.add("hidden");
  }
});

/* ---------- SAVE LIVE SCORE ---------- */
document.getElementById("saveBtn").addEventListener("click", async () => {
  const matchId = document.getElementById("matchId").value.trim();

  if (!matchId) {
    alert("Match ID required");
    return;
  }

  const payload = {
    matchId,
    battingTeam: battingTeam.value.trim(),
    runs: Number(runs.value) || 0,
    wickets: Number(wickets.value) || 0,
    overs: overs.value.trim(),
    striker: striker.value.trim(),
    nonStriker: nonStriker.value.trim(),
    bowler: bowler.value.trim(),
    status: "LIVE",
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, "liveMatches", matchId), payload, { merge: true });
    document.getElementById("status").innerText =
      "Live score updated successfully";
  } catch (e) {
    alert("Error saving score");
  }
});

/* ---------- LOGOUT ---------- */
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
  });
}
