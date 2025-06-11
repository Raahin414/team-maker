import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDNhT3JE7Q86cvW2krzeTLX1goNcCMMDzs",
  authDomain: "team-maker-764bb.firebaseapp.com",
  projectId: "team-maker-764bb",
  storageBucket: "team-maker-764bb.firebasestorage.app",
  messagingSenderId: "1097826528288",
  appId: "1:1097826528288:web:c840e861c916f8184ca045",
  measurementId: "G-89QHFM9GN7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
