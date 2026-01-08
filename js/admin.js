import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const loginBox = document.getElementById("loginBox");
const adminPanel = document.getElementById("adminPanel");

document.getElementById("loginBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginBox.classList.add("hidden");
    adminPanel.classList.remove("hidden");
  } catch {
    alert("Login failed");
  }
};

document.getElementById("saveBtn").onclick = async () => {
  const matchId = document.getElementById("matchId").value;

  const data = {
    battingTeam: battingTeam.value,
    runs: Number(runs.value),
    wickets: Number(wickets.value),
    overs: overs.value,
    striker: striker.value,
    nonStriker: nonStriker.value,
    bowler: bowler.value,
    status: "LIVE",
    updatedAt: Date.now()
  };

  await setDoc(doc(db, "liveMatches", matchId), data);
  document.getElementById("status").innerText = "Live score updated";
};
