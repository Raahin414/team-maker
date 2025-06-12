import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Score logic using goals per match and total stats
function playerScore(p) {
  const gpm = p.matches > 0 ? p.goals / p.matches : 0;
  return (gpm * 3) + (p.goals * 1.5) + (p.matches * 0.5);
}

// Enhanced team balancing with tier and star logic
function balanceTeams(players) {
  const keepers = players.filter(p => p.position?.toLowerCase() === "goalkeeper");
  const defenders = players.filter(p => p.position?.toLowerCase() === "defender");
  const attackers = players.filter(p => p.position?.toLowerCase() === "attacker");
  const others = players.filter(p => !["goalkeeper", "defender", "attacker"].includes(p.position?.toLowerCase()));

  const teamA = [], teamB = [];

  if (keepers.length > 0) teamA.push(keepers[0]);
  if (keepers.length > 1) teamB.push(keepers[1]);

  // Normalize stars and tiers for attackers
  const normalizedAttackers = attackers.map(p => ({
    ...p,
    stars: Math.max(2, Math.min(4, p.stars ?? 2)),
    tier: Math.max(1, Math.min(3, p.tier ?? 3))
  }));

  const bestSplit = findBestAttackerSplit(normalizedAttackers);
  teamA.push(...bestSplit.teamA);
  teamB.push(...bestSplit.teamB);

  const diff = Math.abs(bestSplit.starA - bestSplit.starB);
  if (diff > 1) {
    defenders.forEach(def => {
      if (bestSplit.starA < bestSplit.starB) teamA.push(def);
      else teamB.push(def);
    });
  } else {
    defenders.forEach((def, i) => {
      if (i % 2 === 0) teamA.push(def);
      else teamB.push(def);
    });
  }

  others.forEach((p, i) => {
    if (i % 2 === 0) teamA.push(p);
    else teamB.push(p);
  });

  return { teamA, teamB };
}

// Exhaustive split on tier first, then star sum
function findBestAttackerSplit(attackers) {
  const n = attackers.length;
  let bestDiff = Infinity;
  let bestTierDiff = Infinity;
  let bestTeamA = [], bestTeamB = [];
  let bestScoreA = 0, bestScoreB = 0;

  const totalComb = 1 << n;
  for (let mask = 0; mask < totalComb; mask++) {
    const teamA = [], teamB = [];
    let scoreA = 0, scoreB = 0;
    let tierA = 0, tierB = 0;

    for (let i = 0; i < n; i++) {
      const player = attackers[i];
      if ((mask & (1 << i)) === 0) {
        teamA.push(player);
        scoreA += player.stars;
        tierA += player.tier;
      } else {
        teamB.push(player);
        scoreB += player.stars;
        tierB += player.tier;
      }
    }

    const starDiff = Math.abs(scoreA - scoreB);
    const tierDiff = Math.abs(tierA - tierB);

    if (tierDiff < bestTierDiff || (tierDiff === bestTierDiff && starDiff < bestDiff)) {
      bestDiff = starDiff;
      bestTierDiff = tierDiff;
      bestTeamA = teamA;
      bestTeamB = teamB;
      bestScoreA = scoreA;
      bestScoreB = scoreB;
    }

    if (bestDiff === 0 && bestTierDiff === 0) break;
  }

  return {
    teamA: bestTeamA,
    teamB: bestTeamB,
    starA: bestScoreA,
    starB: bestScoreB
  };
}

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

window.generateFromSelection = function () {
  const checked = Array.from(document.querySelectorAll('#playerSelector input[type="checkbox"]:checked'))
    .map(cb => cb.value);
  const selected = checked.map(id => window.allPlayers[id]);

  document.getElementById("teamA").innerHTML = "";
  document.getElementById("teamB").innerHTML = "";

  const { teamA, teamB } = balanceTeams(selected);
  renderTeam("teamA", teamA);
  renderTeam("teamB", teamB);
};

showSelector();
