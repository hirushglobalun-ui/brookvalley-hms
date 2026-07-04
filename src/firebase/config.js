import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAuXp8EEU8_dCl1Hzq3HUpVqZYIiKaWX24",
  authDomain: "brookvalley-hms.firebaseapp.com",
  projectId: "brookvalley-hms",
  storageBucket: "brookvalley-hms.firebasestorage.app",
  messagingSenderId: "728203533848",
  appId: "1:728203533848:web:4faa25f7cdfe3c86582d6d",
  measurementId: "G-J55RTFZD69"
};

// Initialize main Firebase app
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, firebaseConfig };
