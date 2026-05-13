import { BarChart2, Book, CheckCircle, Clock, Code, Crown, Download, Edit3, Eye, FileText, Flag, Pen, Pencil, Plus, Search, Settings, Shield, Star, Trash2, Upload, User, XCircle, AlertTriangle, Users, Send, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import { useApp } from "../context/AppContext";
import AdminReports from "../components/admin/AdminReports";
import { doc, updateDoc, deleteDoc, writeBatch, collection, getDocs, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";

const tabs = [
  { id: "analytics", label: "Analytics", icon: <BarChart2 size={16} /> },
  { id: "subjects", label: "Subjects", icon: <Book size={16} /> },
  { id: "materials", label: "Materials", icon: <FileText size={16} /> },
  { id: "reports", label: "Reports", icon: <Flag size={16} /> },
  { id: "users", label: "Users", icon: <User size={16} /> },
  { id: "settings", label: "Settings", icon: <Settings size={16} /> },
];

// Super Admin email - protected from all actions
const CREATOR_EMAILS = ["rishiuttamsahu@gmail.com", "piyushgupta122006@gmail.com"];

// 🚨 UPDATE THIS IN ADMIN.JSX, LIBRARY.JSX, AND UPLOAD.JSX
// Yahan humne 'emptyMessage' prop add kiya hai
const CustomSelect = ({ value, onChange, options, placeholder, emptyMessage = "No options available" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  return (
    <div className={`relative w-full ${isOpen ? 'z-[9999]' : 'z-10'}`} ref={dropdownRef}>
      <div
        className="w-full glass-card px-4 py-2.5 rounded-2xl border border-white/10 bg-white/5 text-white hover:border-[#FFD700]/50 cursor-pointer flex justify-between items-center transition-all duration-300"
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* 🚨 Added 'truncate' and 'mr-2' so text never pushes the icon out */}
        <span className={`truncate mr-2 ${!selectedOption ? "text-white/40 text-sm" : "text-sm font-medium"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {/* 🚨 Added 'flex-shrink-0' so icon stays perfect */}
        <svg className={`flex-shrink-0 transition-transform duration-300 text-white/40 ${isOpen ? 'rotate-180 text-[#FFD700]' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && (
        /* 🚨 Update dropdown div width property */
        <div className="absolute left-0 z-[100] min-w-full w-max max-w-[90vw] mt-2 py-2 bg-[#0c0c0e] border border-white/10 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {options && options.length > 0 ? (
              options.map((opt) => (
                <div
                  key={opt.value}
                  title={opt.label}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  // 🚨 Added 'w-full' and 'relative'
                  className={`px-4 py-2.5 cursor-pointer transition-all text-sm relative flex items-center ${
                    String(value) === String(opt.value) 
                      ? 'bg-[#FFD700]/15 text-[#FFD700] font-bold' 
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {/* 🚨 Added 'whitespace-nowrap' and 'block' to force single line */}
                  <span className="block whitespace-nowrap pr-6">
                    {opt.label}
                  </span>
                  
                  {/* 🚨 Checkmark Icon - Positioned absolute so it doesn't push text */}
                  {String(value) === String(opt.value) && (
                    <svg 
                      width="14" 
                      height="14" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="3" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="absolute right-4 top-1/2 -translate-y-1/2 flex-shrink-0"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-zinc-500 italic text-center cursor-not-allowed">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function Admin() {
  // 1. App Context & Navigation
  const navigate = useNavigate();
  const { 
    semesters, subjects, materials, users, stats, user, loading,
    approveMaterial, rejectMaterial, deleteMaterial,
    addSubject, getSemesterById, getSubjectById,
    getPendingMaterials, getApprovedMaterials, getSubjectsBySemester
  } = useApp();

  // 2. All Main States
  const [activeTab, setActiveTab] = useState("analytics");
  const [materialFilter, setMaterialFilter] = useState("Pending"); 
  const [selectedPending, setSelectedPending] = useState([]);
  const [showAddSubjectForm, setShowAddSubjectForm] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [itemToReject, setItemToReject] = useState(null);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [showReportDot, setShowReportDot] = useState(false);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterSem, setFilterSem] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");
  
  // Google Drive API State for Edit Modal
  const [isGoogleApiLoaded, setIsGoogleApiLoaded] = useState(false);
  
  // Form States
  const [newSubject, setNewSubject] = useState({ name: "", semesterId: "1", icon: "Book" });
  const [editForm, setEditForm] = useState({ title: "", subjectId: "", type: "Notes", link: "" });
  
  // Analytics & Notifications States
  const [todayVisitors, setTodayVisitors] = useState(0);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [sentNotifications, setSentNotifications] = useState([]);
  const [isSending, setIsSending] = useState(false);

  // 🌟 BULK ACTIONS LOGIC 🌟
  const togglePendingSelection = (id) => {
    setSelectedPending(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const toggleAllPending = (e) => {
    if (e.target.checked) {
      setSelectedPending(getPendingMaterials().map(m => m.id));
    } else {
      setSelectedPending([]);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedPending.length === 0) return;
    const selectedCount = selectedPending.length;
    const loadingToast = toast.loading(`Approving ${selectedPending.length} materials...`);
    try {
      for (const id of selectedPending) {
        await approveMaterial(id);
      }
      toast.dismiss(loadingToast);
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-in fade-in slide-in-from-top-4' : 'animate-out fade-out slide-out-to-right-8'} max-w-sm w-full glass-card bg-[#0c0c0e] border border-white/10 shadow-2xl rounded-2xl pointer-events-auto flex relative overflow-hidden transition-all`}>
          <div className="absolute top-0 left-0 w-1 bg-emerald-500 h-full shadow-[0_0_10px_#10b981]"></div>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5"><CheckCircle className="h-6 w-6 text-emerald-500" /></div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-bold text-white">Bulk Approved!</p>
                <p className="mt-1 text-[11px] text-white/50">{selectedCount} materials published to library.</p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-white/10">
            <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors"><XCircle size={18} /></button>
          </div>
        </div>
      ), { duration: 5000 });
      setSelectedPending([]);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error approving some materials");
    }
  };

  const handleBulkReject = async () => {
    if (selectedPending.length === 0) return;
    const selectedCount = selectedPending.length;
    if (!window.confirm(`Are you sure you want to REJECT and DELETE ${selectedPending.length} materials?`)) return;

    const loadingToast = toast.loading(`Rejecting ${selectedPending.length} materials...`);
    try {
      for (const id of selectedPending) {
        await rejectMaterial(id);
      }
      toast.dismiss(loadingToast);
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-in fade-in slide-in-from-top-4' : 'animate-out fade-out slide-out-to-right-8'} max-w-sm w-full glass-card bg-[#0c0c0e] border border-white/10 shadow-2xl rounded-2xl pointer-events-auto flex relative overflow-hidden transition-all`}>
          <div className="absolute top-0 left-0 w-1 bg-rose-500 h-full shadow-[0_0_10px_#f43f5e]"></div>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5"><XCircle className="h-6 w-6 text-rose-500" /></div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-bold text-white">Materials Rejected</p>
                <p className="mt-1 text-[11px] text-white/50">{selectedCount} materials have been deleted.</p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-white/10">
            <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors"><XCircle size={18} /></button>
          </div>
        </div>
      ), { duration: 5000 });
      setSelectedPending([]);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error rejecting some materials");
    }
  };

  // 3. Infinite Scroll Hooks
  const [visibleMaterialsCount, setVisibleMaterialsCount] = useState(15);
  const materialsObserver = useRef();
  const lastMaterialRef = useCallback((node) => {
    if (materialsObserver.current) materialsObserver.current.disconnect();
    materialsObserver.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleMaterialsCount((prev) => prev + 15);
      }
    });
    if (node) materialsObserver.current.observe(node);
  }, []);

  // Split Users Observer for Desktop and Mobile
  const [visibleUsersCount, setVisibleUsersCount] = useState(15);
  
  const desktopObserver = useRef();
  const mobileObserver = useRef();

  const desktopUserRef = useCallback((node) => {
    if (desktopObserver.current) desktopObserver.current.disconnect();
    desktopObserver.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleUsersCount((prev) => prev + 15);
    });
    if (node) desktopObserver.current.observe(node);
  }, []);

  const mobileUserRef = useCallback((node) => {
    if (mobileObserver.current) mobileObserver.current.disconnect();
    mobileObserver.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleUsersCount((prev) => prev + 15);
    });
    if (node) mobileObserver.current.observe(node);
  }, []);

  // 4. UseEffects
  useEffect(() => {
    const q = query(collection(db, 'reports'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const unresolved = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.status !== 'resolved';
      }).length;
      setUnresolvedCount(unresolved);
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (unresolvedCount > 0) setShowReportDot(true);
  }, [unresolvedCount]);
  
  useEffect(() => {
    if (activeTab === 'reports') {
      setShowReportDot(false);
      localStorage.setItem('lastCheckedReports', Date.now());
    }
  }, [activeTab]);

  useEffect(() => {
    if (materialFilter !== "Pending") {
      setSelectedPending([]);
    }
  }, [materialFilter]);
  
  useEffect(() => {
    setVisibleMaterialsCount(15);
  }, [searchQuery, filterSubject, filterType, filterSem]);
  
  useEffect(() => {
    setVisibleUsersCount(15);
  }, [userSearchTerm]);

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSentNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    const statRef = doc(db, 'analytics', today);
    const unsubscribe = onSnapshot(statRef, (docSnap) => {
      if (docSnap.exists()) {
        setTodayVisitors(docSnap.data().visitors || 0);
      } else {
        setTodayVisitors(0);
      }
    });
    return () => unsubscribe();
  }, []);

  // Dynamically load Google scripts on mount
  useEffect(() => {
    const loadGapi = () => new Promise(res => {
      if (window.gapi) { 
        window.gapi.load('picker');
        res(); 
        return; 
      }
      const s = document.createElement("script");
      s.src = "https://apis.google.com/js/api.js";
      s.async = true;
      s.defer = true;
      s.onload = () => {
        window.gapi.load('picker');
        res();
      };
      document.head.appendChild(s);
    });
    
    const loadGis = () => new Promise(res => {
      if (window.google?.accounts?.oauth2) { res(); return; }
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = res;
      document.head.appendChild(s);
    });
    
    Promise.all([loadGapi(), loadGis()]).then(() => {
      setTimeout(() => {
        setIsGoogleApiLoaded(true);
      }, 100);
    });
  }, []);

  // 5. Loading State Check
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFD700] mx-auto mb-4"></div>
          <h2 className="text-xl mb-2">Loading Admin Dashboard...</h2>
          <p className="text-white/55">Please wait while we fetch the data.</p>
        </div>
      </div>
    );
  }

  // 6. Data Calculations
  const uniqueUsers = (users || []).filter((u, index, self) =>
    index === self.findIndex((t) => (t.id === u.id || t.email === u.email))
  );

  const filteredUsers = uniqueUsers
    .filter(u => 
      u.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.name?.toLowerCase().includes(userSearchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Get timestamp from Firestore createdAt or fallback to Auth creationTime
      const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt || Date.parse(a.metadata?.creationTime) || 0);
      const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt || Date.parse(b.metadata?.creationTime) || 0);
      
      return timeB - timeA; // Newest first
    });
  
  const validMaterials = (materials || []).filter(m => m?.status === 'Approved' || m?.status === 'Pending');
  
  const safeStats = {
    totalViews: ((materials || []).filter(m => m?.status === 'Approved') || []).reduce((sum, m) => sum + (m?.views || 0), 0),
    totalDownloads: ((materials || []).filter(m => m?.status === 'Approved') || []).reduce((sum, m) => sum + (m?.downloads || 0), 0),
    pendingRequests: ((materials || []).filter(m => m?.status === 'Pending') || []).length,
    totalMaterials: validMaterials.length,
    approvedMaterials: ((materials || []).filter(m => m?.status === 'Approved') || []).length,
    totalSubjects: (subjects || []).length,
    totalSemesters: (semesters || []).length
  };
  
  // 🚨 100% WORKING FILTER LOGIC 🚨
  let filteredSubjectsForDropdown = [];
  
  if (filterSem === "All") {
    // Agar "All Sem" select kiya hai, toh saare subjects dikhao
    filteredSubjectsForDropdown = subjects || []; 
  } else {
    // Agar koi specific semester select kiya hai, toh AppContext wala function use karo
    filteredSubjectsForDropdown = getSubjectsBySemester?.(filterSem) || [];
  }

  // Semester change hone par subject ko wapas "All" pe lana zaroori hai
  useEffect(() => {
    setFilterSubject("All");
  }, [filterSem]);
  
  const filteredMaterials = getApprovedMaterials()
    .filter(material => {
      if (searchQuery && !material.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterSem !== "All" && material.semId !== filterSem) return false;
      if (filterType !== "All" && material.type !== filterType) return false;
      if (filterSubject !== "All" && material.subjectId !== filterSubject) return false;
      return true;
    })
    .sort((a, b) => {
      // Date conversion logic: Firestore Timestamp ya normal date ko handle karne ke liye
      const getTime = (date) => {
        if (!date) return 0;
        if (date.seconds) return date.seconds * 1000; // Firestore Timestamp
        return new Date(date).getTime() || 0; // Normal Date string/object
      };

      const dateA = getTime(a.createdAt || a.date);
      const dateB = getTime(b.createdAt || b.date);

      if (sortOrder === "newest") return dateB - dateA;
      if (sortOrder === "oldest") return dateA - dateB;
      if (sortOrder === "az") return (a.title || "").localeCompare(b.title || "");
      return 0;
    });

  const formatNumber = (num) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  // 7. Event Handlers
  const handleDeleteGlobal = async (id) => {
    if(window.confirm("Delete this notification for everyone?")) {
      await deleteDoc(doc(db, 'notifications', id));
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (newSubject.name.trim()) {
      const result = await addSubject(newSubject.name, newSubject.semesterId, "Book");
      if (result.success) {
        setNewSubject({ name: "", semesterId: "1", icon: "Book" });
        setShowAddSubjectForm(false);
        toast.success("Subject added successfully!");
      } else {
        toast.error(`Error adding subject: ${result.error}`);
      }
    }
  };
  
  const deleteSubject = async (id) => {
    const result = await Swal.fire({
      titleHtml: '<div class="text-sm font-bold">Delete Subject?</div>',
      text: "This action cannot be undone.",
      icon: undefined,
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "No",
      buttonsStyling: false,
      background: "#121212",
      color: "#FFFFFF",
      width: "280px",
      padding: "0.8rem",
      customClass: {
        popup: "border border-[#4e4d4d] rounded-[15px] grid",
        title: "text-sm font-bold",
        content: "text-xs",
        actions: "flex justify-center gap-2 mt-2",
        confirmButton: "bg-[#ef4444] hover:bg-[#dc2626] px-4 py-1.5 rounded-xl text-xs font-medium text-white",
        cancelButton: "bg-[#2a2a2a] hover:bg-[#3a3a3a] px-4 py-1.5 rounded-xl text-xs font-medium text-white"
      }
    });
    if (!result.isConfirmed) return;
    try {
      await deleteDoc(doc(db, "subjects", id));
      toast.success("Subject deleted successfully!");
    } catch (error) {
      toast.error("Error deleting subject: " + error.message);
    }
  };
  
  const promoteUser = async (userId, userEmail) => {
    if (CREATOR_EMAILS.includes(userEmail)) {
      toast.error("Action denied: Super Admin cannot be modified.");
      return;
    }
    const result = await Swal.fire({
      title: 'Promote to Admin?',
      text: "This user will gain admin privileges.",
      showCancelButton: true,
      confirmButtonText: "Yes, Promote",
      cancelButtonText: "Cancel",
      buttonsStyling: false,
      background: "#121212",
      color: "#FFFFFF",
      width: "280px",
      padding: "0.8rem",
      customClass: {
        popup: "border border-[#4e4d4d] rounded-[15px] shadow-2xl",
        title: "text-sm font-bold pt-2",
        htmlContainer: "text-[10px] text-gray-400 opacity-80",
        actions: "flex justify-center gap-3 mt-4 mb-2",
        confirmButton: "bg-purple-500 hover:bg-purple-600 px-5 py-2 rounded-[10px] text-[11px] font-bold text-white",
        cancelButton: "bg-[#2a2a2a] hover:bg-[#3a3a3a] px-5 py-2 rounded-[10px] text-[11px] font-bold text-white"
      }
    });
    if (result.isConfirmed) {
      try {
        await updateDoc(doc(db, "users", userId), { role: "admin" });
        toast.success("User promoted to admin successfully!");
      } catch (error) {
        toast.error("Error promoting user: " + error.message);
      }
    }
  };
  
  const demoteUser = async (userId, userEmail) => {
    if (CREATOR_EMAILS.includes(userEmail)) {
      toast.error("Action denied: Super Admin cannot be modified.");
      return;
    }
    const result = await Swal.fire({
      title: 'Demote to Student?',
      text: "This user will lose admin privileges.",
      showCancelButton: true,
      confirmButtonText: "Yes, Demote",
      cancelButtonText: "Cancel",
      buttonsStyling: false,
      background: "#121212",
      color: "#FFFFFF",
      width: "280px",
      padding: "0.8rem",
      customClass: {
        popup: "border border-[#4e4d4d] rounded-[15px] shadow-2xl",
        title: "text-sm font-bold pt-2",
        htmlContainer: "text-[10px] text-gray-400 opacity-80",
        actions: "flex justify-center gap-3 mt-4 mb-2",
        confirmButton: "bg-amber-500 hover:bg-amber-600 px-5 py-2 rounded-[10px] text-[11px] font-bold text-white",
        cancelButton: "bg-[#2a2a2a] hover:bg-[#3a3a3a] px-5 py-2 rounded-[10px] text-[11px] font-bold text-white"
      }
    });
    if (result.isConfirmed) {
      try {
        await updateDoc(doc(db, "users", userId), { role: "student" });
        toast.success("User demoted to student successfully!");
      } catch (error) {
        toast.error("Error demoting user: " + error.message);
      }
    }
  };
  
  const handleToggleBan = async (user) => {
    if (CREATOR_EMAILS.includes(user.email)) {
      toast.error("Action denied: Super Admin cannot be modified.");
      return;
    }
    const isCurrentlyBanned = user.isBanned || false;
    const action = isCurrentlyBanned ? "Unban" : "Ban";
    const confirmText = isCurrentlyBanned 
      ? "This user will be unbanned and regain access." 
      : "This user will be banned from the platform.";
    
    const result = await Swal.fire({
      title: `${action} User?`,
      text: confirmText,
      showCancelButton: true,
      confirmButtonText: `Yes, ${action}`,
      cancelButtonText: "Cancel",
      buttonsStyling: false,
      background: "#121212",
      color: "#FFFFFF",
      width: "280px",
      padding: "0.8rem",
      customClass: {
        popup: "border border-[#4e4d4d] rounded-[15px] shadow-2xl",
        title: "text-sm font-bold pt-2",
        htmlContainer: "text-[10px] text-gray-400 opacity-80",
        actions: "flex justify-center gap-3 mt-4 mb-2",
        confirmButton: isCurrentlyBanned 
          ? "bg-emerald-500 hover:bg-emerald-600 px-5 py-2 rounded-[10px] text-[11px] font-bold text-white"
          : "bg-rose-500 hover:bg-rose-600 px-5 py-2 rounded-[10px] text-[11px] font-bold text-white",
        cancelButton: "bg-[#2a2a2a] hover:bg-[#3a3a3a] px-5 py-2 rounded-[10px] text-[11px] font-bold text-white"
      }
    });
    if (result.isConfirmed) {
      try {
        await updateDoc(doc(db, "users", user.id), { isBanned: !isCurrentlyBanned });
        toast.success(`User ${isCurrentlyBanned ? "unbanned" : "banned"} successfully!`);
      } catch (error) {
        toast.error(`Error ${action.toLowerCase()}ing user: ` + error.message);
      }
    }
  };
  
  const handleUnban = async (userId, userEmail) => {
    if (CREATOR_EMAILS.includes(userEmail)) {
      toast.error("Action denied: Super Admin cannot be modified.");
      return;
    }
    const result = await Swal.fire({
      title: 'Unban User?',
      text: "This user will be unbanned and regain access.",
      showCancelButton: true,
      confirmButtonText: "Yes, Unban",
      cancelButtonText: "Cancel",
      buttonsStyling: false,
      background: "#121212",
      color: "#FFFFFF",
      width: "280px",
      padding: "0.8rem",
      customClass: {
        popup: "border border-[#4e4d4d] rounded-[15px] shadow-2xl",
        title: "text-sm font-bold pt-2",
        htmlContainer: "text-[10px] text-gray-400 opacity-80",
        actions: "flex justify-center gap-3 mt-4 mb-2",
        confirmButton: "bg-emerald-500 hover:bg-emerald-600 px-5 py-2 rounded-[10px] text-[11px] font-bold text-white",
        cancelButton: "bg-[#2a2a2a] hover:bg-[#3a3a3a] px-5 py-2 rounded-[10px] text-[11px] font-bold text-white"
      }
    });
    if (result.isConfirmed) {
      try {
        await updateDoc(doc(db, "users", userId), { isBanned: false });
        toast.success("User unbanned successfully!");
      } catch (error) {
        toast.error("Error unbanning user: " + error.message);
      }
    }
  };
  
  const handleEditClick = (material) => {
    setEditingMaterial(material);
    setEditForm({
      title: material.title,
      subjectId: material.subjectId,
      type: material.type,
      link: material.link
    });
  };
  
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "materials", editingMaterial.id), {
        title: editForm.title,
        subjectId: editForm.subjectId,
        type: editForm.type,
        link: editForm.link
      });
      toast.success("Material updated successfully!");
      setEditingMaterial(null);
      setEditForm({ title: "", subjectId: "", type: "Notes", link: "" });
    } catch (error) {
      toast.error("Error updating material: " + error.message);
    }
  };
  
  const handleEditSubjectClick = (subject) => {
    setEditingSubject(subject);
    setEditSubjectName(subject.name);
  };
  
  const handleUpdateSubject = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "subjects", editingSubject.id), {
        name: editSubjectName
      });
      toast.success("Subject Updated!");
      setEditingSubject(null);
      setEditSubjectName("");
    } catch (error) {
      toast.error("Error updating subject: " + error.message);
    }
  };

  const executeReset = async () => {
    try {
      setShowResetModal(false);
      const loadingToast = toast.loading("Resetting all analytics...");
      const materialsSnapshot = await getDocs(collection(db, "materials"));
      const batch = writeBatch(db);
      materialsSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { views: 0, downloads: 0, downloadedBy: [] });
      });
      await batch.commit();
      toast.dismiss(loadingToast);
      toast.success("All analytics have been reset.");
    } catch (error) {
      toast.error("Error resetting analytics: " + error.message);
    }
  };

  const handleResetAnalytics = () => {
    setShowResetModal(true);
  };

  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast.error("Please fill in both title and message");
      return;
    }
    setIsSending(true);
    try {
      const notificationData = {
        targetEmail: notificationEmail.trim() || 'ALL',
        title: notificationTitle.trim(),
        message: notificationMessage.trim(),
        createdAt: serverTimestamp(),
        readBy: []
      };
      await addDoc(collection(db, "notifications"), notificationData);
      toast.success("Notification sent successfully!");
      setNotificationEmail("");
      setNotificationTitle("");
      setNotificationMessage("");
    } catch (error) {
      toast.error("Error sending notification: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  // Google Drive Picker Logic for Edit Modal
  const openDrivePicker = () => {
    const userEmail = auth.currentUser?.email;
    if (!userEmail) {
      toast.error("Please sign in first.");
      return;
    }

    if (!window.google || !window.google.picker) {
      toast.error("Google Drive interface is still loading. Please try again in a few seconds.");
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      login_hint: userEmail,
      callback: (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          showPicker(tokenResponse.access_token);
        } else {
          toast.error("Failed to get access token. Please try again.");
        }
      },
    });
    client.requestAccessToken({ prompt: "" });
  };

  const showPicker = (accessToken) => {
    const picker = new window.google.picker.PickerBuilder()
      .addView(window.google.picker.ViewId.DOCS)
      .setOAuthToken(accessToken)
      .setDeveloperKey(import.meta.env.VITE_GOOGLE_API_KEY)
      .setOrigin(window.location.protocol + '//' + window.location.host)
      .setCallback((data) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const file = data.docs[0];
          const driveLink = `https://drive.google.com/file/d/${file.id}/view?usp=sharing`;
          // Edit form mein automatically naya link set kar dega
          setEditForm((prev) => ({ ...prev, link: driveLink }));
          toast.success(`✅ File selected: ${file.name}`);
        }
      })
      .build();
    picker.setVisible(true);
  };

  return (
    <>
      <div className="p-5 pt-8 max-w-4xl mx-auto bg-[#0a0a0a]/50 backdrop-blur-sm rounded-xl">
        {/* Header */}
        <div className="mb-6 md:mb-8 text-center">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-white/55 text-xs md:text-sm mt-1 md:mt-2">
            Manage all aspects of BNN CS Study Hub
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="glass-card p-2 mb-6 md:mb-8 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 md:gap-2 min-w-max">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-2 md:gap-2 px-4 py-3 md:px-5 md:py-3 rounded-full text-sm md:text-sm font-bold transition-all whitespace-nowrap min-w-[60px] md:min-w-0 ${
                    isActive
                      ? "bg-[#FFD700] text-black shadow-lg"
                      : "bg-white/0 text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="relative">
                    {tab.icon}
                    {tab.id === 'reports' && showReportDot && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0a0a0a]"></span>
                    )}
                  </div>
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
                <div className="glass-card p-4 md:p-5">
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div className="text-white/50 text-[10px] md:text-xs uppercase tracking-wider font-bold">Total Materials</div>
                    <FileText size={16} className="text-white/70 md:w-5 md:h-5" />
                  </div>
                  <div className="text-xl md:text-2xl font-extrabold">{safeStats.totalMaterials}</div>
                </div>
                
                <div className="glass-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-white/50 text-xs uppercase tracking-wider font-bold">Total Views</div>
                    <Eye size={20} className="text-white/70" />
                  </div>
                  <div className="text-2xl font-extrabold">{formatNumber(safeStats.totalViews)}</div>
                </div>
                
                <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-center hover:border-cyan-500/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-zinc-400 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5">
                      Today's Visitors
                    </p>
                    <Users size={16} className="text-cyan-400" />
                  </div>
                  <h3 className="text-3xl font-bold text-white">{todayVisitors}</h3>
                </div>
                
                <div className="glass-card p-5 border border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-amber-400 text-xs uppercase tracking-wider font-bold">Pending Requests</div>
                    <Clock size={20} className="text-amber-400" />
                  </div>
                  <div className="text-2xl font-extrabold text-amber-300">{safeStats.pendingRequests}</div>
                </div>
              </div>
              
              <div className="glass-card p-4 md:p-6">
                <h3 className="font-bold text-base md:text-lg mb-3 md:mb-4 text-white/90">Platform Overview</h3>
                <div className="grid grid-cols-3 gap-3 md:gap-4 text-xs md:text-sm">
                  <div>
                    <div className="text-white/50 mb-1">Semesters</div>
                    <div className="font-bold">{safeStats.totalSemesters}</div>
                  </div>
                  <div>
                    <div className="text-white/50 mb-1">Subjects</div>
                    <div className="font-bold">{safeStats.totalSubjects}</div>
                  </div>
                  <div>
                    <div className="text-white/50 mb-1">Registered Users</div>
                    <div className="font-bold">{uniqueUsers.length}</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Materials Tab */}
          {activeTab === "materials" && (
            <>
              {/* 🚨 Z-INDEX FIX: Ab ye container hamesha cards ke upar rahega */}
<div className="glass-card p-4 mb-6 overflow-visible relative z-[100]">
                <div className="flex flex-wrap gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setMaterialFilter("Pending")}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                      materialFilter === "Pending"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    Pending ({getPendingMaterials().length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaterialFilter("Approved")}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                      materialFilter === "Approved"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    Approved ({getApprovedMaterials().length})
                  </button>
                </div>
                
                {materialFilter === "Approved" && (
                  <div className="space-y-4 mb-6">
                    {/* Search Input */}
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-white/50" />
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by title..."
                        className="w-full glass-card pl-10 pr-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-blue-500 focus:outline-none text-sm"
                      />
                    </div>

                    {/* Materials Tab Filters Section - Replace old grid content with this */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-[50]">
                      
                      {/* Semester Filter */}
                      <CustomSelect
                        value={filterSem}
                        onChange={setFilterSem}
                        placeholder="All Semesters"
                        options={[
                          { value: "All", label: "All Semesters" },
                          ...(semesters || []).map(sem => ({ value: sem.id, label: sem.name }))
                        ]}
                      />

                      {/* Type Filter */}
                      <CustomSelect
                        value={filterType}
                        onChange={setFilterType}
                        placeholder="All Types"
                        options={[
                          { value: "All", label: "All Types" },
                          { value: "Notes", label: "Notes" },
                          { value: "Practicals", label: "Practicals" },
                          { value: "IMP", label: "IMP" },
                          { value: "Assignment", label: "Assignment" }
                        ]}
                      />

                      {/* Subject Filter */}
                      <CustomSelect
                        value={filterSubject}
                        onChange={setFilterSubject}
                        placeholder="All Subjects"
                        options={[
                          { value: "All", label: "All Subjects" },
                          ...(filteredSubjectsForDropdown || []).map(sub => ({ value: sub.id, label: sub.name }))
                        ]}
                      />

                      {/* Sort Filter */}
                      <CustomSelect
                        value={sortOrder}
                        onChange={setSortOrder}
                        placeholder="Sort Order"
                        options={[
                          { value: "newest", label: "Newest First" },
                          { value: "oldest", label: "Oldest First" },
                          { value: "az", label: "Title A-Z" }
                        ]}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="relative space-y-4" style={{ position: 'relative', zIndex: 1 }}>
                {/* 🚨 FLOATING BULK ACTION BAR (FAB) */}
                {selectedPending.length > 0 && (
                  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="glass-card bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.9)] px-4 py-3 rounded-2xl flex items-center gap-4">
                      <div className="bg-[#FFD700]/10 px-3 py-1.5 rounded-xl border border-[#FFD700]/20 flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-[#FFD700] animate-pulse"></span>
                        <span className="text-sm font-bold text-[#FFD700] whitespace-nowrap">{selectedPending.length} Selected</span>
                      </div>
                      <div className="w-px h-6 bg-white/10 mx-1"></div>
                      <button onClick={handleBulkApprove} type="button" className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-500/20 transition-all"><CheckCircle size={16}/> Approve</button>
                      <button onClick={handleBulkReject} type="button" className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-400 rounded-xl text-sm font-bold hover:bg-rose-500/20 transition-all"><XCircle size={16}/> Reject</button>
                    </div>
                  </div>
                )}

                {/* 🚨 CUSTOM SELECT ALL BUTTON (fixed tick rendering) */}
                {materialFilter === "Pending" && getPendingMaterials().length > 0 && (
                  <div className="glass-card p-3 mb-4 flex items-center justify-between bg-white/5 border border-white/10 rounded-xl">
                     <label className="flex items-center gap-3 cursor-pointer group px-2 w-full">
                        <input type="checkbox" checked={selectedPending.length === getPendingMaterials().length} onChange={toggleAllPending} className="sr-only" />
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedPending.length === getPendingMaterials().length ? 'bg-[#FFD700] border-[#FFD700]' : 'border-white/20 group-hover:border-white/40'}`}>
                          {selectedPending.length === getPendingMaterials().length && (
                            <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          )}
                        </div>
                        <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors">Select All Pending</span>
                     </label>
                     <span className="text-xs text-white/40 font-medium px-2 whitespace-nowrap">{getPendingMaterials().length} Total</span>
                  </div>
                )}

                {materialFilter === "Pending"
                  ? getPendingMaterials().map((material) => {
                      const semester = getSemesterById(material.semId);
                      const subject = getSubjectById(material.subjectId);
                      const isSelected = selectedPending.includes(material.id);
                      
                      return (
                        <div key={material.id} className={`glass-card p-5 rounded-2xl relative transition-all duration-300 ${isSelected ? 'border-[#FFD700]/50 bg-[#FFD700]/5 shadow-[0_0_15px_rgba(255,215,0,0.05)]' : 'hover:border-white/20'}`}>
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            
                            {/* Checkbox & Details */}
                            <div className="flex-1 flex gap-4 items-start">
                              
                              {/* 🚨 INDIVIDUAL CHECKBOX (fixed tick rendering) */}
                              <label className="relative flex items-center justify-center cursor-pointer pt-1 pl-1 group">
                                <input type="checkbox" checked={isSelected} onChange={() => togglePendingSelection(material.id)} className="sr-only" />
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#FFD700] border-[#FFD700]' : 'border-white/20 group-hover:border-[#FFD700]/50'}`}>
                                  {isSelected && (
                                    <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                  )}
                                </div>
                              </label>

                              <div className="w-full">
                                <div className="flex items-start gap-3">
                                  <div className="mt-1">
                                    {material.type === 'Notes' ? <FileText className="text-blue-400" size={18} /> :
                                     material.type === 'Practicals' ? <Code className="text-green-400" size={18} /> :
                                     material.type === 'IMP' ? <Star className="text-yellow-400" size={18} /> :
                                     material.type === 'Assignment' ? <Edit3 className="text-purple-400" size={18} /> :
                                     <FileText className="text-amber-400" size={18} />}
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-white/90">{material.title}</h3>
                                    <div className="text-sm text-white/50 mt-1">
                                      {semester?.name} • {subject?.name} • {material.type}
                                    </div>
                                    <div className="text-xs text-white/40 mt-2">
                                      Uploaded by {material.uploadedBy?.split(' ')[0] || 'Admin'} • {material.date ? new Date(typeof material.date === 'object' && material.date.toDate ? material.date.toDate() : material.date).toLocaleDateString() : 'Just now'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* 🚨 ACTION BUTTONS (Approve/Reject are back) */}
                            <div className="flex flex-wrap gap-2 lg:pl-10">
                              <a href={material.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs font-bold hover:bg-white/10 hover:text-white transition-colors">
                                <Eye size={14} /> View
                              </a>
                              <button type="button" onClick={() => handleEditClick(material)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs font-bold hover:bg-white/10 hover:text-white transition-colors">
                                <Pencil size={14} /> Edit
                              </button>
                              <button type="button" onClick={() => approveMaterial(material.id)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors">
                                <CheckCircle size={14} /> Approve
                              </button>
                              <button type="button" onClick={() => setItemToReject(material.id)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition-colors">
                                <XCircle size={14} /> Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  : filteredMaterials.slice(0, visibleMaterialsCount).map((material, index) => {
                      const isLastItem = index === Math.min(visibleMaterialsCount, filteredMaterials.length) - 1;
                      const ref = isLastItem ? lastMaterialRef : null;
                      const semester = getSemesterById(material.semId);
                      const subject = getSubjectById(material.subjectId);
                      
                      return (
                        /* 🌟 NAYA PREMIUM MATERIAL CARD */
                        <div key={material.id} className="glass-card p-5 rounded-2xl hover:border-white/20 transition-all duration-300 group" ref={ref}>
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            
                            {/* Left Side: Icon & Info */}
                            <div className="flex-1">
                              <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-2xl flex-shrink-0 ${
                                  material.type === 'Notes' ? 'bg-blue-500/10 text-blue-400' :
                                  material.type === 'Practicals' ? 'bg-green-500/10 text-green-400' :
                                  material.type === 'IMP' ? 'bg-yellow-500/10 text-yellow-400' :
                                  material.type === 'Assignment' ? 'bg-purple-500/10 text-purple-400' :
                                  'bg-emerald-500/10 text-emerald-400'
                                }`}>
                                  {material.type === 'Notes' ? <FileText size={24} /> :
                                   material.type === 'Practicals' ? <Code size={24} /> :
                                   material.type === 'IMP' ? <Star size={24} /> :
                                   material.type === 'Assignment' ? <Edit3 size={24} /> :
                                   <FileText size={24} />}
                                </div>
                                
                                <div>
                                  <h3 className="font-bold text-white text-base group-hover:text-[#FFD700] transition-colors">{material.title}</h3>
                                  
                                  {/* Tags */}
                                  <div className="flex items-center flex-wrap gap-2 text-[11px] font-bold text-white/50 mt-2 uppercase tracking-wider">
                                    <span className="bg-white/5 border border-white/5 px-2 py-1 rounded-lg">{semester?.name}</span>
                                    <span className="bg-white/5 border border-white/5 px-2 py-1 rounded-lg">{subject?.name}</span>
                                    <span className="bg-white/5 border border-white/5 px-2 py-1 rounded-lg text-white/70">{material.type}</span>
                                  </div>
                                  
                                  {/* Stats */}
                                  <div className="flex items-center flex-wrap gap-4 mt-3 text-xs text-white/40 font-medium">
                                    <span className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-md"><Eye size={14} className="text-white/30" /> {material.views} views</span>
                                    <span className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-md"><Download size={14} className="text-white/30" /> {material.downloads} dls</span>
                                    <span className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-md"><Clock size={14} className="text-white/30" /> {material.date ? new Date(typeof material.date === 'object' && material.date.toDate ? material.date.toDate() : material.date).toLocaleDateString() : 'Just now'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Right Side: Action Buttons */}
                            <div className="flex items-center gap-2 w-full lg:w-auto mt-2 lg:mt-0">
                              <a
                                href={material.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 font-bold hover:bg-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                              >
                                <Eye size={16} />
                                <span className="text-sm">View</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleEditClick(material)}
                                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold hover:bg-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                              >
                                <Pencil size={16} />
                                <span className="text-sm">Edit</span>
                              </button>
                              {CREATOR_EMAILS.includes(user.email) && (
                                <button
                                  type="button"
                                  onClick={() => setItemToDelete(material.id)}
                                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-bold hover:bg-rose-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                  <Trash2 size={16} />
                                  <span className="text-sm">Delete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  
                {/* Infinite scroll loading trigger */}
                {materialFilter === "Approved" && visibleMaterialsCount < filteredMaterials.length && (
                  <div ref={lastMaterialRef} className="w-full py-6 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500"></div>
                    <span className="ml-3 text-zinc-400 text-sm">Loading more...</span>
                  </div>
                )}
                
                {materialFilter === "Approved" && filteredMaterials.length === 0 && (
                  <div className="glass-card p-12 text-center">
                    <div className="text-white/50 mb-2">No matching materials found</div>
                    <div className="text-sm text-white/40">Try adjusting your search, filter, or sort options</div>
                  </div>
                )}
                
                {materialFilter === "Pending" && materials.filter(m => m.status === materialFilter).length === 0 && (
                  <div className="glass-card p-12 text-center">
                    <div className="text-white/50 mb-2">No pending materials found</div>
                    <div className="text-sm text-white/40">All materials are approved!</div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Reports Tab */}
          {activeTab === "reports" && <AdminReports />}

          {/* Subjects Tab */}
          {activeTab === "subjects" && (
            <>
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectForm(!showAddSubjectForm)}
                  className="w-full glass-card border-2 border-dashed border-white/20 p-8 flex flex-col items-center justify-center gap-3 rounded-2xl hover:bg-white/5 transition-colors"
                >
                  <Plus size={24} className="text-white/50" />
                  <span className="font-bold text-white/70">Add New Subject</span>
                  <span className="text-sm text-white/40 text-center">
                    Click to {showAddSubjectForm ? "cancel" : "open"} the form
                  </span>
                </button>
              </div>
              
              {showAddSubjectForm && (
                <div className="glass-card p-6 mb-6">
                  <h3 className="font-bold text-lg mb-4 text-white/90">Add Subject</h3>
                  <form onSubmit={handleAddSubject} className="space-y-4">
                    <div>
                      <label className="block text-white/50 text-sm mb-2">Subject Name</label>
                      <input
                        type="text"
                        value={newSubject.name}
                        onChange={(e) => setNewSubject(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full glass-card p-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#FFD700] focus:outline-none"
                        placeholder="Enter subject name"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white/50 text-sm mb-2">Semester</label>
                      <select
                        value={newSubject.semesterId}
                        onChange={(e) => setNewSubject(prev => ({ ...prev, semesterId: e.target.value }))}
                        className="premium-dropdown"
                      >
                        {semesters.map(sem => (
                          <option key={sem.id} value={sem.id} className="bg-[#0a0a0a]">
                            {sem.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                      <button type="submit" className="flex-1 btn-primary py-3">Add Subject</button>
                      <button
                        type="button"
                        onClick={() => setShowAddSubjectForm(false)}
                        className="flex-1 glass-card py-3 text-center font-bold rounded-xl border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
              
              <div className="space-y-6">
                {(semesters || []).map(semester => {
                  const semSubjects = getSubjectsBySemester?.(semester.id) || [];
                  if (semSubjects.length === 0) return null;
                  
                  return (
                    <div key={semester.id} className="glass-card p-4 md:p-5">
                      <h3 className="font-bold text-base md:text-lg mb-3 md:mb-4 text-white/90 border-b border-white/10 pb-2">
                        {semester.name}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                        {(semSubjects || []).map(subject => (
                          <div key={subject.id} className="glass-card p-3 md:p-4 flex items-center justify-between">
                            <div>
                              <div className="font-semibold">{subject.name}</div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditSubjectClick(subject)}
                                className="p-1.5 md:p-2 rounded-lg bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition-colors"
                                title="Edit subject"
                              >
                                <Pencil size={16} />
                              </button>
                              {CREATOR_EMAILS.includes(user.email) && (
                                <button
                                  type="button"
                                  onClick={() => deleteSubject(subject.id)}
                                  className="p-1.5 md:p-2 rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-colors"
                                  title="Delete subject"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                {(!semesters || semesters.length === 0) && (
                  <div className="glass-card p-8 text-center">
                    <Book size={32} className="mx-auto mb-3 text-white/30" />
                    <div className="font-semibold text-white mb-1">No semesters found</div>
                    <div className="text-sm text-white/40">Add semesters to manage subjects</div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="glass-card overflow-hidden">
              <div className="p-5 border-b border-white/10">
                <h3 className="font-bold text-lg text-white/90">User Management</h3>
                <p className="text-sm text-white/50 mt-1">Manage registered users and their roles</p>
                
                <div className="mt-4 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-white/50" />
                  </div>
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full glass-card pl-10 pr-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#FFD700] focus:outline-none"
                  />
                </div>
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-hide">
                <table className="w-full">
                  <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                    <tr className="border-b border-white/10">
                      <th className="text-left p-4 text-white/50 text-sm font-bold uppercase tracking-wider">Name</th>
                      <th className="text-left p-4 text-white/50 text-sm font-bold uppercase tracking-wider">Email</th>
                      <th className="text-left p-4 text-white/50 text-sm font-bold uppercase tracking-wider">Role</th>
                      <th className="text-left p-4 text-white/50 text-sm font-bold uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length > 0 ? (
                      <>
                        {filteredUsers.slice(0, visibleUsersCount).map((user, index) => {
                          // No ref here, we only place the ref on the loading row for desktop
                          return (
                            <tr key={`user-${user.id}`} className="border-b border-white/5 hover:bg-white/2">
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{user.displayName || user.name}</span>
                                  {CREATOR_EMAILS.includes(user.email) && (
                                    <span className="inline-flex items-center px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs font-bold rounded-full">
                                      <Crown size={12} className="mr-1" /> Super Admin
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-white/70">{user.email}</td>
                              <td className="p-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                  user.role === "admin" 
                                    ? "bg-purple-500/20 text-purple-300" 
                                    : "bg-blue-500/20 text-blue-300"
                                }`}>
                                  {user.role === "admin" ? (
                                    <><Shield size={12} className="mr-1" /> Admin</>
                                  ) : (
                                    <><User size={12} className="mr-1" /> Student</>
                                  )}
                                </span>
                              </td>
                                                            <td className="p-4">
                                <div className="flex gap-2">
                                  {!CREATOR_EMAILS.includes(user.email) ? (
                                    <div className="flex items-center gap-2">
                                      {user.role === "student" ? (
                                        <button
                                          type="button"
                                          onClick={() => promoteUser(user.id, user.email)}
                                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-purple-500/15 text-purple-300 text-sm font-bold hover:bg-purple-500/25 transition-colors"
                                        >
                                          <Shield size={14} /> Promote
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => demoteUser(user.id, user.email)}
                                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/15 text-amber-300 text-sm font-bold hover:bg-amber-500/25 transition-colors"
                                        >
                                          <User size={14} /> Demote
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleToggleBan(user)}
                                        className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-bold transition-colors ${
                                          user.isBanned 
                                            ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                                            : "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                                        }`}
                                      >
                                        {user.isBanned ? (
                                          <><CheckCircle size={14} /> Unban</>
                                        ) : (
                                          <><XCircle size={14} /> Ban</>
                                        )}
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full text-xs font-bold border border-yellow-500/20 flex items-center gap-1 w-fit">
                                      👑 Creator
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {/* THE DESKTOP OBSERVER IS PLACED HERE */}
                        {visibleUsersCount < filteredUsers.length && (
                          <tr ref={desktopUserRef} key="loading-indicator">
                            <td colSpan="4" className="p-6">
                              <div className="w-full py-6 flex justify-center items-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500"></div>
                                <span className="ml-3 text-zinc-400 text-sm">Loading more...</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ) : (
                      <tr>
                        <td colSpan="4" className="p-8 text-center">
                          <User size={32} className="mx-auto mb-3 text-white/30" />
                          <p className="text-white/50 text-sm">No users found</p>
                          {userSearchTerm && <p className="text-white/40 text-xs mt-1">Try a different search term</p>}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 p-4 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-hide">
                {filteredUsers.length > 0 ? (
                  <>
                    {filteredUsers.slice(0, visibleUsersCount).map((user, index) => {
                      // No ref here, placed on the loader instead
                      return (
                        <div key={`user-${user.id}`} className="glass-card p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-white text-sm">{user.displayName || user.name}</h3>
                                {CREATOR_EMAILS.includes(user.email) && (
                                  <span className="inline-flex items-center px-2 py-1 bg-yellow-500/20 text-yellow-300 text-[10px] font-bold rounded-full">
                                    <Crown size={10} className="mr-1" /> Super Admin
                                  </span>
                                )}
                              </div>
                              <p className="text-white/70 text-xs mt-1 truncate max-w-[200px]">{user.email}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold ${
                                  user.role === "admin" 
                                    ? "bg-purple-500/20 text-purple-300" 
                                    : "bg-blue-500/20 text-blue-300"
                                }`}>
                                  {user.role === "admin" ? (
                                    <><Shield size={10} className="inline mr-1" /> Admin</>
                                  ) : (
                                    <><User size={10} className="inline mr-1" /> Student</>
                                  )}
                                </span>
                                                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            {!CREATOR_EMAILS.includes(user.email) ? (
                              <div className="flex items-center gap-2 w-full">
                                {user.role === "student" ? (
                                  <button
                                    type="button"
                                    onClick={() => promoteUser(user.id, user.email)}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-purple-500/15 text-purple-300 text-xs font-bold hover:bg-purple-500/25 transition-colors"
                                  >
                                    <Shield size={12} /> Promote
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => demoteUser(user.id, user.email)}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition-colors"
                                  >
                                    <User size={12} /> Demote
                                  </button>
                                )}
                                
                                {user.isBanned ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUnban(user.id, user.email)}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 transition-colors"
                                  >
                                    <CheckCircle size={12} /> Unban
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleBan(user)}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 text-xs font-bold hover:bg-rose-500/25 transition-colors"
                                  >
                                    <XCircle size={12} /> Ban
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-yellow-500 bg-yellow-500/10 px-3 py-1.5 rounded-full text-xs font-bold border border-yellow-500/20 flex items-center justify-center gap-1 w-full">
                                👑 Creator
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {/* THE MOBILE OBSERVER IS PLACED HERE */}
                    {visibleUsersCount < filteredUsers.length && (
                      <div ref={mobileUserRef} className="w-full py-6 flex justify-center items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500"></div>
                        <span className="ml-3 text-zinc-400 text-sm">Loading more...</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="glass-card p-8 text-center">
                    <User size={32} className="mx-auto mb-3 text-white/30" />
                    <p className="text-white/50 text-sm">No users found</p>
                    {userSearchTerm && <p className="text-white/40 text-xs mt-1">Try a different search term</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div className="glass-card p-3 sm:p-4">
                <h3 className="font-bold text-sm sm:text-base mb-2 sm:mb-3 text-white/90">📢 Send Notification</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-white/70 text-xs sm:text-sm mb-1">Target User Email (leave blank for ALL)</label>
                    <input
                      type="email"
                      value={notificationEmail}
                      onChange={(e) => setNotificationEmail(e.target.value)}
                      className="w-full glass-card px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-blue-500 focus:outline-none text-sm"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-xs sm:text-sm mb-1">Notification Title</label>
                    <input
                      type="text"
                      value={notificationTitle}
                      onChange={(e) => setNotificationTitle(e.target.value)}
                      className="w-full glass-card px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-blue-500 focus:outline-none text-sm"
                      placeholder="Notification title"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-xs sm:text-sm mb-1">Message</label>
                    <textarea
                      value={notificationMessage}
                      onChange={(e) => setNotificationMessage(e.target.value)}
                      rows="2"
                      className="w-full glass-card px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-blue-500 focus:outline-none resize-y text-sm"
                      placeholder="Notification message"
                      required
                    ></textarea>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendNotification}
                    disabled={isSending}
                    className="w-full btn-primary px-3 py-2 sm:px-4 sm:py-3 font-bold flex items-center justify-center gap-2 text-sm"
                  >
                    {isSending ? (
                      <><Loader2 className="animate-spin" size={16} /> Sending...</>
                    ) : (
                      <><Send size={16} /> Send</>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Sent Notifications Section */}
              <div className="glass-card p-4 md:p-6">
                <h3 className="font-bold text-base md:text-lg mb-4 text-white/90">📋 Sent Notifications</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {sentNotifications.length > 0 ? (
                    sentNotifications.map((notif) => (
                      <div key={notif.id} className="flex items-center justify-between p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/50">
                        <div className="min-w-0 flex-1 pr-4">
                          <h4 className="font-bold text-sm text-white truncate">{notif.title}</h4>
                          <p className="text-xs text-zinc-400 mt-0.5">To: {notif.targetEmail === 'ALL' ? 'Everyone' : notif.targetEmail}</p>
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0">
                          {/* View Count Badge */}
                          <div 
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium border border-blue-500/20"
                            title={`${notif.readBy?.length || 0} users have read this`}
                          >
                            <Eye size={14} />
                            <span>{notif.readBy?.length || 0}</span>
                          </div>
                          
                          {/* Existing Delete Button - Super Admin Only */}
                          {CREATOR_EMAILS.includes(user.email) && (
                            <button
                              onClick={() => handleDeleteGlobal(notif.id)}
                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Delete Notification"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/50 text-center py-4">No notifications sent yet</p>
                  )}
                </div>
              </div>
              
              <div className="glass-card p-4 md:p-6 border border-rose-500/20 bg-rose-500/5">
                <h3 className="font-bold text-base md:text-lg mb-2 text-rose-300">Danger Zone</h3>
                <p className="text-white/50 text-xs md:text-sm mb-3 md:mb-4">
                  These actions cannot be undone. Proceed with caution.
                </p>
                {CREATOR_EMAILS.includes(user.email) && (
                  <button
                    type="button"
                    onClick={handleResetAnalytics}
                    className="btn-danger px-4 py-2 md:px-6 md:py-3 font-bold flex items-center gap-2 mb-3 md:mb-4"
                  >
                    <Trash2 size={18} />
                    Reset All Analytics
                  </button>
                )}
                <p className="text-xs text-white/40 mt-2 mb-4">
                  This will reset all views and downloads to zero
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Edit Material Modal */}
      {editingMaterial && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card p-6 w-full max-w-md rounded-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Edit Material</h3>
              <button
                type="button"
                onClick={() => setEditingMaterial(null)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full glass-card px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Subject</label>
                <CustomSelect
                  value={editForm.subjectId}
                  onChange={(val) => setEditForm(prev => ({ ...prev, subjectId: val }))}
                  options={subjects.map(s => ({ value: s.id, label: s.name }))}
                  placeholder="Select subject"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Type</label>
                <CustomSelect
                  value={editForm.type}
                  onChange={(val) => setEditForm(prev => ({ ...prev, type: val }))}
                  options={[
                    { value: 'Notes', label: 'Notes' },
                    { value: 'Practicals', label: 'Practicals' },
                    { value: 'IMP', label: 'IMP' },
                    { value: 'Assignment', label: 'Assignment' }
                  ]}
                  placeholder="Select type"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Google Drive Link</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editForm.link}
                    onChange={(e) => setEditForm(prev => ({ ...prev, link: e.target.value }))}
                    className="w-full glass-card px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-blue-500 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={openDrivePicker}
                    disabled={!isGoogleApiLoaded}
                    title={!isGoogleApiLoaded ? "Loading Google Drive..." : "Pick from Google Drive"}
                    className={`flex-shrink-0 px-4 rounded-xl transition-all border ${
                      !isGoogleApiLoaded 
                        ? "bg-white/5 border-white/10 cursor-not-allowed opacity-50" 
                        : "bg-white/10 hover:bg-white/20 border-white/20"
                    }`}
                  >
                    {!isGoogleApiLoaded ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                        <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                        <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                        <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                        <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                        <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">
                  Update Material
                </button>
                <button type="button" onClick={() => setEditingMaterial(null)} className="flex-1 glass-card py-3 text-center font-bold rounded-xl border border-white/10 text-white/70 hover:bg-white/5 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Subject Modal */}
      {editingSubject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card p-6 w-full max-w-md rounded-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Edit Subject</h3>
              <button
                type="button"
                onClick={() => setEditingSubject(null)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateSubject} className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Subject Name</label>
                <input
                  type="text"
                  value={editSubjectName}
                  onChange={(e) => setEditSubjectName(e.target.value)}
                  className="w-full glass-card px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">
                  Save Changes
                </button>
                <button type="button" onClick={() => setEditingSubject(null)} className="flex-1 glass-card py-3 text-center font-bold rounded-xl border border-white/10 text-white/70 hover:bg-white/5 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Danger Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-500/20 w-full max-w-md p-6 rounded-xl shadow-2xl">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                  <AlertTriangle size={32} className="text-red-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Reset All Analytics?</h3>
              <p className="text-zinc-400 text-sm mb-6">
                This will permanently reset views and downloads to zero. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowResetModal(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={executeReset} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors">
                  Yes, Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-500/30 w-full max-w-sm p-6 rounded-xl shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                <Trash2 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Delete Material?</h3>
                <p className="text-zinc-400 text-sm">
                  Are you sure you want to delete this? This action cannot be undone and the link will break.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button type="button" onClick={() => setItemToDelete(null)} className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors font-medium">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const result = await deleteMaterial(itemToDelete);
                    if (result?.success) toast.success("Material deleted successfully!");
                    else if (result?.error) toast.error(result.error);
                    setItemToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-bold"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {itemToReject && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-500/30 w-full max-w-sm p-6 rounded-xl shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                <XCircle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Reject Material?</h3>
                <p className="text-zinc-400 text-sm">
                  Are you sure you want to reject this upload? This cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button type="button" onClick={() => setItemToReject(null)} className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors font-medium">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const result = await rejectMaterial(itemToReject);
                    if (result?.success) toast.success("Material rejected successfully!");
                    else if (result?.error) toast.error(result.error);
                    setItemToReject(null);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-bold"
                >
                  Yes, Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}