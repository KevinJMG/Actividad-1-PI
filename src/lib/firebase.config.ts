// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD7qwKi9WvLs3aaD_Lgsib3uc98v_dw5OU",
  authDomain: "meethub-551a1.firebaseapp.com",
  projectId: "meethub-551a1",
  storageBucket: "meethub-551a1.firebasestorage.app",
  messagingSenderId: "682584473718",
  appId: "1:682584473718:web:674e915a81f6d52d61df57",
  measurementId: "G-EYLNPLMBJE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ❌ QUITA ESTO
// const analytics = getAnalytics(app);

// Services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
