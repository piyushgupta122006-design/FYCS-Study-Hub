import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db, auth, googleProvider, authReady } from '../firebase';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, getDoc, Timestamp, setDoc, query, orderBy, where, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
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

// 📤 Shared Drive upload endpoint + filename sanitizer, used both by the
// legacy `startGlobalUpload` flow and the newer per-file background
// upload flow (`uploadFileToDrive`) below.
const DRIVE_UPLOAD_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzc1QTM0qx8OPGs16QRXbtEevBgik4pceDjLpKKS98f8DBD7A8yszDjmibQb7cTQBs8tQ/exec";

const sanitizeFileNamePart = (value) => (value || "")
  .toString()
  .trim()
  .replace(/[\\/:*?"<>|]+/g, "-")
  .replace(/\s+/g, " ");

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

  // Real-time listener for users (ONLY FOR ADMIN)
  useEffect(() => {
    if (!isAdmin) {
      setUsers([]);
      return;
    }

    const unsubscribeUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const usersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort: Newest timestamp (b) - Oldest timestamp (a)
        const sortedUsers = usersList.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });

        setUsers(sortedUsers);
      },
      (error) => {
        console.error("Error listening to users: ", error);
      }
    );

    return () => unsubscribeUsers();
  }, [isAdmin]);

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

      // Pick up the result of a signInWithRedirect() call (mobile/webview
      // login flow). Must run BEFORE/alongside onAuthStateChanged so we can
      // capture the Drive OAuth access token from the redirect, same as the
      // popup flow does.
      try {
        await getRedirectResult(auth);
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
                id: firebaseUser.uid
              });
              setUserRole(userData.role || "student");
              setAuthLoading(false);
            } else {
              // Create user document if it doesn't exist
              const newUser = {
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName,
                email: firebaseUser.email,
                photoURL: firebaseUser.photoURL,
                role: "student", // Default role
                isBanned: false, // Default to not banned
                favorites: [], // Initialize empty favorites array
                createdAt: serverTimestamp() // Use serverTimestamp for consistency
              };

              try {
                await setDoc(userDocRef, newUser);
                setUser({
                  uid: firebaseUser.uid,
                  displayName: firebaseUser.displayName,
                  email: firebaseUser.email,
                  photoURL: firebaseUser.photoURL,
                  id: firebaseUser.uid
                });
                setUserRole("student");
              } catch (err) {
                console.error("Error creating user doc:", err);

                // 🚨 FIX 2: Set user state anyway! Agar database block bhi kare, 
                // toh user loop mein na fase aur kam se kam login ho jaye.
                setUser({
                  uid: firebaseUser.uid,
                  displayName: firebaseUser.displayName,
                  email: firebaseUser.email,
                  photoURL: firebaseUser.photoURL,
                  id: firebaseUser.uid
                });
                setUserRole("student");

                toast.error("Connected, but database profile creation delayed.");
              } finally {
                setAuthLoading(false);
              }
            }
          }, (error) => {
            console.error("User doc listener error:", error);
            setAuthLoading(false);
          });
        } else {
          setUser(null);
          setUserRole(null);
          setAuthLoading(false);
        }
      });
    };

    initAuth();

    return () => {
      isMounted = false;
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
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

  // Detect mobile devices / in-app webviews (Instagram, WhatsApp, Facebook, etc.)
  // where signInWithPopup silently fails to return control to the opener.
  // Standard mobile browsers (Chrome/Safari) support popups perfectly.
  // 🚨 FIX 1: Force Redirect for ALL Mobile devices to prevent Tab-Kill Loop
  const shouldUseRedirect = () => {
    const ua = navigator.userAgent || navigator.vendor || "";
    // Ab isme isInAppWebview ki zaroorat nahi, har mobile device redirect use karega
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    return isMobile;
  };

  // Authentication functions
  const login = async () => {
    if (shouldUseRedirect()) {
      toast("In-app webview detected. Redirecting to Google. For a smoother experience, please open this site in Chrome or Safari.", {
        icon: "ℹ️",
        duration: 5000
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

      if (looksLikeDisguisedStorageBlock) {
        console.warn(
          `Popup closed after ${elapsed}ms with code ${error.code} — ` +
          `this looks like a third-party storage block (Safari ITP / Brave / ` +
          `Chrome 3rd-party cookies off) disguised as a manual close. ` +
          `Falling back to signInWithRedirect.`
        );
        toast("Your browser's privacy settings are blocking popup sign-in. Redirecting you to Google instead...", {
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

  // 📤 BACKGROUND FILE UPLOAD (per-file, decoupled from the materials form)
  // Uploads a single file to Drive via the Apps Script endpoint and resolves
  // with its final URL — it does NOT write anything to Firestore. This lets
  // Upload.jsx fire uploads the instant a file is selected, before the user
  // has even finished filling in title/semester/subject.
  // Progress is simulated (the Apps Script endpoint doesn't stream real
  // upload progress back) using the same ramp curve as the original
  // bulk-upload flow, so the UX still feels responsive. Supports
  // cancellation via AbortSignal so an in-flight upload can be stopped if
  // the user removes the file before it finishes.
  const uploadFileToDrive = (file, fileName, onProgress, signal) => {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Upload cancelled", "AbortError"));
        return;
      }

      let progress = 0;
      const progressInterval = setInterval(() => {
        let increment = 0;
        if (progress < 40) increment = 4.0;
        else if (progress < 75) increment = 2.0;
        else if (progress < 90) increment = 0.5;
        else if (progress < 99) increment = 0.1;
        progress = Math.min(99, progress + increment);
        onProgress?.(progress);
      }, 100);

      const cleanup = () => clearInterval(progressInterval);
      const onAbort = () => {
        cleanup();
        reject(new DOMException("Upload cancelled", "AbortError"));
      };
      signal?.addEventListener("abort", onAbort);

      toBase64(file)
        .then((base64Data) => {
          if (signal?.aborted) throw new DOMException("Upload cancelled", "AbortError");
          return fetch(DRIVE_UPLOAD_SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({ base64: base64Data, name: fileName, mimeType: file.type }),
          });
        })
        .then((response) => response.json())
        .then((result) => {
          signal?.removeEventListener("abort", onAbort);
          cleanup();
          if (signal?.aborted) throw new DOMException("Upload cancelled", "AbortError");
          if (result.status === "success") {
            onProgress?.(100);
            resolve({ fileUrl: result.fileUrl, fileId: result.fileId, fileName });
          } else {
            reject(new Error(result.message || "Upload failed"));
          }
        })
        .catch((error) => {
          signal?.removeEventListener("abort", onAbort);
          cleanup();
          reject(error);
        });
    });
  };

  // ✅ FINALIZE SUBMISSION
  // Takes files that have ALREADY been uploaded to Drive in the background
  // (via uploadFileToDrive) and creates the corresponding "materials"
  // records in Firestore, then fires the admin email alert + success toast.
  // This is effectively the second half of what startGlobalUpload used to
  // do in one shot, split out so it can run after background uploads finish.
  const finalizeMaterialsSubmission = async (uploadedFiles, metadata, userName, userEmail) => {
    let successCount = 0;

    for (const uploaded of uploadedFiles) {
      try {
        await addDoc(collection(db, "materials"), {
          title: metadata.title,
          semId: metadata.semester,
          subjectId: metadata.subject,
          type: metadata.type,
          link: uploaded.fileUrl,
          fileId: uploaded.fileId,
          fileName: uploaded.fileName,
          status: "Pending",
          uploadedBy: userName,
          uploadedByEmail: userEmail,
          date: new Date().toISOString(),
          createdAt: serverTimestamp()
        });
        successCount++;
      } catch (error) {
        console.error("Error saving material record:", error);
        toast.error(`Failed to save ${uploaded.fileName || "a file"}`);
      }
    }

    if (successCount > 0) {
      const emailAccessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;
      const subName = subjects.find(s => String(s.id) === String(metadata.subject))?.name || `Sub-${metadata.subject}`;

      if (emailAccessKey) {
        try {
          const emailMessage = `A new student just uploaded materials to the Study Hub!\n\n👤 Student Name: ${userName || 'Student'}\n📧 Email: ${userEmail || 'No Email'}\n📚 Subject: ${subName || 'Unknown'}\n📁 Files Uploaded: ${successCount} document(s)\n\nPlease log in to the Admin Dashboard to Review and Approve.`;

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
      } else {
        console.warn('VITE_WEB3FORMS_ACCESS_KEY is not set; admin email alert skipped.');
      }

      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-in fade-in slide-in-from-top-4' : 'animate-out fade-out slide-out-to-right-8'} max-w-sm w-full glass-card bg-[#0c0c0e]/90 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl pointer-events-auto flex relative overflow-hidden transition-all`}>
          <div className="absolute top-0 left-0 w-1 bg-[#FFD700] h-full shadow-[0_0_15px_#FFD700]"></div>

          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div className="bg-[#FFD700]/20 p-2 rounded-full">
                  <CheckCircle className="h-5 w-5 text-[#FFD700]" />
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-bold text-white tracking-tight">Upload Successful!</p>
                <p className="mt-1 text-[11px] text-white/50 leading-relaxed">
                  {successCount} files are now pending for admin review.
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-white/10">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ), { duration: 5000 });
    }

    return { success: successCount > 0, successCount };
  };

  const startGlobalUpload = async (filesToUpload, metadata, userName, userEmail) => {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzc1QTM0qx8OPGs16QRXbtEevBgik4pceDjLpKKS98f8DBD7A8yszDjmibQb7cTQBs8tQ/exec";
    const emailAccessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;
    let successCount = 0;

    setGlobalUploadState({ uploading: true, current: 0, total: filesToUpload.length, realProgress: 0 });

    const semName = semesters.find(s => String(s.id) === String(metadata.semester))?.name || `Sem-${metadata.semester}`;
    const subName = subjects.find(s => String(s.id) === String(metadata.subject))?.name || `Sub-${metadata.subject}`;

    const cleanPart = (value) => (value || "")
      .toString()
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ");

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      let progressInterval;

      try {
        const extension = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
        let customFileName = `${cleanPart(userName)}-${cleanPart(semName)}-${cleanPart(subName)}-${cleanPart(metadata.title)}`;
        if (filesToUpload.length > 1) customFileName += `-(Part ${i + 1})`;
        customFileName += extension;

        progressInterval = setInterval(() => {
          setGlobalUploadState(prev => {
            const fileStart = (i * 100) / filesToUpload.length;
            const currentFileProgress = (prev.realProgress - fileStart) * filesToUpload.length;
            let increment = 0;
            if (currentFileProgress < 40) increment = 4.0;
            else if (currentFileProgress < 75) increment = 2.0;
            else if (currentFileProgress < 90) increment = 0.5;
            else if (currentFileProgress < 99) increment = 0.1;

            return { ...prev, realProgress: prev.realProgress + (increment / filesToUpload.length) };
          });
        }, 100);

        const base64Data = await toBase64(file);
        const response = await fetch(SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({ base64: base64Data, name: customFileName, mimeType: file.type })
        });

        const result = await response.json();
        if (progressInterval) clearInterval(progressInterval);

        if (result.status === "success") {
          await addDoc(collection(db, "materials"), {
            title: metadata.title,
            semId: metadata.semester,
            subjectId: metadata.subject,
            type: metadata.type,
            link: result.fileUrl,
            fileId: result.fileId,
            fileName: customFileName,
            status: "Pending",
            uploadedBy: userName,
            uploadedByEmail: userEmail,
            date: new Date().toISOString(),
            createdAt: serverTimestamp()
          });

          successCount++;
          setGlobalUploadState(prev => ({
            ...prev,
            current: successCount,
            realProgress: (successCount * 100) / filesToUpload.length
          }));
        } else {
          toast.error(`Failed to upload ${customFileName}`);
        }
      } catch (error) {
        if (progressInterval) clearInterval(progressInterval);
        console.error("Upload Crash Log:", error);
        toast.error(`Error uploading ${file.name}`);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    setGlobalUploadState({ uploading: false, current: 0, total: 0, realProgress: 0 });

    if (successCount > 0) {
      if (emailAccessKey) {
        try {
          const emailMessage = `A new student just uploaded materials to the Study Hub!\n\n👤 Student Name: ${userName || 'Student'}\n📧 Email: ${userEmail || 'No Email'}\n📚 Subject: ${subName || 'Unknown'}\n📁 Files Uploaded: ${successCount} document(s)\n\nPlease log in to the Admin Dashboard to Review and Approve.`;

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
      } else {
        console.warn('VITE_WEB3FORMS_ACCESS_KEY is not set; admin email alert skipped.');
      }

      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-in fade-in slide-in-from-top-4' : 'animate-out fade-out slide-out-to-right-8'} max-w-sm w-full glass-card bg-[#0c0c0e]/90 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl pointer-events-auto flex relative overflow-hidden transition-all`}>
          <div className="absolute top-0 left-0 w-1 bg-[#FFD700] h-full shadow-[0_0_15px_#FFD700]"></div>

          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div className="bg-[#FFD700]/20 p-2 rounded-full">
                  <CheckCircle className="h-5 w-5 text-[#FFD700]" />
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-bold text-white tracking-tight">Upload Successful!</p>
                <p className="mt-1 text-[11px] text-white/50 leading-relaxed">
                  {successCount} files are now pending for admin review.
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-white/10">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ), { duration: 5000 });
    }

    return { success: successCount > 0, successCount };
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
      await updateDoc(materialRef, { views: increment(1) });
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
    // Global Upload Engine
    globalUploadState,
    uploadFormData,
    setUploadFormData,
    startGlobalUpload,
    uploadFileToDrive,
    finalizeMaterialsSubmission
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;