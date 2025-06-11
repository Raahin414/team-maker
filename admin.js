import { db, auth } from './firebase.js';
import { collection, getDocs, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('btnLogin');
const loginSection = document.getElementById('loginSection');
const adminSection = document.getElementById('adminSection');
const playerSelect = document.getElementById('playerSelect');
const goalsInput = document.getElementById('goals');
const addMatchBtn = document.getElementById('addMatch');

loginBtn.onclick = () => {
  signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
    .catch(e => document.getElementById('loginError').textContent = e.message);
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginSection.style.display = 'none';
    adminSection.style.display = 'block';
    const snapshot = await getDocs(collection(db, "players"));
    playerSelect.innerHTML = snapshot.docs.map(d => `<option value="${d.id}">${d.data().name}</option>`).join('');
  } else {
    loginSection.style.display = 'block';
    adminSection.style.display = 'none';
  }
});

addMatchBtn.onclick = async () => {
  const pid = playerSelect.value;
  const goals = parseInt(goalsInput.value);
  const ref = doc(db, "players", pid);
  await updateDoc(ref, {
    matches: increment(1),
    goals: increment(goals)
  });
  alert("Player stats updated!");
};

