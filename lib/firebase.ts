import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDpCefiqNNVz9Cg7kUvD45anMKj1KM3exY",
  authDomain: "webbase-be6e0.firebaseapp.com",
  projectId: "webbase-be6e0",
  storageBucket: "webbase-be6e0.firebasestorage.app",
  messagingSenderId: "828665946644",
  appId: "1:828665946644:web:15f9e180bd84af44783d01",
  measurementId: "G-PMDDQH8R71"
};

// Initialize Firebase (prevent duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore
export const db = getFirestore(app);
export default app;
