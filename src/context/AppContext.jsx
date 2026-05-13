import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db, auth, googleProvider } from '../firebase';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, getDoc, Timestamp, setDoc, query, orderBy, where, arrayUnion, arrayRemove } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { toast } from 'react-hot-toast';

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
  
  // Loading state
  const [loading, setLoading] = useState(true);
  
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

  // 🌟 NAYA GLOBAL UPLOAD ENGINE 🌟
  const [globalUploadState, setGlobalUploadState] = useState({ uploading: false, current: 0, total: 0, realProgress: 0 });
  
  // 🌟 GLOBAL UPLOAD FORM MEMORY (prevents form clearing on navigation)
  const [uploadFormData, setUploadFormData] = useState({ title: "", semester: "", subject: "", type: "Notes", files: [] });
  
  // Real-time listeners for materials and subjects
  useEffect(() => {
    let materialsLoaded = false;
    let subjectsLoaded = false;
    
    const unsubscribeMaterials = onSnapshot(
      query(collection(db, "materials"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const materialsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMaterials(materialsList);
        materialsLoaded = true;
        // Set loading to false after both data loads complete
        if (materialsLoaded && subjectsLoaded && loading) {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error listening to materials: ", error);
        materialsLoaded = true;
        // Still set loading to false even if there's an error
        if (materialsLoaded && subjectsLoaded && loading) {
          setLoading(false);
        }
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
        subjectsLoaded = true;
        // Set loading to false after both data loads complete
        if (materialsLoaded && subjectsLoaded && loading) {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error listening to subjects: ", error);
        subjectsLoaded = true;
        // Still set loading to false even if there's an error
        if (materialsLoaded && subjectsLoaded && loading) {
          setLoading(false);
        }
      }
    );
    
    return () => {
      unsubscribeMaterials();
      unsubscribeSubjects();
    };
  }, [loading]);
  
  // Real-time listener for users
  useEffect(() => {
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
  }, []);
  
  // Authentication listener with user sync and ban flag
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Create a listener on the user's Firestore document
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            // Merge Firebase Auth data with Firestore data (including favorites, role, etc)
            setUser({ ...firebaseUser, ...userData, id: firebaseUser.uid });
            setUserRole(userData.role || "student");
          } else {
            // Create user document if it doesn't exist
            setDoc(userDocRef, {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              role: "student", // Default role
              isBanned: false, // Default to not banned
              favorites: [], // Initialize empty favorites array
              createdAt: new Date()
            });
            setUser({ ...firebaseUser, id: firebaseUser.uid });
            setUserRole("student");
          }
          setLoading(false);
        });

        // Cleanup doc listener when auth state changes
        return () => unsubscribeDoc();
      } else {
        setUser(null);
        setUserRole(null);
        setLoading(false);
      }
    });
    
    return () => unsubscribeAuth();
  }, []);
  
  // Real-time role listener for current user
  useEffect(() => {
    if (!user?.uid) return;
    
    const userDocRef = doc(db, "users", user.uid);
    const unsubscribeRole = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setUserRole(userData.role || "student");
        // Also update the users array for consistency
        setUsers(prevUsers => 
          prevUsers.map(u => u.uid === user.uid ? {...u, role: userData.role} : u)
        );
      }
    }, (error) => {
      console.error("Error listening to user role: ", error);
    });
    
    return () => unsubscribeRole();
  }, [user?.uid]);
  
  // RBAC - Role-Based Access Control
  const CREATOR_EMAILS = ["rishiuttamsahu@gmail.com", "piyushgupta122006@gmail.com"];
  const isAdmin = CREATOR_EMAILS.includes(user?.email) || userRole === "admin";
  
  // Derived state - Calculate statistics dynamically
  const stats = useMemo(() => {
    const approvedMaterials = materials.filter(m => m.status === 'Approved');
    const pendingMaterials = materials.filter(m => m.status === 'Pending');
    
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

  // Authentication functions
  const login = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Save Google OAuth access token for Drive Picker
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        sessionStorage.setItem('google_access_token', credential.accessToken);
      }
      
      // Force immediate state update for snappy UI
      setUser(result.user);
      
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  // Function to silently refresh Google Drive token
  const refreshDriveToken = async () => {
    try {
      if (!auth.currentUser) {
        return { success: false, error: "No authenticated user" };
      }
      
      // Force token refresh by getting current user
      await auth.currentUser.getIdToken(true);
      
      // Sign in again to get fresh Google credentials
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (credential?.accessToken) {
        sessionStorage.setItem('google_access_token', credential.accessToken);
        return { success: true, token: credential.accessToken };
      }
      
      return { success: false, error: "Failed to get new access token" };
    } catch (error) {
      console.error('Token refresh error:', error);
      return { success: false, error: error.message };
    }
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

  const startGlobalUpload = async (filesToUpload, metadata, userName, userEmail) => {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzc1QTM0qx8OPGs16QRXbtEevBgik4pceDjLpKKS98f8DBD7A8yszDjmibQb7cTQBs8tQ/exec";
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

    setTimeout(() => {
      setGlobalUploadState({ uploading: false, current: 0, total: 0, realProgress: 0 });

      if (successCount > 0) {
        // Reset the global form ONLY when upload succeeded
        setUploadFormData({ title: "", semester: "", subject: "", type: "Notes", files: [] });

        toast.success("Upload Complete! Sent for admin approval.", {
          icon: '✅',
          style: { background: '#0a0a0a', color: '#fff', border: '1px solid #FFD700' }
        });
      }
    }, 1000);
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
      const materialSnap = await getDoc(materialRef);
      
      if (materialSnap.exists()) {
        const currentViews = materialSnap.data().views || 0;
        await updateDoc(materialRef, { views: currentViews + 1 });
        return { success: true };
      } else {
        return { success: false, error: "Material not found" };
      }
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
    stats,
    loading,
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
    startGlobalUpload
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
