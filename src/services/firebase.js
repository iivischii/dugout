import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore/lite";

// Firebase web configuration identifies the app; it is not a private server key.
const firebaseConfig = {
  apiKey: "AIzaSyA0PDamrjNVzVNFlEdhC7NxNB_yHXMBdpI",
  authDomain: "the-dugout-a5d24.firebaseapp.com",
  projectId: "the-dugout-a5d24",
  storageBucket: "the-dugout-a5d24.firebasestorage.app",
  messagingSenderId: "140642688666",
  appId: "1:140642688666:web:a645beac215784be4c0923",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
