import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence, getRedirectResult } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

// ✅ Correct Config for 'fycs-study-hub'
const firebaseConfig = {
  apiKey: "AIzaSyCCDR8O9zy0bSyCa5dsinR8SSmnMQcWxTY",
  // 🔑 MUST stay on Firebase's own auth domain, NOT the Vercel domain.
  // signInWithRedirect() sends the browser to
  // `https://<authDomain>/__/auth/handler` to finish the OAuth exchange.
  // That path is only ever served automatically for a project's default
  // "<project-id>.firebaseapp.com" domain (or a domain actually connected
  // via Firebase Hosting). Vercel has no idea what that path is — with a
  // SPA catch-all rewrite it just serves index.html there instead, so the
  // OAuth code/token is never exchanged and the app lands back on Login
  // with no error. Popup flow mostly survives this via postMessage, but
  // full-page redirect does not.
  authDomain: "fycs-study-hub.firebaseapp.com",
  projectId: "fycs-study-hub",
  storageBucket: "fycs-study-hub.firebasestorage.app",
  messagingSenderId: "308883339928",
  appId: "1:308883339928:web:a5e59d402b7ddf0e4b2eed"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const authReady = setPersistence(auth, browserLocalPersistence);
export const googleProvider = new GoogleAuthProvider();

// 🔑 getRedirectResult() is a ONE-SHOT operation — the first call consumes
// the pending redirect credential internally, so a second call returns
// `null` even for a genuinely successful sign-in. React 18/19 StrictMode
// intentionally double-invokes effects in development (mount → unmount →
// remount), which was calling this twice per redirect-based login: the
// first (discarded) invocation consumed the result, and the second
// (surviving) invocation got `null` — making it look like the login
// silently failed on every redirect sign-in, but only in dev mode.
//
// Capturing it ONCE here, at module scope, fixes this: ES modules are only
// evaluated once per page load no matter how many times a React effect
// re-runs, so this promise is guaranteed to represent the one real call.
export const redirectResultReady = authReady.then(() => getRedirectResult(auth));

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