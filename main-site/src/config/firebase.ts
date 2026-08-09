import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAK9lk9wVb6E3bdZ6Dc-6qISmvWNyQKY5w",
  authDomain: "dtv-offer-letter.firebaseapp.com",
  projectId: "dtv-offer-letter",
  storageBucket: "dtv-offer-letter.firebasestorage.app",
  messagingSenderId: "15108207783",
  appId: "1:15108207783:web:639bc6f73a9575fec61782",
  measurementId: "G-QFQ38ZVC9Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
