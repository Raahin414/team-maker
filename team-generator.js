import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Score logic using goals per match and total stats
function playerScore(p) {
  const gpm = p.matches > 0 ? p.goals / p.matches : 0;
  return (gpm * 3) + (p.goals * 1.5) + (p.matches * 0.5);
}

// Balanced team logic using defenders and scores
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

// Selector view with card click support and image fallback
export async function showSelector() {
  const snapshot = await getDocs(collection(db, "players"));
  const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const selector = document.getElementById("playerSelector");
  selector.innerHTML = players.map(p => `
    <label class="player selectable-card" style="cursor: pointer;">
      <input type="checkbox" value="${p.id}" style="display: none;">
      <img src="images/${p.id}.jpg" alt="${p.name}" onerror="this.onerror=null;this.src='images/default.jpg';">
      <h3 style="color: #eee;">${p.name}</h3>
      <p style="color: #aaa;">${p.position}</p>
      <p style="font-weight: bold; color: #888;">Click to Select</p>
    </label>
  `).join('');

  // Add click-to-toggle functionality
  selector.querySelectorAll('.selectable-card').forEach(card => {
    card.addEventListener('click', () => {
      const checkbox = card.querySelector('input[type="checkbox"]');
      checkbox.checked = !checkbox.checked;
      card.classList.toggle('selected', checkbox.checked);
    });
  });

  window.allPlayers = Object.fromEntries(players.map(p => [p.id, p]));
}

// Render each team as card list
function renderTeam(containerId, team) {
  const container = document.getElementById(containerId);
  container.innerHTML = team.map(p => `
    <div class="player">
      <img src="images/${p.id}.jpg" alt="${p.name}" onerror="this.onerror=null;this.src='images/default.jpg';">
      <h3>${p.name} – ${p.position}</h3>
      <p>Matches: ${p.matches}, Goals: ${p.goals}</p>
    </div>
  `).join('');
}

// Team generation on button click
window.generateFromSelection = function () {
  const checked = Array.from(document.querySelectorAll('#playerSelector input[type="checkbox"]:checked'))
    .map(cb => cb.value);
  const selected = checked.map(id => window.allPlayers[id]);

  const { teamA, teamB } = balanceTeams(selected);
  renderTeam("teamA", teamA);
  renderTeam("teamB", teamB);
};

showSelector();

