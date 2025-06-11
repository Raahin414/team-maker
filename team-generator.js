import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Original score logic
function playerScore(p) {
  const gpm = p.matches > 0 ? p.goals / p.matches : 0;
  return (gpm * 3) + (p.goals * 1.5) + (p.matches * 0.5);
}

// Same team balancing logic as before
function balanceTeams(players) {
  players.sort((a, b) => playerScore(b) - playerScore(a));

  const defenders = players.filter(p => p.position.toLowerCase() === "defender");
  const others = players.filter(p => p.position.toLowerCase() !== "defender");

  const teamA = [], teamB = [];
  let scoreA = 0, scoreB = 0;

  defenders.forEach((player, i) => {
    const score = playerScore(player);
    if (i % 2 === 0) {
      teamA.push(player); scoreA += score;
    } else {
      teamB.push(player); scoreB += score;
    }
  });

  for (const player of others) {
    const score = playerScore(player);
    if (scoreA <= scoreB) {
      teamA.push(player); scoreA += score;
    } else {
      teamB.push(player); scoreB += score;
    }
  }

  return { teamA, teamB };
}

// Show list of all players with checkbox selection
export async function showSelector() {
  const snapshot = await getDocs(collection(db, "players"));
  const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const selector = document.getElementById("playerSelector");
  selector.innerHTML = players.map(p => `
  <label class="player selectable-card" style="cursor: pointer;">
    <input type="checkbox" value="${p.id}" style="display: none;">
    <img src="images/${p.id}.jpg" alt="${p.name}">
    <h3>${p.name}</h3>
    <p>${p.position}</p>
    <p style="font-weight: bold; color: #ccc;">Click to Select</p>
  </label>
`).join('');


  // Store all players for quick access
  window.allPlayers = Object.fromEntries(players.map(p => [p.id, p]));
}

// Generate teams on button click
window.generateFromSelection = function () {
  const checked = Array.from(document.querySelectorAll('#playerSelector input[type="checkbox"]:checked'))
    .map(cb => cb.value);
  const selected = checked.map(id => window.allPlayers[id]);

  const { teamA, teamB } = balanceTeams(selected);
  renderTeam("teamA", teamA);
  renderTeam("teamB", teamB);
};

// Render players in Team A and Team B
function renderTeam(containerId, team) {
  const container = document.getElementById(containerId);
  container.innerHTML = team.map(p => `
    <div class="player">
      <img src="${p.imgUrl || `images/${p.id}.jpg`}" alt="${p.name}">
      <h3>${p.name} – ${p.position}</h3>
      <p>Matches: ${p.matches}, Goals: ${p.goals}</p>
    </div>
  `).join('');
}

showSelector();
