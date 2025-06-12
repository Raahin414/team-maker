import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Score logic using goals per match and total stats
function playerScore(p) {
  const gpm = p.matches > 0 ? p.goals / p.matches : 0;
  return (gpm * 3) + (p.goals * 1.5) + (p.matches * 0.5);
}

// Advanced team balancing logic with constraints
function balanceTeams(players) {
  const keepers = players.filter(p => p.position.toLowerCase() === "goalkeeper");
  const defenders = players.filter(p => p.position.toLowerCase() === "defender");
  const attackers = players.filter(p => p.position.toLowerCase() === "attacker");
  const others = players.filter(p => !["goalkeeper", "defender", "attacker"].includes(p.position.toLowerCase()));

  const teamA = [], teamB = [];
  let starA = 0, starB = 0;

  // Constraint: Player with ID "1" and "5" must not be in same team
  const player1 = players.find(p => p.id === "1");
  const player5 = players.find(p => p.id === "5");
  const separateConstraint = player1 && player5;

  // 1. Force split keepers
  keepers.forEach((keeper, i) => {
    if (i % 2 === 0) teamA.push(keeper);
    else teamB.push(keeper);
  });

  // 2. Sort attackers by tier first, then stars
  attackers.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return b.stars - a.stars;
  });

  // 3. Distribute attackers by tier groups
  const tierGroups = {};
  for (let atk of attackers) {
    const t = atk.tier;
    if (!tierGroups[t]) tierGroups[t] = [];
    tierGroups[t].push(atk);
  }

  Object.keys(tierGroups).sort((a, b) => a - b).forEach(tier => {
    const group = tierGroups[tier];
    group.sort((a, b) => b.stars - a.stars);
    group.forEach(atk => {
      const stars = atk.stars || 0;

      const assignToA = starA <= starB;
      if (assignToA) {
        if (separateConstraint && teamA.includes(player1) && atk.id === "5") {
          teamB.push(atk);
          starB += stars;
        } else if (separateConstraint && teamA.includes(player5) && atk.id === "1") {
          teamB.push(atk);
          starB += stars;
        } else {
          teamA.push(atk);
          starA += stars;
        }
      } else {
        if (separateConstraint && teamB.includes(player1) && atk.id === "5") {
          teamA.push(atk);
          starA += stars;
        } else if (separateConstraint && teamB.includes(player5) && atk.id === "1") {
          teamA.push(atk);
          starA += stars;
        } else {
          teamB.push(atk);
          starB += stars;
        }
      }
    });
  });

  // 4. Fallback: Distribute defenders ONLY after attackers/tiers are done
  defenders.forEach((def, i) => {
    if (teamA.length <= teamB.length) teamA.push(def);
    else teamB.push(def);
  });

  // 5. Others by score
  others.sort((a, b) => playerScore(b) - playerScore(a));
  let scoreA = teamA.reduce((sum, p) => sum + playerScore(p), 0);
  let scoreB = teamB.reduce((sum, p) => sum + playerScore(p), 0);

  others.forEach(p => {
    const s = playerScore(p);
    if (scoreA <= scoreB) {
      teamA.push(p);
      scoreA += s;
    } else {
      teamB.push(p);
      scoreB += s;
    }
  });

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

  document.querySelectorAll('.selectable-card').forEach(card => {
    card.addEventListener('click', () => {
      const checkbox = card.querySelector('input[type="checkbox"]');
      checkbox.checked = !checkbox.checked;
      card.classList.toggle('selected', checkbox.checked);
    });
  });

  window.allPlayers = Object.fromEntries(players.map(p => [p.id, p]));
}

// Render each team sorted: attacker > defender > goalkeeper > others
function renderTeam(containerId, team) {
  const container = document.getElementById(containerId);
  const orderMap = { attacker: 1, defender: 2, goalkeeper: 3 };
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

  const { teamA, teamB } = balanceTeams(selected);

  renderTeam("teamA", teamA);
  renderTeam("teamB", teamB);
};

showSelector();
