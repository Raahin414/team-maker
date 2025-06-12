import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Score logic using goals per match and total stats
function playerScore(p) {
  const gpm = p.matches > 0 ? p.goals / p.matches : 0;
  return (gpm * 3) + (p.goals * 1.5) + (p.matches * 0.5);
}

// Balanced team logic with GK always separated
function balanceTeams(players) {
  const keepers = players.filter(p => p.position.toLowerCase() === "goalkeeper");
  const defenders = players.filter(p => p.position.toLowerCase() === "defender");
  const attackers = players.filter(p => p.position.toLowerCase() === "attacker");
  const others = players.filter(p =>
    !["goalkeeper", "defender", "attacker"].includes(p.position.toLowerCase())
  );

  const teamA = [], teamB = [];

  // Force split keepers regardless of score
  keepers.forEach((keeper, i) => {
    if (i % 2 === 0) {
      teamA.push(keeper);
    } else {
      teamB.push(keeper);
    }
  });

  // Smart balance logic for remaining players
  function smartDistribute(group) {
    group.sort((a, b) => playerScore(b) - playerScore(a));
    let scoreA = teamA.reduce((sum, p) => sum + playerScore(p), 0);
    let scoreB = teamB.reduce((sum, p) => sum + playerScore(p), 0);

    group.forEach(player => {
      const score = playerScore(player);
      if (scoreA <= scoreB) {
        teamA.push(player); scoreA += score;
      } else {
        teamB.push(player); scoreB += score;
      }
    });
  }

  // Priority: attackers → defenders → others
  smartDistribute(attackers);
  smartDistribute(defenders);
  smartDistribute(others);

  return { teamA, teamB };
}

// Selector view with card click support and image fallback
export async function showSelector() {
  const snapshot = await getDocs(collection(db, "players"));
  const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const selector = document.getElementById("playerSelector");
  selector.innerHTML = players.map(p => `
    <label class="player selectable-card" style="cursor: pointer;" data-id="${p.id}">
      <input type="checkbox" value="${p.id}" style="display: none;">
      <img src="images/${p.id}.jpg" alt="${p.name}" onerror="this.onerror=null;this.src='images/default.jpg';">
      <h3>${p.name}</h3>
      <p>${p.position}</p>
      <p style="font-weight: bold; color: #ccc;">Click to Select</p>
    </label>
  `).join('');

  // Click to select card
  document.querySelectorAll('.selectable-card').forEach(card => {
    card.addEventListener('click', () => {
      const checkbox = card.querySelector('input[type="checkbox"]');
      checkbox.checked = !checkbox.checked;
      card.classList.toggle('selected', checkbox.checked);
    });
  });

  window.allPlayers = Object.fromEntries(players.map(p => [p.id, p]));
}

// Render each team sorted as: attacker > defender > goalkeeper > others
function renderTeam(containerId, team) {
  const container = document.getElementById(containerId);

  const orderMap = {
    attacker: 1,
    defender: 2,
    goalkeeper: 3
  };

  const sorted = [...team].sort((a, b) => {
    const aPos = orderMap[a.position.toLowerCase()] || 4;
    const bPos = orderMap[b.position.toLowerCase()] || 4;
    return aPos - bPos;
  });

  container.innerHTML = sorted.map(p => `
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

  // Clear old teams
  document.getElementById("teamA").innerHTML = "";
  document.getElementById("teamB").innerHTML = "";

  const { teamA, teamB } = balanceTeams(selected);
  renderTeam("teamA", teamA);
  renderTeam("teamB", teamB);
};

showSelector();
