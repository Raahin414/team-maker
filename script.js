import { db, storage } from './firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

async function loadPlayers() {
  const snapshot = await getDocs(collection(db, "players"));
  const players = [];
  for (const doc of snapshot.docs) {
    const d = doc.data();
    const imgUrl = await getDownloadURL(ref(storage, `avatars/${doc.id}.jpg`)).catch(() => 'default.png');
    players.push({ id: doc.id, imgUrl, ...d });
  }
  renderPlayers(players);
  renderTopScorers(players);
}
