import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ✅ Correct Config for 'fycs-study-hub'
const firebaseConfig = {
  apiKey: "AIzaSyCCDR8O9zy0bSyCa5dsinR8SSmnMQcWxTY",
  authDomain: "fycs-study-hub.firebaseapp.com",
  projectId: "fycs-study-hub",
  storageBucket: "fycs-study-hub.firebasestorage.app",
  messagingSenderId: "308883339928",
  appId: "1:308883339928:web:a5e59d402b7ddf0e4b2eed"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
export const db = getFirestore(app);