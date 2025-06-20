import { db, storage } from './firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

async function loadPlayers() {
  const snapshot = await getDocs(collection(db, "players"));
  const players = [];
  for (const doc of snapshot.docs) {
    const d = doc.data();
    const imgUrl = `images/${doc.id}.jpg`;
    players.push({ id: doc.id, imgUrl, ...d });
  }
  renderPlayers(players);
  renderTopScorers(players);
}

function renderPlayers(players) {
  const grid = document.getElementById('playerGrid');
  grid.innerHTML = players.map(p => `
    <div class="player">
      <img src="${p.imgUrl}" onerror="this.onerror=null; this.src='images/default.jpg'" alt="${p.name}">
      <h3>${p.name} – ${p.position}</h3>
      <p>Matches: ${p.matches}, Goals: ${p.goals}</p>
    </div>
  `).join('');
}


function renderTopScorers(players) {
  players.sort((a, b) => b.goals - a.goals);
  const top = players.slice(0, 5);
  document.getElementById('scorersList').innerHTML = top.map(p => `
    <div class="player">
      <img src="${p.imgUrl}" onerror="this.onerror=null; this.src='images/default.jpg'">
      <h4>${p.name}</h4>
      <p>Goals: ${p.goals}</p>
    </div>
  `).join('');
}


loadPlayers();
