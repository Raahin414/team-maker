import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Weighted score function
function playerScore(p) {
  const gpm = p.matches > 0 ? p.goals / p.matches : 0;
  return (gpm * 3) + (p.goals * 1.5) + (p.matches * 0.5);
}

// Fair team balancing based on score + position
function balanceTeams(players) {
  const defenders = players.filter(p => p.position.toLowerCase() === "defender");
  const keepers = players.filter(p => p.position.toLowerCase() === "goalkeeper");
  const others = players.filter(p => !["defender", "goalkeeper"].includes(p.position.toLowerCase()));

  defenders.sort((a, b) => playerScore(b) - playerScore(a));
  keepers.sort((a, b) => playerScore(b) - playerScore(a));
  others.sort((a, b) => playerScore(b) - playerScore(a));

  const teamA = [], teamB = [];
  let scoreA = 0, scoreB = 0;

  // Distribute keepers first (if present)
  keepers.forEach((p, i) => {
    const score = playerScore(p);
    if (i % 2 === 0) {
      teamA.push(p); scoreA += score;
    } else {
      teamB.push(p); scoreB += score;
    }
  });

  // Distribute defenders next
  defenders.forEach((p, i) => {
    const score = playerScore(p);
    if (i % 2 === 0) {
      teamA.push(p); scoreA += score;
    } else {
      teamB.push(p); scoreB += score;
    }
  });

  // Distribute remaining players by team score
  for (const p of others) {
    const score = playerScore(p);
    if (scoreA <= scoreB) {
      teamA.push(p); scoreA += score;
    } else {
      teamB.push(p); scoreB += score;
    }
  }

  return { teamA, teamB };
}

// Renders player selection checkboxes
export async function showSelector() {
  const snapshot = await getDocs(collection(db, "players"));
  const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const selector = document.getElementById("playerSelector");
  selector.innerHTML = players.map(p => `
    <div class="player">
      <img src="${p.imgUrl || 'images/default.jpg'}" alt="${p.name}">
      <h3>${p.name}</h3>
      <p>${p.position}</p>
      <label>
        <input type="checkbox" value="${p.id}"> Available Today
      </label>
    </div>
  `).join('');

  window.allPlayers = Object.fromEntries(players.map(p => [p.id, p]));
}

// On generate button click
window.generateFromSelection = function () {
  const checked = Array.from(document.querySelectorAll('#playerSelector input[type="checkbox"]:checked'))
    .map(cb => cb.value);
  const selected = checked.map(id => window.allPlayers[id]);

  const { teamA, teamB } = balanceTeams(selected);
  renderTeam("teamA", teamA);
  renderTeam("teamB", teamB);
};

// Render players in given container
function renderTeam(containerId, team) {
  const container = document.getElementById(containerId);
  container.innerHTML = team.map(p => `
    <div class="player">
      <img src="${p.imgUrl || 'images/default.jpg'}" alt="${p.name}">
      <h3>${p.name} – ${p.position}</h3>
      <p>Matches: ${p.matches}, Goals: ${p.goals}</p>
    </div>
  `).join('');
}

showSelector();
