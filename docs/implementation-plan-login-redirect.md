# Implementation Plan — Google Sign-In: Desktop Redirect Fix

Covers: making desktop use the same `signInWithRedirect` flow as mobile,
the root cause of "select Gmail account → back to Login page", and how to
verify all of it on `localhost`.

---

## Background — what was broken

Symptom: converting desktop login from popup → redirect worked on mobile,
but on desktop, after picking a Google account, the browser landed back on
the **Login page again** — no error shown.

### Root cause
`src/firebase.js` had:
```javascript
authDomain: "fycs-study-hub.vercel.app"
```

`signInWithRedirect` finishes the OAuth exchange by sending the browser to
`https://<authDomain>/__/auth/handler`. That special path is only ever
auto-served by:
- a project's default `<project-id>.firebaseapp.com` domain, or
- a custom domain actually connected via **Firebase Hosting**

The site is deployed on **Vercel**, not Firebase Hosting. So
`https://fycs-study-hub.vercel.app/__/auth/handler` doesn't exist as a real
Firebase auth page — Vercel's SPA catch-all rewrite just served the normal
`index.html` there instead. The OAuth code was never exchanged, so the app
had no idea a sign-in had happened, and simply rendered the Login page again
as if nothing occurred.

Popup flow mostly survived this because it can relay via `postMessage`
without needing a full separate page load of the handler — redirect flow
has no such fallback, it depends on that page actually loading and running.

---

## Changes made

### 1. `src/firebase.js`
Reverted `authDomain` to Firebase's own domain, which serves
`/__/auth/handler` automatically with zero extra setup:
```javascript
authDomain: "fycs-study-hub.firebaseapp.com"
```
Removed the now-unused `isLocalhost` variable (was only referenced by the
old dynamic-authDomain logic).

### 2. `src/context/AppContext.jsx`
`shouldUseRedirect()` now always returns `true` — every device (mobile and
desktop) uses `signInWithRedirect`, popup is no longer used at all. This
also removes the need for the earlier "disguised popup-closed-by-user →
auto-retry via redirect" workaround, since redirect is now the only path.

Toast copy on login click updated from the old "in-app webview detected"
wording (mobile-only phrasing) to a generic "Redirecting to Google..."
message, since it now fires for every login attempt.

---

## Required Firebase Console check (one-time, not code)

Firebase Console → **Authentication → Settings → Authorized domains** must
include:
- [ ] `localhost` (for local dev testing — usually present by default on new
      projects, but confirm)
- [ ] `fycs-study-hub.vercel.app` (for production — should already be there
      since popup login was working before)

If `localhost` is missing, redirect will fail on local testing with
`auth/unauthorized-domain` in the console, even though the code is correct.

---

## How to test on localhost

1. Run `npm run dev`, open `http://localhost:5173`
2. Click **Sign in with Google** → should immediately redirect (no popup
   window) to Google's account picker
3. Select an account
4. Browser should land back on `http://localhost:5173/...` and the app
   should show as logged in — **not** the Login page again
5. Open DevTools Console **before** starting the flow so you can catch any
   error that fires during the redirect-back — most likely candidates if it
   still fails:
   - `auth/unauthorized-domain` → `localhost` not in Authorized domains
   - `auth/redirect-cancelled-by-user` → browser blocked third-party
     storage/cookies during the bounce (test in a normal window, not
     Incognito/strict privacy mode, to rule this out first)
   - No error at all, just silently back on Login → capture the exact URL
     the browser lands on after Google redirects back; if it still shows
     `/__/auth/handler` in the address bar without redirecting further, the
     authDomain fix didn't take effect (hard refresh / clear cache and
     retry, since old JS bundle may be cached)

## How to test on production (after localhost passes)

1. Deploy the updated `firebase.js` + `AppContext.jsx` to Vercel
2. Hard refresh the production URL (old service worker/cache can serve a
   stale bundle otherwise)
3. Repeat the same login flow — same pass/fail criteria as above
4. Test on both a desktop browser and a mobile browser to confirm both still
   work under the single unified redirect path

---

## Checklist

- [x] `authDomain` reverted to `fycs-study-hub.firebaseapp.com` in `firebase.js`
- [x] Removed unused `isLocalhost` variable
- [x] `shouldUseRedirect()` forced to `true` for all devices in `AppContext.jsx`
- [x] Login toast copy updated to be device-agnostic
- [ ] Confirm `localhost` is in Firebase Console → Authorized domains
- [ ] Confirm `fycs-study-hub.vercel.app` is in Firebase Console → Authorized domains
- [ ] Test full redirect login flow on `localhost`
- [ ] Deploy and test full redirect login flow on production (desktop)
- [ ] Re-test on mobile to confirm no regression
