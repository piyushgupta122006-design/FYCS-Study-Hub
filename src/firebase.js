import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

// ✅ Correct Config for 'fycs-study-hub'
const isLocalhost = typeof window !== "undefined" && 
  (window.location.hostname === "localhost" || 
   window.location.hostname === "127.0.0.1" || 
   window.location.hostname.startsWith("192.168."));

const firebaseConfig = {
  apiKey: "AIzaSyCCDR8O9zy0bSyCa5dsinR8SSmnMQcWxTY",
  authDomain: !isLocalhost && typeof window !== "undefined" && window.location.hostname
    ? window.location.hostname
    : "fycs-study-hub.firebaseapp.com",
  projectId: "fycs-study-hub",
  storageBucket: "fycs-study-hub.firebasestorage.app",
  messagingSenderId: "308883339928",
  appId: "1:308883339928:web:a5e59d402b7ddf0e4b2eed"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const authReady = setPersistence(auth, browserLocalPersistence);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

// 🚀 PERSISTENT OFFLINE CACHE
// Without this, every full page refresh wipes Firestore's in-memory cache,
// forcing onSnapshot() to wait for a fresh server round-trip before it can
// fire — which is why the skeleton always shows on refresh, even right
// after the data was already loaded once.
//
// With persistentLocalCache, the SDK stores the last-synced materials &
// subjects in IndexedDB. On refresh, onSnapshot() fires almost instantly
// with the cached data (so the UI can render immediately), then quietly
// syncs with the server in the background and updates if anything changed.
//
// persistentMultipleTabManager lets multiple tabs of the site share the
// same cache instead of fighting over a lock.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});