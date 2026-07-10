import { BarChart2, Book, CheckCircle, Clock, Code, Crown, Download, Edit3, Eye, FileText, Flag, Pen, Pencil, Plus, Search, Settings, Shield, Star, Trash2, Upload, User, XCircle, AlertTriangle, Users, Send, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import { useApp } from "../context/AppContext";
import AdminAnalytics from "../components/admin/AdminAnalytics";
import AdminSubjects from "../components/admin/AdminSubjects";
import AdminMaterials from "../components/admin/AdminMaterials";
import AdminUsers from "../components/admin/AdminUsers";
import AdminSettings from "../components/admin/AdminSettings";
import AdminReports from "../components/admin/AdminReports";
import CustomSelect from "../components/admin/CustomSelect";
import { doc, updateDoc, deleteDoc, writeBatch, collection, getDocs, query, orderBy, onSnapshot, addDoc, serverTimestamp, getCountFromServer } from "firebase/firestore";
import { db, auth } from "../firebase";

const tabs = [
  { id: "analytics", label: "Analytics", icon: <BarChart2 size={16} /> },
  { id: "subjects", label: "Subjects", icon: <Book size={16} /> },
  { id: "materials", label: "Materials", icon: <FileText size={16} /> },
  { id: "reports", label: "Reports", icon: <Flag size={16} /> },
  { id: "users", label: "Users", icon: <User size={16} /> },
  { id: "settings", label: "Settings", icon: <Settings size={16} /> },
];

const CREATOR_EMAILS = ["rishiuttamsahu@gmail.com", "piyushgupta122006@gmail.com"];

export default function Admin() {
  // 1. App Context & Navigation
  const navigate = useNavigate();
  const { activeTab: tabParam } = useParams();
  const activeTab = tabParam || "analytics";

  const { 
    semesters, subjects, materials, stats, user, loading,
    approveMaterial, rejectMaterial, deleteMaterial,
    addSubject, getSemesterById, getSubjectById,
    getPendingMaterials, getApprovedMaterials, getSubjectsBySemester
  } = useApp();

  // Redirect if invalid activeTab
  useEffect(() => {
    const isValidTab = tabs.some(tab => tab.id === activeTab);
    if (!tabParam || !isValidTab) {
      navigate("/admin/analytics", { replace: true });
    }
  }, [activeTab, tabParam, navigate]);

  const handleTabChange = (tabId) => {
    navigate(`/admin/${tabId}`);
  };

  // 2. All Main States
  const [materialFilter, setMaterialFilter] = useState("Pending"); 
  const [selectedPending, setSelectedPending] = useState([]);
  const [showAddSubjectForm, setShowAddSubjectForm] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  
  // 🚨 AI Automation States
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  // 🚨 Dynamic Bulk Subject Selection Utilities
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const touchTimer = useRef(null);
  // 🚨 Bulk Materials Selection Utilities
  const [isMaterialMultiMode, setIsMaterialMultiMode] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const matTouchTimer = useRef(null);
  const [aiExtractedSubjects, setAiExtractedSubjects] = useState([]);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [editSubjectName, setEditSubjectName] = useState("");
  // 🚨 Naya state add kijiye edit subject ke semester ke liye
  const [editSubjectSem, setEditSubjectSem] = useState("");
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
  const [emailMessage, setEmailMessage] = useState("");
  const [sentNotifications, setSentNotifications] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [registeredUsersCount, setRegisteredUsersCount] = useState(0);

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
        <div className={`${t.visible ? 'animate-in fade-in slide-in-from-bottom-4' : 'animate-out fade-out zoom-out-95'} max-w-xs w-full bg-[#0c0c0e]/95 backdrop-blur-xl border border-emerald-500/30 shadow-[0_10px_30px_rgba(16,185,129,0.2)] rounded-2xl pointer-events-auto p-4 flex items-center gap-4`}>
          <div className="bg-emerald-500/20 p-2 rounded-xl">
            <CheckCircle className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Bulk Approved</p>
            <p className="text-[10px] text-emerald-400/70">{selectedCount} files published successfully.</p>
          </div>
        </div>
      ), { position: 'bottom-center' });
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
        <div className={`${t.visible ? 'animate-in fade-in slide-in-from-bottom-4' : 'animate-out fade-out zoom-out-95'} max-w-xs w-full bg-[#0c0c0e]/95 backdrop-blur-xl border border-rose-500/30 shadow-[0_10px_30px_rgba(244,63,94,0.2)] rounded-2xl pointer-events-auto p-4 flex items-center gap-4`}>
          <div className="bg-rose-500/20 p-2 rounded-xl">
            <Trash2 className="h-6 w-6 text-rose-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Files Rejected</p>
            <p className="text-[10px] text-rose-400/70">{selectedCount} items removed forever.</p>
          </div>
        </div>
      ), { position: 'bottom-center' });
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
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(reportsData);
      setReportsLoading(false);
      const unresolved = reportsData.filter(r => r.status !== 'resolved').length;
      setUnresolvedCount(unresolved);
    }, (error) => {
      console.error('Error listening to reports:', error);
      setReportsLoading(false);
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
  
  // 🌟 Real-time dynamic visitor verification array lookup filter setup
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    const statRef = doc(db, 'analytics', today);
    const unsubscribe = onSnapshot(statRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const details = data.visitorDetails || [];
        
        // 🚨 CRITICAL DE-DUPLICATION ENGINE LAYER
        // Sirf unique emails ko count karega
        const uniqueEmailsToday = new Set(details.map(v => v.email));
        
        // Dashboard card ko unique value pass karega
        setTodayVisitors(uniqueEmailsToday.size);
      } else {
        setTodayVisitors(0);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch total registered users count using getCountFromServer (Only 1 read operation)
  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        const coll = collection(db, "users");
        const snapshot = await getCountFromServer(coll);
        setRegisteredUsersCount(snapshot.data().count);
      } catch (err) {
        console.error("Error fetching registered users count:", err);
      }
    };
    fetchUserCount();
  }, []);

  // Listen to users collection in real-time ONLY when on users/settings tabs
  useEffect(() => {
    const userRole = user?.role || "student";
    const isAdmin = CREATOR_EMAILS.includes(user?.email) || userRole === "admin";
    if (!isAdmin || (activeTab !== "users" && activeTab !== "settings")) {
      setUsers([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const usersList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
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
        console.error("Error listening to users in Admin:", error);
      }
    );
    return () => unsubscribe();
  }, [user, activeTab]);

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
    await deleteDoc(doc(db, 'notifications', id));
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

  // 🚨 MASTER AUTOMATION ENGINE: GEMINI-3.1-FLASH-LITE + CUSTOM "FULLFORM (SHORTFORM)" SYSTEM
  const handlePdfAiAutomation = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 🧠 HUMAN LOGIC: Check target semester upfront
    const currentTargetSem = newSubject.semesterId; // "3" or "4" etc.
    
    setIsAiProcessing(true);
    const loadingToast = toast.loading(`Scanning PDF specifically for Semester ${currentTargetSem} subjects...`);

    const inputElement = e.target;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjs = await import("pdfjs-dist");
      
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      
      let currentParsingSemester = null;
      let targetLines = [];
      
      // Pure PDF ke pages par traverse karenge step-by-step
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        const pageLines = textContent.items.map(item => item.str);
        
        // 🧠 STATE MACHINE TRACKING: Check karein ki page par kis Sem ka data shuru ho raha hai
        if (/Semester\s+III/i.test(pageText) || /Sem\s*–\s*III/i.test(pageText)) {
          currentParsingSemester = "3";
        } else if (/Semester\s+IV/i.test(pageText) || /Sem\s*–\s*IV/i.test(pageText)) {
          currentParsingSemester = "4";
        } else if (/Semester\s+I\b/i.test(pageText)) {
          currentParsingSemester = "1";
        } else if (/Semester\s+II\b/i.test(pageText)) {
          currentParsingSemester = "2";
        }

        // 🚨 CRITICAL LAYER: Line tabhi pick hogi jab current page admin ke selected semester se match karega!
        if (currentParsingSemester === String(currentTargetSem)) {
          pageLines.forEach(line => {
            if (/name\s+of\s+(the\s+)?course:/i.test(line)) {
              if (!targetLines.includes(line.trim())) {
                targetLines.push(line.trim());
              }
            }
          });
        }
      }

      // 🧠 SMART HUMAN CHECK: Agar loops ke baad target lines khali hain
      if (targetLines.length === 0) {
        toast.dismiss(loadingToast);
        
        Swal.fire({
          title: "Semester Mismatch! ⚠️",
          html: `<div class="text-xs text-zinc-400 leading-relaxed">
            The uploaded syllabus PDF does not seem to contain data for <b class="text-[#FFD700]">Semester ${currentTargetSem}</b>.<br/><br/>
            This specific document contains chapters for <b>Semester 3 and Semester 4</b> only. Please switch your dropdown to the correct semester and try again!
          </div>`,
          icon: "warning",
          buttonsStyling: false,
          background: "#0c0c0e",
          color: "#FFFFFF",
          confirmButtonText: "Got it!",
          customClass: {
            popup: "border border-zinc-800 rounded-3xl p-5 shadow-2xl",
            title: "text-base font-bold text-rose-400",
            confirmButton: "w-full mt-4 bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-xl text-xs font-bold text-white transition-colors"
          }
        });
        
        setIsAiProcessing(false);
        return;
      }

      // 🚨 Fetch production VITE key profile configurations
      const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || window?.process?.env?.VITE_GEMINI_API_KEY; 
      if (!geminiApiKey) {
        throw new Error("VITE_GEMINI_API_KEY is missing in your environment configuration profile!");
      }

      // 🧠 Prompt updated to output exact: FULLFORM (SHORTFORM) format
      const prompt = `You are an automated university database parser tool.
      Analyze these pre-filtered Course Heading Lines for Semester ${currentTargetSem}.
      Format each line exactly as: FULLFORM (SHORTFORM) 
      Example: "Principles of Operating Systems" becomes "Principles of Operating Systems (OS)".
      Example: "Theory of Computation" becomes "Theory of Computation (TOC)".
      
      CRITICAL RULES:
      1. Keep the exact full name intact in the FULLFORM part. Do not truncate words.
      2. Return ONLY a raw JSON array of strings. No markdown formatting, no \`\`\`json blocks.
      
      Filtered Course Lines for Semester ${currentTargetSem}:
      ${targetLines.join("\n")}`;

      // 🚨 Model lock remains gemini-3.1-flash-lite as requested!
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const resData = await response.json();
      
      if (resData.error) {
        throw new Error(`Google API Gateway Exception: ${resData.error.message}`);
      }

      if (!resData.candidates || resData.candidates.length === 0) {
        throw new Error("Gemini API stream validation fault.");
      }

      const aiResponseText = resData.candidates[0].content.parts[0].text;
      const cleanJson = aiResponseText.replace(/```json|```/g, "").trim();
      const extractedArray = JSON.parse(cleanJson);

      // 3. 🧠 Smart Fuzzy Semantic Duplicate Protection
      const existingSubjects = (subjects || []).map(sub => ({
        id: sub.id,
        cleanName: sub.name.toLowerCase()
          .replace(/\(.*?\)/g, "") // Brackets aur unke andar ke shortforms hatayein check ke liye
          .replace(/principles of|core|advanced|introduction to/g, "")
          .replace(/[^a-zA-Z0-9]/g, "")
          .trim()
      }));

      const processedList = extractedArray.map(subName => {
        // Incoming string se brackets content hatakar clean core text extract karna duplication check ke liye
        const cleanIncoming = subName.toLowerCase()
          .replace(/\(.*?\)/g, "")
          .replace(/principles of|core|advanced|introduction to/g, "")
          .replace(/[^a-zA-Z0-9]/g, "")
          .trim();

        const isDuplicate = existingSubjects.some(existing => {
          if (!existing.cleanName || !cleanIncoming) return false;
          return (
            existing.cleanName === cleanIncoming || 
            existing.cleanName.includes(cleanIncoming) || 
            cleanIncoming.includes(existing.cleanName)
          );
        });

        return {
          name: subName,
          exists: isDuplicate
        };
      });

      setAiExtractedSubjects(processedList);
      
      const duplicatesCount = processedList.filter(s => s.exists).length;
      toast.dismiss(loadingToast);
      
      if (duplicatesCount > 0) {
        toast.success(`Extracted ${processedList.length} items for Semester ${currentTargetSem}! (${duplicatesCount} duplicates safe).`);
      } else {
        toast.success(`Successfully isolated ${processedList.length} fresh subjects for Semester ${currentTargetSem}!`);
      }

    } catch (error) {
      console.error("AI Automation Error:", error);
      toast.dismiss(loadingToast);
      toast.error(error.message || "Parsing isolation failed.");
    } finally {
      setIsAiProcessing(false);
      if (inputElement) inputElement.value = "";
    }
  };

  // Naye Filters ke sath Bulk Push update (Sirf unhi ko add karega jo unique hain)
  const handleBulkAddAiSubjects = async () => {
    // Filter out items that already exist in DB
    const uniqueSubjectsToPush = aiExtractedSubjects.filter(s => !s.exists);
    
    if (uniqueSubjectsToPush.length === 0) {
      toast.error("No unique subjects left to add!");
      return;
    }

    const loadToast = toast.loading(`Pushing ${uniqueSubjectsToPush.length} unique subjects to Firestore...`);
    try {
      for (const sub of uniqueSubjectsToPush) {
        await addSubject(sub.name, newSubject.semesterId, "Book");
      }
      toast.dismiss(loadToast);
      toast.success("Database synchronized successfully! 🚀");
      setAiExtractedSubjects([]);
    } catch (err) {
      toast.dismiss(loadToast);
      toast.error("Error saving subjects.");
    }
  };

  // 🧠 HIGH-PERFORMANCE MATERIAL TOUCH ORCHESTRATION
  const handleMatTouchStart = (materialId) => {
    if (isMaterialMultiMode) return;
    matTouchTimer.current = setTimeout(() => {
      setIsMaterialMultiMode(true);
      setSelectedMaterials([materialId]);
      navigator.vibrate?.(40); // Soft feedback vibration
    }, 600);
  };

  const handleMatTouchEnd = () => {
    if (matTouchTimer.current) clearTimeout(matTouchTimer.current);
  };

  const handleMaterialItemClick = (material, e) => {
    // Agar link ya buttons click ho rahe hain toh mode bypass ho jaye
    if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('a')) {
      return;
    }

    if (isMaterialMultiMode) {
      e.preventDefault();
      setSelectedMaterials(prev => 
        prev.includes(material.id) ? prev.filter(id => id !== material.id) : [...prev, material.id]
      );
    }
  };

  // Bulk Delete Actions Trigger for Multi Selected Materials
  const handleBulkDeleteMaterials = async () => {
    if (selectedMaterials.length === 0) return;
    const currentScrollPos = window.scrollY || document.documentElement.scrollTop;
    
    const result = await Swal.fire({
      title: `Delete ${selectedMaterials.length} Materials?`,
      text: "This will permanently delete these files from the server structure!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete All",
      cancelButtonText: "Cancel",
      buttonsStyling: false,
      background: "#0c0c0e",
      color: "#ffffff",
      customClass: {
        popup: "border border-zinc-800 rounded-3xl p-5 shadow-2xl",
        confirmButton: "bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl text-xs font-bold text-white mr-3",
        cancelButton: "bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl text-xs font-bold text-white"
      },
      didOpen: () => {
        document.body.style.position = 'fixed';
        document.body.style.top = `-${currentScrollPos}px`;
        document.body.style.width = '100%';
      },
      willClose: () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, currentScrollPos);
      }
    });

    if (result.isConfirmed) {
      const loadToast = toast.loading(`Deleting selected files...`);
      try {
        for (const id of selectedMaterials) {
          await deleteDoc(doc(db, "materials", id));
        }
        toast.dismiss(loadToast);
        toast.success("All selected materials deleted successfully!");
        setSelectedMaterials([]);
        setIsMaterialMultiMode(false);
        
        // 🚨 BATCH DELETE JUMP LOCK: Firebase callback render bypass
        window.scrollTo(0, currentScrollPos);
        requestAnimationFrame(() => {
          document.documentElement.scrollTop = currentScrollPos;
        });
      } catch (err) {
        toast.dismiss(loadToast);
        toast.error("Wipe loop execution fault encountered.");
      }
    }
  };

  // 🧠 MOBILE LONG PRESS TRIGGER ORCHESTRATION LOGIC
  const handleTouchStart = (subjectId) => {
    touchTimer.current = setTimeout(() => {
      setIsMultiSelectMode(true);
      setSelectedSubjects(prev => [...prev, subjectId]);
      navigator.vibrate?.(50); // Feedback vibration for premium mobile feeling
    }, 600); // 500-600ms hold turns multi select on!
  };

  const handleTouchEnd = () => {
    if (touchTimer.current) clearTimeout(touchTimer.current);
  };

  const handleSubjectItemClick = (subjectId) => {
    if (isMultiSelectMode) {
      setSelectedSubjects(prev => 
        prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
      );
    }
  };

  // Bulk Delete Actions Trigger for Multi Selected streams
  // 🚨 PERFECT BULK SUBJECTS PURGE ENGINE (Zero Page Jerk on Batch Success)
  const handleBulkDeleteSubjects = async () => {
    if (selectedSubjects.length === 0) return;
    const currentScrollPos = window.scrollY || document.documentElement.scrollTop;
    
    const result = await Swal.fire({
      title: `Delete ${selectedSubjects.length} Subjects?`,
      text: "Warning: Linked materials routes may throw breaks!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Wipe Out",
      cancelButtonText: "Cancel",
      buttonsStyling: false,
      background: "#0c0c0e",
      color: "#ffffff",
      customClass: {
        popup: "border border-zinc-800 rounded-3xl p-5 shadow-2xl",
        confirmButton: "bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl text-xs font-bold text-white mr-3",
        cancelButton: "bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl text-xs font-bold text-white"
      }
    });

    if (result.isConfirmed) {
      const loadToast = toast.loading(`Purging targets from storage layers...`);
      try {
        for (const id of selectedSubjects) {
          await deleteDoc(doc(db, "subjects", id));
        }
        toast.dismiss(loadToast);
        toast.success("Database targets cleared out clean!");
        setSelectedSubjects([]);
        setIsMultiSelectMode(false);
        
        // 🚨 Multi success macro anchor integration
        window.scrollTo(0, currentScrollPos);
        requestAnimationFrame(() => {
          document.documentElement.scrollTop = currentScrollPos;
        });
      } catch (err) {
        toast.dismiss(loadToast);
        toast.error("Wipe loop execution fault encountered.");
      }
    }
  };
  
  // 🚨 100% FIXED JUMP MECHANISM ON DATABASE CONFIRMED PURGE
  const deleteSubject = async (id) => {
    const currentScrollPos = window.scrollY || document.documentElement.scrollTop;

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
      
      // 🚨 PURE REALTIME ANCHOR FORCING: Double layer guard executing loop settlement
      window.scrollTo(0, currentScrollPos);
      
      requestAnimationFrame(() => {
        window.scrollTo(0, currentScrollPos);
        // HTML and document parameters dynamic reset
        document.documentElement.scrollTop = currentScrollPos;
      });

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
    // 🚨 Modal khulte waqt subject ka current semester set karein
    setEditSubjectSem(subject.semesterId || subject.semId || "1"); 
  };
  
  const handleUpdateSubject = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "subjects", editingSubject.id), {
        name: editSubjectName,
        // 🚨 Database mein naya selected semester update karein
        semesterId: editSubjectSem,
        semId: editSubjectSem // Backup for backwards compatibility
      });
      toast.success("Subject Updated!");
      setEditingSubject(null);
      setEditSubjectName("");
      setEditSubjectSem(""); // Clear state
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

  const handleSendNotification = async (emailBodyText) => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast.error("Please fill in both title and message");
      return;
    }
    setIsSending(true);
    try {
      const rawTarget = notificationEmail.trim();
      const targetEmails = rawTarget ? rawTarget.split(",").map(e => e.trim()).filter(Boolean) : ['ALL'];

      // Send Firestore notifications for each target email (stores the short app marquee message)
      for (const targetEmail of targetEmails) {
        const notificationData = {
          targetEmail: targetEmail,
          title: notificationTitle.trim(),
          message: notificationMessage.trim(),
          createdAt: serverTimestamp(),
          readBy: []
        };
        await addDoc(collection(db, "notifications"), notificationData);
      }

      const mailScriptUrl = import.meta.env.VITE_MAIL_SCRIPT_URL;
      if (mailScriptUrl && mailScriptUrl !== "YOUR_NEWLY_DEPLOYED_APPS_SCRIPT_URL") {
        // Use custom email body if provided, fallback to short message
        const emailContent = (emailBodyText && typeof emailBodyText === 'string' && emailBodyText.trim())
          ? emailBodyText.trim()
          : notificationMessage.trim();

        const urls = mailScriptUrl.split(",").map(u => u.trim()).filter(Boolean);
        let currentScriptIndex = 0;

        const sendEmail = async (toEmail) => {
          const globalNoticeTemplate = `
            <div style="background-color:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif; padding:32px 16px;">
              <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px; width:100%; margin:0 auto; background-color:#ffffff;">
                <tbody>
                  <tr>
                    <td style="padding-bottom:48px;">
                      <!-- Site Logo (Placeholder for your logo) -->
                      <img src="https://fycs-study-hub.vercel.app/logo.png" width="32" height="32" alt="Study Hub" style="display:block;">
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <h1 style="color:#171717; font-size:24px; font-weight:600; letter-spacing:-0.02em; margin:0 0 24px 0;">
                        ${notificationTitle.trim()}
                      </h1>
                      <p style="color:#171717; font-size:16px; line-height:1.5; margin:0 0 16px 0;">
                        ${emailContent}
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:44px; border-top:1px solid #e6e6e6;">
                      <p style="color:#7d7d7d; font-size:14px; line-height:1.5; margin:0 0 8px 0;">
                        Check the live updates feed directly on the BNN CS Study Hub app/website.
                      </p>
                      <p style="color:#7d7d7d; font-size:14px; margin:0 0 8px 0;">
                        Copyright © 2026 BNN CS Study Hub. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          `;

          const payload = {
            email: toEmail,
            subject: `BNN CS Hub Update: ${notificationTitle.trim()}`,
            messageHtml: globalNoticeTemplate
          };

          for (let i = currentScriptIndex; i < urls.length; i++) {
            const url = urls[i];
            try {
              const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify(payload)
              });
              const data = await response.json();
              if (data && data.status === "error") {
                console.warn(`Mail Script URL ${i + 1} returned quota error for ${toEmail}:`, data.message);
                currentScriptIndex = i + 1; // Cache index increment to skip exhausted script
                continue;
              }
              console.log(`Email successfully sent to ${toEmail} using script URL ${i + 1}`);
              return true;
            } catch (err) {
              console.warn(`Mail Script URL ${i + 1} failed with CORS/network error, trying fallback no-cors mode...`);
              try {
                await fetch(url, {
                  method: "POST",
                  mode: "no-cors",
                  body: JSON.stringify(payload)
                });
                console.log(`Email sent (no-cors mode fallback) to ${toEmail} using script URL ${i + 1}`);
                return true;
              } catch (noCorsErr) {
                console.error(`Mail Script URL ${i + 1} failed completely:`, noCorsErr);
                currentScriptIndex = i + 1; // Cache index increment to skip exhausted script
              }
            }
          }
          console.error(`All configured email scripts failed for ${toEmail}. Quota exceeded or scripts down.`);
          return false;
        };

        let successCount = 0;
        let failCount = 0;

        for (const targetEmail of targetEmails) {
          if (targetEmail === 'ALL') {
            for (const u of users) {
              if (u.email) {
                const ok = await sendEmail(u.email);
                if (ok) successCount++;
                else failCount++;
              }
            }
          } else {
            const ok = await sendEmail(targetEmail);
            if (ok) successCount++;
            else failCount++;
          }
        }

        if (failCount > 0 && successCount === 0) {
          toast.error("Failed to send emails. Daily quota exceeded on all script URLs.");
        } else if (failCount > 0) {
          toast.success(`Notification published! Sent ${successCount} emails, failed ${failCount} (quota limits).`);
        } else {
          toast.success("Notification published & Emails sent successfully! 🚀");
        }
      } else {
        toast.success("Notification sent successfully (Mailing script url not configured).");
      }

      setNotificationEmail("");
      setNotificationTitle("");
      setNotificationMessage("");
      setEmailMessage("");
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Failed to send notification");
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
                  onClick={() => handleTabChange(tab.id)}
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
          {activeTab === "analytics" && (
            <AdminAnalytics
              safeStats={safeStats}
              todayVisitors={todayVisitors}
              uniqueUsersCount={registeredUsersCount}
              formatNumber={formatNumber}
            />
          )}

          {activeTab === "materials" && (
            <AdminMaterials
              materialFilter={materialFilter}
              setMaterialFilter={setMaterialFilter}
              getPendingMaterials={getPendingMaterials}
              getApprovedMaterials={getApprovedMaterials}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterSem={filterSem}
              setFilterSem={setFilterSem}
              filterType={filterType}
              setFilterType={setFilterType}
              filterSubject={filterSubject}
              setFilterSubject={setFilterSubject}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              semesters={semesters}
              filteredSubjectsForDropdown={filteredSubjectsForDropdown}
              selectedPending={selectedPending}
              toggleAllPending={toggleAllPending}
              togglePendingSelection={togglePendingSelection}
              handleEditClick={handleEditClick}
              approveMaterial={approveMaterial}
              setItemToReject={setItemToReject}
              filteredMaterials={filteredMaterials}
              visibleMaterialsCount={visibleMaterialsCount}
              lastMaterialRef={lastMaterialRef}
              selectedMaterials={selectedMaterials}
              handleMatTouchStart={handleMatTouchStart}
              handleMatTouchEnd={handleMatTouchEnd}
              handleMaterialItemClick={handleMaterialItemClick}
              isMaterialMultiMode={isMaterialMultiMode}
              CREATOR_EMAILS={CREATOR_EMAILS}
              user={user}
              setItemToDelete={setItemToDelete}
              getSemesterById={getSemesterById}
              getSubjectById={getSubjectById}
              materials={materials}
            />
          )}

          {/* Reports Tab */}
          {activeTab === "reports" && (
            <AdminReports
              reports={reports}
              setReports={setReports}
              loading={reportsLoading}
            />
          )}

          {activeTab === "subjects" && (
            <AdminSubjects
              newSubject={newSubject}
              setNewSubject={setNewSubject}
              semesters={semesters}
              showAddSubjectForm={showAddSubjectForm}
              setShowAddSubjectForm={setShowAddSubjectForm}
              handlePdfAiAutomation={handlePdfAiAutomation}
              isAiProcessing={isAiProcessing}
              aiExtractedSubjects={aiExtractedSubjects}
              setAiExtractedSubjects={setAiExtractedSubjects}
              handleBulkAddAiSubjects={handleBulkAddAiSubjects}
              handleAddSubject={handleAddSubject}
              getSubjectsBySemester={getSubjectsBySemester}
              handleEditSubjectClick={handleEditSubjectClick}
              CREATOR_EMAILS={CREATOR_EMAILS}
              user={user}
              deleteSubject={deleteSubject}
              handleTouchStart={handleTouchStart}
              handleTouchEnd={handleTouchEnd}
              handleSubjectItemClick={handleSubjectItemClick}
              selectedSubjects={selectedSubjects}
              isMultiSelectMode={isMultiSelectMode}
            />
          )}

          {activeTab === "users" && (
            <AdminUsers
              userSearchTerm={userSearchTerm}
              setUserSearchTerm={setUserSearchTerm}
              filteredUsers={filteredUsers}
              visibleUsersCount={visibleUsersCount}
              CREATOR_EMAILS={CREATOR_EMAILS}
              promoteUser={promoteUser}
              demoteUser={demoteUser}
              handleToggleBan={handleToggleBan}
              handleUnban={handleUnban}
              desktopUserRef={desktopUserRef}
              mobileUserRef={mobileUserRef}
            />
          )}

          {activeTab === "settings" && (
            <AdminSettings
              users={users}
              notificationEmail={notificationEmail}
              setNotificationEmail={setNotificationEmail}
              notificationTitle={notificationTitle}
              setNotificationTitle={setNotificationTitle}
              notificationMessage={notificationMessage}
              setNotificationMessage={setNotificationMessage}
              emailMessage={emailMessage}
              setEmailMessage={setEmailMessage}
              handleSendNotification={handleSendNotification}
              isSending={isSending}
              sentNotifications={sentNotifications}
              handleDeleteGlobal={handleDeleteGlobal}
              CREATOR_EMAILS={CREATOR_EMAILS}
              user={user}
              handleResetAnalytics={handleResetAnalytics}
            />
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

              {/* 🚨 Naya Semester Selection Dropdown */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Semester</label>
                <CustomSelect
                  value={editSubjectSem}
                  onChange={(val) => setEditSubjectSem(val)}
                  options={(semesters || []).map(sem => ({ value: sem.id, label: sem.name }))}
                  placeholder="Select Semester"
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

      {/* 🚨 FLOATING BULK ACTION BAR (PORTAL - renders at body level) 🚨 */}
      {selectedPending.length > 0 && createPortal(
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100000] animate-in slide-in-from-bottom-5 px-4 w-full max-w-md pointer-events-none">
          <div className="pointer-events-auto glass-card bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.9)] px-4 py-3 rounded-2xl flex items-center justify-between gap-4">
            <div className="bg-[#FFD700]/10 px-3 py-1.5 rounded-xl border border-[#FFD700]/20 flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#FFD700] animate-pulse"></span>
              <span className="text-xs font-bold text-[#FFD700] whitespace-nowrap">{selectedPending.length} Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleBulkApprove} type="button" className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-500/20 transition-all border border-emerald-500/20"><CheckCircle size={14}/> Approve</button>
              <button onClick={handleBulkReject} type="button" className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-500/20 transition-all border border-rose-500/20"><XCircle size={14}/> Reject</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 🚨 FLOATING PORTAL FOR SUBJECTS BULK SELECTION MODES */}
      {isMultiSelectMode && createPortal(
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100000] animate-in slide-in-from-bottom-5 px-4 w-full max-w-md pointer-events-none">
          <div className="pointer-events-auto glass-card bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.9)] px-4 py-3 rounded-2xl flex items-center justify-between gap-4">
            
            {/* 👈 LEFT: Exit Button */}
            <button 
              onClick={() => { setIsMultiSelectMode(false); setSelectedSubjects([]); }} 
              type="button" 
              className="px-4 py-2 bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 rounded-xl text-xs font-bold transition-all shrink-0"
            >
              Exit
            </button>

            {/* 🎯 MIDDLE: Selected Items Counter */}
            <div className="bg-[#FFD700]/10 px-4 py-2 rounded-xl border border-[#FFD700]/20 flex items-center gap-2 justify-center mx-auto">
              <span className="flex h-2 w-2 rounded-full bg-[#FFD700] animate-pulse"></span>
              <span className="text-xs font-extrabold text-[#FFD700] whitespace-nowrap tracking-wide">
                {selectedSubjects.length} Selected
              </span>
            </div>

            {/* 👉 RIGHT: Action Button */}
            <button 
              onClick={handleBulkDeleteSubjects} 
              disabled={selectedSubjects.length === 0} 
              type="button" 
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-500/20 transition-all border border-rose-500/20 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              <Trash2 size={14}/> Bulk Purge
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* 🚨 FLOATING PORTAL FOR MATERIALS BULK SELECTION MODES */}
      {isMaterialMultiMode && createPortal(
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100000] animate-in slide-in-from-bottom-5 px-4 w-full max-w-md pointer-events-none">
          <div className="pointer-events-auto glass-card bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.9)] px-4 py-3 rounded-2xl flex items-center justify-between gap-4">
            
            {/* 👈 LEFT: Exit Button */}
            <button 
              onClick={() => { setIsMaterialMultiMode(false); setSelectedMaterials([]); }} 
              type="button" 
              className="px-4 py-2 bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 rounded-xl text-xs font-bold transition-all shrink-0"
            >
              Exit
            </button>

            {/* 🎯 MIDDLE: Selected Items Counter */}
            <div className="bg-[#FFD700]/10 px-4 py-2 rounded-xl border border-[#FFD700]/20 flex items-center gap-2 justify-center mx-auto">
              <span className="flex h-2 w-2 rounded-full bg-[#FFD700] animate-pulse"></span>
              <span className="text-xs font-extrabold text-[#FFD700] whitespace-nowrap tracking-wide">
                {selectedMaterials.length} Selected
              </span>
            </div>

            {/* 👉 RIGHT: Action Button */}
            <button 
              onClick={handleBulkDeleteMaterials} 
              disabled={selectedMaterials.length === 0} 
              type="button" 
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-500/20 transition-all border border-rose-500/20 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              <Trash2 size={14}/> Batch Delete
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
