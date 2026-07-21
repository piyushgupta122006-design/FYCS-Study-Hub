import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db, auth, googleProvider, authReady, redirectResultReady } from '../firebase';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, getDoc, Timestamp, setDoc, query, orderBy, where, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged, GoogleAuthProvider, updateProfile, sendEmailVerification } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { CheckCircle, X } from 'lucide-react';

// Create Context
const AppContext = createContext();

// Custom hook to use the context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

const CREATOR_EMAILS = ["rishiuttamsahu@gmail.com", "piyushgupta122006@gmail.com"];

// Provider Component
export const AppProvider = ({ children }) => {
  // State for materials and subjects from Firestore
  const [materials, setMaterials] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [semesters] = useState([
    { id: "1", name: "Semester 1", active: true },
    { id: "2", name: "Semester 2", active: true },
    { id: "3", name: "Semester 3", active: true },
    { id: "4", name: "Semester 4", active: true }
  ]);

  // Authentication state
  const [user, setUser] = useState(null);

  // Users state from Firestore
  const [users, setUsers] = useState([]);

  // 🚀 GRANULAR LOADING STATES
  // Previously a single `loading` flag waited for materials + subjects +
  // auth to ALL resolve before ANY page could render anything. That meant
  // every page (even ones that only need `materials`) was blocked on
  // `subjects` and on the auth round-trip too.
  //
  // Now each data source has its own flag, so pages can render their
  // static shell immediately and progressively reveal each section as soon
  // as ITS data is ready — instead of an all-or-nothing skeleton swap.
  const [authLoading, setAuthLoading] = useState(true);
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  // `loading` = is the app still figuring out whether the user is logged
  // in? This is the ONLY thing that needs to gate the top-level
  // Login-vs-App decision in App.jsx.
  const loading = authLoading;

  // Convenience flag for pages/components that need BOTH collections
  // before they can render (e.g. Library needs materials + subjects for
  // its filter dropdowns).
  const dataLoading = materialsLoading || subjectsLoading;

  // 📱💻 Bi-Device Smart Zoom Logic (Breakpoint: 425px)
  const getIsMobile = () => window.innerWidth <= 425;

  const [siteZoom, setSiteZoom] = useState(() => {
    if (getIsMobile()) {
      const savedMobile = localStorage.getItem('siteZoom_mobile');
      return savedMobile ? Number(savedMobile) : 85; // Mobile Default 85%
    } else {
      const savedPC = localStorage.getItem('siteZoom_pc');
      return savedPC ? Number(savedPC) : 100; // PC Default 100%
    }
  });

  // Zoom ko current device ke hisaab se save karna
  const updateSiteZoom = (newZoom) => {
    setSiteZoom(newZoom);
    if (getIsMobile()) {
      localStorage.setItem('siteZoom_mobile', newZoom);
    } else {
      localStorage.setItem('siteZoom_pc', newZoom);
    }
  };

  // Agar user browser resize karke mobile se PC view mein jaye, toh auto-switch ho jaye
  useEffect(() => {
    const handleResize = () => {
      if (getIsMobile()) {
        const savedMobile = localStorage.getItem('siteZoom_mobile');
        setSiteZoom(savedMobile ? Number(savedMobile) : 85);
      } else {
        const savedPC = localStorage.getItem('siteZoom_pc');
        setSiteZoom(savedPC ? Number(savedPC) : 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // User role state (separate from users array for real-time updates)
  const [userRole, setUserRole] = useState(null);

  // RBAC - Role-Based Access Control
  const isAdmin = useMemo(() =>
    CREATOR_EMAILS.includes(user?.email) || userRole === "admin",
    [user?.email, userRole]
  );

  // 🌟 NAYA GLOBAL UPLOAD ENGINE 🌟
  const [globalUploadState, setGlobalUploadState] = useState({ uploading: false, current: 0, total: 0, realProgress: 0 });

  // 🌟 GLOBAL UPLOAD FORM MEMORY (prevents form clearing on navigation)
  const [uploadFormData, setUploadFormData] = useState({ title: "", semester: "", subject: "", type: "Notes", files: [] });

  // Real-time listeners for materials and subjects
  useEffect(() => {
    const unsubscribeMaterials = onSnapshot(
      query(collection(db, "materials"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const materialsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMaterials(materialsList);
        // First callback (often from local cache, instantly) means the
        // Materials section can render now — independent of subjects/auth.
        setMaterialsLoading(false);
      },
      (error) => {
        console.error("Error listening to materials: ", error);
        setMaterialsLoading(false);
      }
    );

    const unsubscribeSubjects = onSnapshot(
      collection(db, "subjects"),
      (snapshot) => {
        const subjectsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSubjects(subjectsList);
        // First callback means the Subjects-dependent sections can render now.
        setSubjectsLoading(false);
      },
      (error) => {
        console.error("Error listening to subjects: ", error);
        setSubjectsLoading(false);
      }
    );

    return () => {
      unsubscribeMaterials();
      unsubscribeSubjects();
    };
  }, []);


  const sendWelcomeEmail = async (userEmail, userName) => {
    const welcomeTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          /* Mobile-first responsive rules */
          @media screen and (max-width: 480px) {
            .container { width: 100% !important; padding: 20px 12px !important; }
            .card { border-radius: 12px !important; }
            .header { padding: 20px 16px !important; }
            .body { padding: 20px 16px !important; }
            .footer { padding: 16px !important; }
            h1 { font-size: 18px !important; }
            p { font-size: 13px !important; }
            .cta-btn { display: block !important; max-width: 100% !important; margin: 0 auto !important; }
          }
        </style>
      </head>
      <body style="margin:0; padding:0; background-color:#0a0a0a; -webkit-font-smoothing:antialiased;">
        <div style="width:100%; table-layout:fixed; background-color:#0a0a0a;">
          <!-- Container with max-width for desktop, fluid for mobile -->
          <div class="container" style="max-width:480px; margin:0 auto; padding:32px 20px; font-family:'Segoe UI', Arial, sans-serif; box-sizing:border-box;">
            
            <!-- Card -->
            <div class="card" style="background:linear-gradient(180deg,#151515 0%,#0d0d0d 100%); border:1px solid rgba(255,215,0,0.25); border-radius:16px; overflow:hidden;">

              <!-- Header -->
              <div class="header" style="background:linear-gradient(135deg,#1a1a1a,#0a0a0a); padding:28px 24px; text-align:center; border-bottom:1px solid rgba(255,215,0,0.15);">
                <img src="https://fycs-study-hub.vercel.app/logo-b.png" alt="BNN CS Study Hub" width="52" height="52" style="border-radius:12px; margin-bottom:12px;" />
                <div style="color:#FFD700; font-size:11px; letter-spacing:2px; text-transform:uppercase; font-weight:700;">BNN CS Study Hub</div>
              </div>

              <!-- Body -->
              <div class="body" style="padding:28px 24px;">
                <h1 style="color:#ffffff; font-size:20px; margin:0 0 14px 0; font-weight:700;">Welcome aboard, ${userName} 👋</h1>
                <p style="color:#d4d4d8; font-size:14px; line-height:1.6; margin:0 0 16px 0;">
                  Your account has been successfully created on the official study portal for BNN Computer Science students. You now have access to notes, practicals, previous year questions, and assignments.
                </p>
                <p style="color:#d4d4d8; font-size:14px; line-height:1.6; margin:0 0 24px 0;">
                  Everything is free, community-driven, and built specifically for our CS batch.
                </p>

                <!-- CTA button -->
                <div style="text-align:center; margin:24px 0;">
                  <a href="https://fycs-study-hub.vercel.app/" class="cta-btn" style="background-color:#FFD700; color:#0a0a0a; text-decoration:none; font-weight:700; font-size:14px; padding:14px 28px; border-radius:8px; display:inline-block;">
                    Go to Study Hub →
                  </a>
                </div>
              </div>

              <!-- Footer -->
              <div class="footer" style="padding:18px 24px; border-top:1px solid rgba(255,255,255,0.08); text-align:center;">
                <p style="color:#71717a; font-size:11px; margin:0 0 4px 0;">This is an automated message from BNN CS Study Hub.</p>
                <p style="color:#52525b; font-size:11px; margin:0;">Questions? Reach out at <a href="mailto:rishiuttamsahu@gmail.com" style="color:#a1a1aa;">rishiuttamsahu@gmail.com</a></p>
              </div>

            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const apiBaseUrl = isLocalhost ? "https://fycs-study-hub.vercel.app" : window.location.origin;
    const sendEmailUrl = `${apiBaseUrl}/api/send-email`;

    try {
      const response = await fetch(sendEmailUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendSingle",
          email: userEmail,
          subject: "Welcome to BNN CS Study Hub 🎓",
          messageHtml: welcomeTemplate
        })
      });
      const data = await response.json();
      if (data.success) {
        console.log("Welcome email triggered successfully via Brevo");
      } else {
        console.error("Welcome email failed:", data.error);
      }
    } catch (err) {
      console.warn("Welcome email failed to dispatch:", err);
    }
  };

  // Authentication listener with user sync and ban flag
  useEffect(() => {
    let unsubscribeAuth = null;
    let unsubscribeDoc = null;
    let isMounted = true;

    const initAuth = async () => {
      try {
        await authReady;
      } catch (err) {
        console.error("Auth persistence setup failed:", err);
      }

      if (!isMounted) return;

      // Pick up the result of a signInWithRedirect() call. Awaits the
      // SHARED, module-level promise from firebase.js (captured exactly
      // once) rather than calling getRedirectResult() here directly —
      // calling it fresh in this effect would get consumed/emptied by
      // React StrictMode's dev-mode double-invoke (mount → unmount →
      // remount), making every redirect-based login look like it silently
      // failed in local development.
      try {
        await redirectResultReady;
      } catch (err) {
        console.error("Redirect sign-in error:", err);
        if (err?.code && err.code !== "auth/no-auth-event") {
          toast.error("Sign in failed. Please try again.");
        }
      }

      if (!isMounted) return;

      unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
        // Clean up previous doc listener immediately when auth state changes
        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = null;
        }

        if (firebaseUser) {
          // Set loading true so UI doesn't render home page before fetching user doc
          setAuthLoading(true);
          const userDocRef = doc(db, "users", firebaseUser.uid);

          unsubscribeDoc = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data();
              // Merge Firebase Auth data with Firestore data (including favorites, role, etc)
              setUser({
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName,
                email: firebaseUser.email,
                photoURL: firebaseUser.photoURL,
                ...userData,
                emailVerified: firebaseUser.emailVerified || false,
                id: firebaseUser.uid
              });
              setUserRole(userData.role || "student");
              setAuthLoading(false);
              setAuthTimedOut(false);
            } else {
              // 🚨 DUPLICATE EMAIL CHECK: Naya doc banane se pehle email check karo
              try {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("email", "==", firebaseUser.email));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                  // Duplicate found! Purana data naye UID me migrate karo
                  const oldDoc = querySnapshot.docs[0];
                  const oldData = oldDoc.data();

                  // Pura purana data (role, favorites) save karo naye UID ke sath
                  await setDoc(userDocRef, {
                    ...oldData,
                    uid: firebaseUser.uid
                  });

                  // Purana duplicate document delete kar do taaki db clean rahe
                  await deleteDoc(doc(db, "users", oldDoc.id));

                  // (User state onSnapshot ke agle trigger me auto-update ho jayegi)

                } else {
                  // Fresh user - create with emailVerified: false
                  const newUser = {
                    uid: firebaseUser.uid,
                    displayName: firebaseUser.displayName,
                    email: firebaseUser.email,
                    photoURL: firebaseUser.photoURL,
                    role: "student",
                    isBanned: false,
                    emailVerified: firebaseUser.emailVerified || false,
                    verificationSentAt: serverTimestamp(),
                    favorites: [],
                    createdAt: serverTimestamp()
                  };

                  await setDoc(userDocRef, newUser);

                  setUser({
                    uid: firebaseUser.uid,
                    displayName: firebaseUser.displayName,
                    email: firebaseUser.email,
                    photoURL: firebaseUser.photoURL,
                    id: firebaseUser.uid,
                    emailVerified: firebaseUser.emailVerified || false
                  });
                  setUserRole("student");

                  // If email not verified, send verification email
                  if (!firebaseUser.emailVerified) {
                    try {
                      await sendEmailVerification(firebaseUser);
                      toast.info("Verification email sent. Please check your inbox.");
                      console.log("Verification email sent to:", firebaseUser.email);
                    } catch (emailErr) {
                      console.warn("Failed to send verification email:", emailErr);
                    }
                  }

                  // Trigger welcome email silently in the background
                  sendWelcomeEmail(firebaseUser.email, firebaseUser.displayName || "Student");
                }
              } catch (err) {
                console.error("Error creating/migrating user doc:", err);
                // Fallback UI unlock (Agar database fail bhi ho jaye toh login na ruke)
                setUser({
                  uid: firebaseUser.uid,
                  displayName: firebaseUser.displayName,
                  email: firebaseUser.email,
                  photoURL: firebaseUser.photoURL,
                  id: firebaseUser.uid
                });
                setUserRole("student");
                toast.error("Connected, but database profile sync delayed.");
              } finally {
                setAuthLoading(false);
                setAuthTimedOut(false);
              }
            }
          }, (error) => {
            console.error("User doc listener error:", error);
            setAuthLoading(false);
            setAuthTimedOut(false);
          });
        } else {
          setUser(null);
          setUserRole(null);
          setAuthLoading(false);
          setAuthTimedOut(false);
        }
      });
    };

    initAuth();

    // 🛟 SAFETY NET: In rare cases (IndexedDB lock contention across tabs,
    // private/incognito mode blocking persistence, a stalled network
    // round-trip) the auth flow above can fail to ever call
    // setAuthLoading(false), which leaves the skeleton on screen forever
    // and forces the user to manually refresh. If auth hasn't resolved
    // within 3s, flag it to warn the user but do not force unblock to prevent Login flash.
    const authTimeout = setTimeout(() => {
      if (isMounted) {
        setAuthTimedOut(true);
        console.warn('Auth took too long to resolve — marking timed out.');
      }
    }, 3000);

    return () => {
      isMounted = false;
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
      clearTimeout(authTimeout);
    };
  }, []);

  // Derived state - Calculate statistics dynamically
  const stats = useMemo(() => {
    const approvedMaterials = materials.filter(m => (m.status || "").toLowerCase() === 'approved');
    const pendingMaterials = materials.filter(m => (m.status || "").toLowerCase() === 'pending');

    return {
      totalViews: approvedMaterials.reduce((sum, material) => sum + (material.views || 0), 0),
      totalDownloads: approvedMaterials.reduce((sum, material) => sum + (material.downloads || 0), 0),
      pendingRequests: pendingMaterials.length,
      totalMaterials: materials.length,
      approvedMaterials: approvedMaterials.length,
      totalSubjects: subjects.length,
      totalSemesters: semesters.length
    };
  }, [materials, subjects, semesters]);

  const shouldUseRedirect = () => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) return false;
    return true;
  };

  // Authentication functions
  const login = async () => {
    if (shouldUseRedirect()) {
      toast("Redirecting to Google...", {
        icon: "🔄",
        duration: 2500
      });
      // Redirect flow: navigates away and comes back. Result is picked up
      // by getRedirectResult() in the useEffect below on next mount.
      await signInWithRedirect(auth, googleProvider);
      return { success: true, redirecting: true };
    }

    // 🛡️ Browsers that block third-party storage (Safari ITP, Brave,
    // Chrome with "Block third-party cookies" enabled, etc.) cannot
    // complete the popup→opener relay that Firebase Auth uses internally.
    // Crucially, this failure does NOT surface as a distinct error code —
    // it disguises itself as "auth/popup-closed-by-user", exactly as if
    // the user had manually closed the window, even when they actually
    // picked an account and clicked Continue. We track how long the popup
    // was open: a genuine manual close usually happens almost instantly
    // (user backs out at the account picker), whereas a real
    // pick-account-then-continue flow takes several seconds. If we see
    // "popup closed" AFTER a realistic interaction window, we treat it as
    // a disguised storage-block failure and automatically retry via
    // signInWithRedirect instead of leaving the user stuck.
    const popupOpenedAt = Date.now();
    const REALISTIC_INTERACTION_MS = 2500;

    try {
      const result = await signInWithPopup(auth, googleProvider);

      // Force immediate state update for snappy UI
      setUser(result.user);

      return { success: true, user: result.user };
    } catch (error) {
      const elapsed = Date.now() - popupOpenedAt;
      const looksLikeDisguisedStorageBlock =
        (error?.code === "auth/popup-closed-by-user" ||
          error?.code === "auth/cancelled-popup-request") &&
        elapsed > REALISTIC_INTERACTION_MS;

      if (looksLikeDisguisedStorageBlock || error?.code === "auth/popup-blocked") {
        const reason = error?.code === "auth/popup-blocked"
          ? "Popup was blocked by the browser"
          : `Popup closed/cancelled after ${elapsed}ms (${error?.code})`;

        console.warn(`${reason}. Falling back to signInWithRedirect.`);
        toast("Your browser's settings are blocking the popup. Redirecting you to Google instead...", {
          icon: "🔄",
          duration: 4000
        });
        await signInWithRedirect(auth, googleProvider);
        return { success: true, redirecting: true };
      }

      // Genuine fast manual close, or any other error — let the caller
      // (Login.jsx) handle it as before.
      throw error;
    }
  };

  // Function to retrieve Google Drive token from cache (no longer required)
  const refreshDriveToken = async () => {
    return { success: false, error: "Google Drive token is no longer required or supported." };
  };

  const logout = async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  // Action Functions for Firestore

  // 1. Add new material
  const addMaterial = async (formData) => {
    try {
      const title = formData.title.trim();
      const subjectId = formData.subjectId;

      // Pre-upload check: Query for existing material with same title and subject
      const duplicateQuery = query(
        collection(db, "materials"),
        where("subjectId", "==", subjectId),
        where("title", "==", title)
      );

      const duplicateSnapshot = await getDocs(duplicateQuery);

      // Block duplicates
      if (!duplicateSnapshot.empty) {
        return {
          success: false,
          error: "⚠️ Duplicate Found: A file with this Name and Subject already exists!"
        };
      }

      // Allow unique: Proceed with upload
      const newMaterial = {
        title: title,
        subjectId: subjectId,
        semId: formData.semId,
        type: formData.type,
        link: formData.link.trim(),
        status: "Pending",
        views: 0,
        downloads: 0,
        uploadedBy: formData.uploadedBy || "Student",
        uploadedByUid: formData.uploadedByUid || null,
        date: serverTimestamp(), // Use Firestore timestamp
        createdAt: serverTimestamp() // Add creation timestamp for sorting
      };

      const docRef = await addDoc(collection(db, "materials"), newMaterial);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding material:', error);
      // Return a safe error message
      const errorMessage = error?.message || error?.toString() || "Failed to add material";
      return { success: false, error: errorMessage };
    }
  };

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });

  // 🌟 Estimated-time based simulation (koi fixed 99% cap nahi)
  const uploadSingleFile = async (file, userName, customFileName, onProgress) => {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwMLyR-WYFHla9UlkmW_739DcMCSlNHDytuwGSRzmgk6S43Trv6lCgjqecC19HfSqA3xQ/exec";

    const cleanPart = (value) => (value || "")
      .toString().trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ");

    const extension = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
    const originalNameWithoutExt = file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;
    const cleanName = cleanPart(originalNameWithoutExt);
    const finalFileName = customFileName ? customFileName.trim() : (userName ? `${cleanPart(userName)}-${cleanName}${extension}` : `${cleanName}${extension}`);

    // Average ~1.5 Mbps effective throughput assume karke estimate
    const estimatedMs = Math.max(2000, (file.size / (1.5 * 1024 * 1024 / 8)) * 1000);
    const startTime = Date.now();
    let simInterval;
    if (onProgress) {
      simInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min(97, Math.round((elapsed / estimatedMs) * 100));
        onProgress(pct);
      }, 200);
    }

    try {
      const base64Data = await toBase64(file);
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({ base64: base64Data, name: finalFileName, mimeType: file.type })
      });
      const result = await response.json();
      clearInterval(simInterval);

      if (result.status === "success") {
        if (onProgress) onProgress(100);
        return { success: true, fileUrl: result.fileUrl, fileId: result.fileId };
      } else {
        throw new Error(result.message || "Failed to upload file to Google Drive");
      }
    } catch (err) {
      clearInterval(simInterval);
      throw err;
    }
  };

  const startGlobalUpload = async (filesToUpload, metadata, userName, userEmail) => {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwMLyR-WYFHla9UlkmW_739DcMCSlNHDytuwGSRzmgk6S43Trv6lCgjqecC19HfSqA3xQ/exec";
    const emailAccessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;
    
    const results = {
      succeeded: [],
      failed: []
    };

    try {
      setGlobalUploadState({ uploading: true, current: 0, total: filesToUpload.length, realProgress: 0 });

      const semName = semesters.find(s => String(s.id) === String(metadata.semester))?.name || `Sem-${metadata.semester}`;
      const subName = subjects.find(s => String(s.id) === String(metadata.subject))?.name || `Sub-${metadata.subject}`;

      const cleanPart = (value) => (value || "")
        .toString().trim()
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, " ");

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const preUploaded = metadata.preUploadedLinks?.[i];

        try {
          setGlobalUploadState(prev => ({
            ...prev,
            current: i + 1
          }));

          const extension = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
          let customFileName = `${cleanPart(userName)}-${cleanPart(semName)}-${cleanPart(subName)}-${cleanPart(metadata.title)}`;
          if (filesToUpload.length > 1) customFileName += `-(Part ${i + 1})`;
          customFileName += extension;

          let fileUrl = "";
          let fileId = "";

          if (preUploaded?.fileUrl) {
            fileUrl = preUploaded.fileUrl;
            fileId = preUploaded.fileId;
            setGlobalUploadState(prev => ({
              ...prev,
              realProgress: ((i + 1) * 100) / filesToUpload.length
            }));
          } else {
            try {
              const result = await uploadSingleFile(
                file,
                userName,
                customFileName,
                (percent) => {
                  setGlobalUploadState(prev => {
                    const fileStart = (i * 100) / filesToUpload.length;
                    const fileShare = 100 / filesToUpload.length;
                    return { ...prev, realProgress: fileStart + (percent / 100) * fileShare };
                  });
                }
              );
              fileUrl = result.fileUrl;
              fileId = result.fileId;
            } catch (uploadErr) {
              throw new Error(`Failed to upload ${file.name}: ${uploadErr.message}`);
            }
          }

          if (fileUrl) {
            try {
              await addDoc(collection(db, "materials"), {
                title: metadata.title,
                semId: metadata.semester,
                subjectId: metadata.subject,
                type: metadata.type,
                link: fileUrl,
                fileId: fileId,
                fileName: customFileName,
                status: "Pending",
                uploadedBy: userName,
                uploadedByUid: user?.uid || null,
                uploadedByEmail: userEmail,
                date: new Date().toISOString(),
                createdAt: serverTimestamp()
              });

              results.succeeded.push({
                file: file.name,
                fileId: fileId
              });
            } catch (dbErr) {
              throw new Error(`Database save failed for ${file.name}: ${dbErr.message}`);
            }
          }
        } catch (fileError) {
          console.error(`Error with file ${file.name}:`, fileError);
          results.failed.push({
            file: file.name,
            error: fileError.message
          });
        }
      }

    } catch (globalError) {
      console.error("Upload batch error:", globalError);
      results.failed.push({
        file: "Batch operation",
        error: globalError.message
      });
    } finally {
      // ALWAYS reset upload state, even if errors
      setGlobalUploadState({ uploading: false, current: 0, total: 0, realProgress: 0 });

      // Show results to user
      if (results.succeeded.length > 0) {
        toast.success(`✅ ${results.succeeded.length} file(s) uploaded successfully`);
        
        // Trigger web3forms notifications if enabled
        if (emailAccessKey) {
          try {
            const emailMessage = `A new student just uploaded materials to the Study Hub!\n\n👤 Student Name: ${userName || 'Student'}\n📧 Email: ${userEmail || 'No Email'}\n📚 Subject: ${subName || 'Unknown'}\n📁 Files Uploaded: ${results.succeeded.length} document(s)\n\nPlease log in to the Admin Dashboard to Review and Approve.`;

            fetch('https://api.web3forms.com/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_key: emailAccessKey,
                subject: '🚨 FYCS Hub Alert: New Upload Pending!',
                from_name: 'Study Hub System',
                message: emailMessage
              })
            }).catch((err) => console.log('Email alert silently failed', err));
          } catch (error) {
            console.error('Alert Engine Error:', error);
          }
        }
      }
      if (results.failed.length > 0) {
        toast.error(`❌ ${results.failed.length} file(s) failed to upload`);
        results.failed.forEach(f => {
          console.error(`Failed: ${f.file} - ${f.error}`);
        });
      }

      return results;
    }
  };

  // 2. Approve material (Pending → Approved)
  const approveMaterial = async (id) => {
    try {
      await updateDoc(doc(db, "materials", id), {
        status: "Approved",
        approvedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error approving material:', error);
      const errorMessage = error?.message || error?.toString() || "Failed to approve material";
      return { success: false, error: errorMessage };
    }
  };

  // 3. Reject material (Remove entirely)
  const rejectMaterial = async (id) => {
    try {
      await deleteDoc(doc(db, "materials", id));
      return { success: true };
    } catch (error) {
      console.error('Error rejecting material:', error);
      const errorMessage = error?.message || error?.toString() || "Failed to reject material";
      return { success: false, error: errorMessage };
    }
  };

  // 4. Delete approved material
  const deleteMaterial = async (id) => {
    try {
      await deleteDoc(doc(db, "materials", id));
      return { success: true };
    } catch (error) {
      console.error('Error deleting material:', error);
      const errorMessage = error?.message || error?.toString() || "Failed to delete material";
      return { success: false, error: errorMessage };
    }
  };

  // 5. Add new subject
  const addSubject = async (name, semId, icon = "Book") => {
    try {
      const newSubject = {
        name: name.trim(),
        semId: Number(semId), // Force Number type for consistency
        icon: icon || "Book", // Default icon
        createdAt: new Date() // Useful for sorting
      };

      const docRef = await addDoc(collection(db, "subjects"), newSubject);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding subject:', error);
      const errorMessage = error?.message || error?.toString() || "Failed to add subject";
      return { success: false, error: errorMessage };
    }
  };

  // 6. Increment view count
  const incrementView = async (id) => {
    try {
      const materialRef = doc(db, "materials", id);
      const currentUser = auth.currentUser;
      
      let updateData = { views: increment(1) };
      
      if (currentUser) {
        const viewerDetails = {
          name: currentUser.displayName || "Unknown",
          email: currentUser.email || "No Email",
          time: new Date().toISOString()
        };
        updateData.viewedBy = arrayUnion(viewerDetails);
      }
      
      await updateDoc(materialRef, updateData);
      return { success: true };
    } catch (error) {
      console.error('Error incrementing view:', error);
      const errorMessage = error?.message || error?.toString() || "Failed to increment view count";
      return { success: false, error: errorMessage };
    }
  };

  // Utility Functions
  const getSubjectById = (id) => {
    return subjects.find(subject => subject.id === id);
  };

  const getSemesterById = (id) => {
    return semesters.find(semester => semester.id === id);
  };
  // 🚨 STRICT FILTER LOGIC
  const isPubliclyVisible = (material) => {
    const stat = (material.status || "").toString().trim().toLowerCase();
    // Only show if explicitly 'approved' or if status is missing (legacy files)
    return stat === "" || stat === "approved";
  };

  const getMaterialsBySubject = (subjectId) => {
    return materials.filter(material => material.subjectId === subjectId && isPubliclyVisible(material));
  };

  const getMaterialsBySemester = (semId) => {
    return materials.filter(material => material.semId === semId && isPubliclyVisible(material));
  };

  const getPendingMaterials = () => {
    return materials.filter(material => {
      const stat = (material.status || "").toString().trim().toLowerCase();
      return stat === "pending";
    });
  };

  const getApprovedMaterials = () => {
    return materials.filter(material => isPubliclyVisible(material));
  };

  const getRecentMaterials = (limit = 10) => {
    return materials
      .filter(material => isPubliclyVisible(material))
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || a.date || Date.now());
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || b.date || Date.now());
        return dateB - dateA;
      })
      .slice(0, limit);
  };

  // Get subjects by semester ID
  const getSubjectsBySemester = (semId) => {
    return subjects.filter(subject => Number(subject.semId) === Number(semId));
  };

  // State for tracking if admin is viewing reports
  const [isViewingReports, setIsViewingReports] = useState(false);

  // Function to set viewing reports status
  const setViewingReports = (status) => {
    setIsViewingReports(status);
  };

  // Toggle favorite function
  const toggleFavorite = async (materialId) => {
    if (!user) {
      toast.error("Please login to save materials!");
      return { success: false, error: "Not logged in" };
    }

    const currentFavorites = user.favorites || [];
    const isFavorited = currentFavorites.includes(materialId);

    // Calculate new favorites array
    const newFavorites = isFavorited
      ? currentFavorites.filter(id => id !== materialId)
      : [...currentFavorites, materialId];

    // OPTIMISTIC UPDATE: Update local state instantly for snappy UI
    setUser(prev => ({ ...prev, favorites: newFavorites }));

    const userRef = doc(db, "users", user.uid || user.id);

    try {
      await updateDoc(userRef, {
        favorites: isFavorited ? arrayRemove(materialId) : arrayUnion(materialId)
      });

      toast.success(isFavorited ? "Removed from favorites" : "Saved to favorites!");
      return { success: true };
    } catch (error) {
      console.error("Error toggling favorite:", error);
      // Revert local state if database fails
      setUser(prev => ({ ...prev, favorites: currentFavorites }));
      toast.error("Failed to update favorites");
      return { success: false, error: error.message };
    }
  };

  // Real-time profile update that propagates globally
  const updateUserProfile = async ({ displayName, photoURL }) => {
    if (!user || !auth.currentUser) return { success: false, error: "Not logged in" };

    const newName = displayName || user.displayName || "";
    const newPhoto = photoURL || user.photoURL || null;

    // 1. OPTIMISTIC UPDATE: Update global user state immediately
    setUser(prev => ({
      ...prev,
      displayName: newName,
      photoURL: newPhoto,
    }));

    try {
      // 2. Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: newName,
        photoURL: newPhoto,
      });

      // 3. Update Firestore user document (triggers onSnapshot → reaffirms state)
      const userRef = doc(db, "users", user.uid || user.id);
      await updateDoc(userRef, {
        displayName: newName,
        photoURL: newPhoto,
      });

      // 4. Update all materials uploaded by this user so old cards reflect new name
      try {
        const q = query(collection(db, "materials"), where("uploadedByUid", "==", user.uid || user.id));
        const snapshot = await getDocs(q);
        await Promise.allSettled(
          snapshot.docs.map(docSnap => updateDoc(doc(db, "materials", docSnap.id), { uploadedBy: newName }))
        );
      } catch (err) {
        console.warn("Material name sync skipped (non-critical):", err);
      }

      return { success: true };
    } catch (error) {
      // Revert optimistic update on failure
      setUser(prev => ({
        ...prev,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }));
      return { success: false, error: error.message };
    }
  };

  // Context value
  const contextValue = {
    // State
    materials,
    subjects,
    semesters,
    users,
    user, // Add user to context
    userRole,
    isBanned: user?.isBanned || false,
    stats,
    loading,
    authTimedOut,
    materialsLoading,
    subjectsLoading,
    dataLoading,
    siteZoom,
    updateSiteZoom,

    // RBAC
    isAdmin,

    // Authentication functions
    login,
    logout,
    refreshDriveToken,

    // Action Functions
    addMaterial,
    approveMaterial,
    rejectMaterial,
    deleteMaterial,
    addSubject,
    incrementView,

    // Utility Functions
    getSubjectById,
    getSemesterById,
    getMaterialsBySubject,
    getMaterialsBySemester,
    getPendingMaterials,
    getApprovedMaterials,
    getRecentMaterials,
    getSubjectsBySemester,

    // Favorites Function
    toggleFavorite,

    // Real-time Profile Update
    updateUserProfile,
    // Global Upload Engine
    globalUploadState,
    uploadFormData,
    setUploadFormData,
    startGlobalUpload,
    uploadSingleFile
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
