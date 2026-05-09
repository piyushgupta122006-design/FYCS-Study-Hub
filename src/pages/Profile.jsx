import { User, LogOut, ExternalLink, Clock, Trash2, Settings, X, Sparkles, Bell, Bookmark, FileText, Upload, Monitor, ChevronRight, Minus, Plus, Check } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useState, useEffect, useRef } from "react";
import { updateProfile } from "firebase/auth";
import { collection, addDoc, getDocs, query, where, serverTimestamp, updateDoc, doc, arrayUnion, deleteDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from "../firebase";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import { BiMessageDetail } from 'react-icons/bi';

const SUBJECT_SHORT_NAMES = {
  "Hindi": "Hindi",
  "Time Table": "TT",
  "Certificate/Index/Page": "Certificate",
  "Certificate": "Certificate",
  "Maths (Number Theory)": "Maths",
  "Algorithm": "Algo",
  "Python": "Python",
  "Web Development": "WD",
  "Marketing Mix-2 (MM-2)": "MM-2",
  "OOPs (C++)": "OOPs",
  "Human Resource Management (HRM)": "HRM",
  "Co-Curriculum": "CC",
  "Environmental Management & Sustainability": "EMSD",
  "Environmental Management & Sustainable Development (EMSD)": "EMSD"
};

export default function Profile() {
  const { user, login, logout, materials, toggleFavorite, getSubjectById, siteZoom, updateSiteZoom } = useApp();
  const [recentHistory, setRecentHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("recent");
  const [showClearModal, setShowClearModal] = useState(false);
  
  // Edit Profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || "");
  const [editPhoto, setEditPhoto] = useState(user?.photoURL || "");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  // Feedback states
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  
  // Notification states
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Zoom Modal state
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  
  // 🚨 NAYA STATE: Taaki slider se turant zoom na ho
  const [tempZoom, setTempZoom] = useState(siteZoom);

  // Jab bhi popup khule, tempZoom purane size pe set ho jaye
  useEffect(() => {
    if (isZoomModalOpen) {
      setTempZoom(siteZoom);
    }
  }, [isZoomModalOpen, siteZoom]);
  
  // Profile DP Loading State
  const [isDpLoading, setIsDpLoading] = useState(false); // Default false rahega
  
  // Sign out handler with confirmation
  const handleSignOut = async () => {
    const result = await Swal.fire({
      title: 'Sign Out?',
      text: "Are you sure you want to log out of your account?",
      showCancelButton: true,
      confirmButtonText: "Yes, Sign Out",
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
        confirmButton: "bg-rose-500 hover:bg-rose-600 px-5 py-2 rounded-[10px] text-[11px] font-bold text-white",
        cancelButton: "bg-[#2a2a2a] hover:bg-[#3a3a3a] px-5 py-2 rounded-[10px] text-[11px] font-bold text-white"
      }
    });

    if (result.isConfirmed) {
      try {
        await logout();
      } catch (error) {
        console.error('Logout error:', error);
        toast.error('Failed to sign out. Please try again.');
      }
    }
  };
  
  // Refs for click outside
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const favoriteMaterials = materials.filter(m => user?.favorites?.includes(m.id));
  
  useEffect(() => {
    const recent = JSON.parse(localStorage.getItem('recentHistory') || '[]');
    setRecentHistory(recent);
  }, []);
  
  // Fetch notifications
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'notifications'),
      where('targetEmail', 'in', [user.email, 'ALL'])
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notificationList = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notificationList.push({ id: doc.id, ...data });
      });
      
      notificationList.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setNotifications(notificationList);
      
      const activeNotifs = notificationList.filter(n => !(n.deletedBy?.includes(user.email)));
      const unread = activeNotifs.filter(n => !(n.readBy?.includes(user.uid))).length;
      setUnreadCount(unread);
    });
    
    return () => unsubscribe();
  }, [user]);
  
  const markAsRead = async (notificationId) => {
    if (!user) return;
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      const notification = notifications.find(n => n.id === notificationId);
      
      if (notification && (!notification.readBy || !notification.readBy.includes(user.uid))) {
        const updatedReadBy = [...(notification.readBy || []), user.uid];
        await updateDoc(notificationRef, { readBy: updatedReadBy });
        
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, readBy: updatedReadBy } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  const markAllAsRead = async () => {
    if (!user) return;
    const activeNotifs = notifications.filter(n => !(n.deletedBy?.includes(user.email)));
    const unreadNotifs = activeNotifs.filter(n => !(n.readBy?.includes(user.uid)));
    
    setNotifications(prev => 
      prev.map(n => unreadNotifs.some(unread => unread.id === n.id) 
        ? { ...n, readBy: [...(n.readBy || []), user.uid] } : n)
    );
    setUnreadCount(0);
    
    for (const notif of unreadNotifs) {
      try {
        await updateDoc(doc(db, 'notifications', notif.id), { readBy: arrayUnion(user.uid) });
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          bellRef.current && !bellRef.current.contains(event.target)) {
        setIsBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const clearAllData = () => {
    localStorage.removeItem('recentHistory');
    localStorage.removeItem('downloadHistory');
    setRecentHistory([]);
  };
  
  const getInitials = (name) => name ? name.charAt(0).toUpperCase() : "U";
  
  const handleDismissNotification = async (notificationId, targetEmail) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
    const userEmail = user?.email || user?.email;
    if (!userEmail) return;
    try {
      if (targetEmail === 'ALL') {
        await updateDoc(doc(db, 'notifications', notificationId), { deletedBy: arrayUnion(userEmail) });
      } else {
        await deleteDoc(doc(db, 'notifications', notificationId));
      }
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  // Yeh function manual save aur auto-save dono ke liye hai
  const executeSave = async (name, photoUrl, showToast = true) => { // showToast default true hai
    try {
      // 1. Update Firebase Auth Profile
      await updateProfile(auth.currentUser, { 
        displayName: name, 
        photoURL: photoUrl || null 
      });

      // 2. Update Firestore User Document
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        displayName: name,
        photoURL: photoUrl || null
      });

      // Sirf tabhi toast dikhega agar showToast true hoga
      if (showToast) {
        toast.success("Profile Updated Successfully!");
      }
      
      // 🚨 YAHAN SE window.location.reload(); HATA DIYA GAYA HAI 🚨
      // Firebase real-time listeners will handle UI updates automatically
    } catch (error) {
      toast.error("Error: " + error.message);
    }
  };
  
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsEditingProfile(false);
    await executeSave(editName, editPhoto);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setIsUploadingPhoto(true);
    setIsDpLoading(true); // 🚨 Sirf yahan spinner chalu hoga

    try {
      // API call (apni API key yahan zaroor check kar lena)
      const response = await fetch(`https://api.imgbb.com/1/upload?key=18689c27743c695f94310e3bd0a52c99`, {
        method: 'POST',
        body: formData
      });
      const result = await response.json();

      if (result.success) {
        setEditPhoto(result.data.url);
        
        // Yahan maine sirf ek hi final success alert rakha hai
        toast.success("Profile photo updated successfully!");
        
        // Yahan 'false' pass kar rahe hain taaki "Profile Updated..." wala toast na aaye
        await executeSave(editName, result.data.url, false); 
        
        // 🚨 YAHAN PAR YEH NAYI LINE ADD KARNI HAI 🚨
        setIsEditingProfile(false); 
      } else {
        toast.error("Upload failed: " + result.error.message);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Error uploading image");
    } finally {
      setIsUploadingPhoto(false);
    }
  };
  
  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) return;
    setIsSendingFeedback(true);
    try {
      await addDoc(collection(db, 'feedbacks'), { text: feedbackMessage, createdAt: serverTimestamp(), status: 'unread' });
      const q = query(collection(db, 'users'), where('role', '==', 'admin'));
      const querySnapshot = await getDocs(q);
      const adminEmails = [];
      querySnapshot.forEach((doc) => { if (doc.data().email) adminEmails.push(doc.data().email); });
  
      const joinedEmails = adminEmails.join(',');
      window.location.href = `mailto:${joinedEmails}?subject=BNN CS Study Hub Feedback&body=${encodeURIComponent(feedbackMessage)}`;
      setIsFeedbackOpen(false);
      setFeedbackMessage('');
    } catch (error) {
      toast.error('Error sending feedback: ' + error.message);
    } finally {
      setIsSendingFeedback(false);
    }
  };
    
  if (!user) {
    return (
      <div className="p-5 pt-4 max-w-md mx-auto">
        <div className="glass-card p-8 text-center">
          <User size={48} className="mx-auto mb-4 text-white/30" />
          <div className="font-bold text-lg mb-2">Please Login</div>
          <div className="text-white/55 text-sm mb-6">You need to be logged in to view your profile.</div>
          <button
            type="button"
            onClick={async () => {
              try { await login(); } catch (error) { toast.error('Login failed. Please try again.'); }
            }}
            className="w-full py-3 rounded-xl bg-white/10 text-white font-bold flex items-center justify-center gap-2 hover:bg-white/20 border border-white/20 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.76-1.77 3.12-3.77 3.12-2.29 0-4.14-1.86-4.14-4.15s1.85-4.15 4.14-4.15c1.11 0 2.08.41 2.81 1.19l2.06-2.06c-1.27-1.19-2.88-1.92-4.87-1.92-4.02 0-7.29 3.27-7.29 7.29s3.27 7.29 7.29 7.29c3.68 0 6.74-2.69 6.74-7.29 0-.58-.1-1.14-.2-1.67z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <main className="bg-black pt-4 min-h-screen">
        <div className="h-25 bg-black"></div>

        <div className="px-5 pb-8 max-w-md mx-auto">
          <div className="-mt-16 mb-6 relative">
            <div className="absolute top-2 right-4 z-40">
              <button ref={bellRef} onClick={() => {
                if (!isBellOpen && unreadCount > 0) markAllAsRead();
                setIsBellOpen(!isBellOpen);
              }} className="relative">
                <Bell className="text-white" size={24} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
            
            <div className="relative w-24 h-24 inline-block">
              {/* ⏳ Spinner Overlay - Yeh tab dikhega jab upload ho raha ho YA nayi photo load ho rahi ho */}
              {(isUploadingPhoto || isDpLoading) && (
                <div className="absolute inset-0 rounded-full border-[6px] border-zinc-900 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-[#FFD700] rounded-full animate-spin"></div>
                </div>
              )}

              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName} 
                  onLoad={() => setIsDpLoading(false)} // Photo load hote hi spinner band
                  onError={() => setIsDpLoading(false)} 
                  className="w-full h-full rounded-full border-[6px] border-zinc-900 object-cover" 
                />
              ) : (
                <div className="w-full h-full rounded-full border-[6px] border-zinc-900 bg-zinc-800 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{getInitials(user.displayName)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">{user.displayName || "User"}</h1>
            <p className="text-white/60 text-sm mb-4">{user.email}</p>
            
            <div className="flex flex-wrap gap-2 w-full">
              <button
                onClick={() => setIsFeedbackOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-[13px] font-medium min-w-[140px]"
              >
                <BiMessageDetail size={16} />
                <span>Help & Feedback</span>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="flex-none sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors text-[13px]"
                title="Sign Out"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
              
              <a
                href="https://github.com/rishiuttamsahu-lang"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center justify-center shrink-0 border border-zinc-700/50"
                title="Follow me on GitHub"
              >
                <lord-icon
                  src="https://cdn.lordicon.com/ioihllwu.json"
                  trigger="loop"
                  delay="1500"
                  style={{ width: "32px", height: "32px" }}
                ></lord-icon>
              </a>
            </div>
          </div>

          <div className="flex gap-4 mb-4 border-b border-zinc-800 overflow-x-auto whitespace-nowrap no-scrollbar pr-4">
            <button
              onClick={() => setActiveTab("recent")}
              className={`flex-shrink-0 py-2 px-4 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === "recent" ? "text-white border-b-2 border-yellow-400" : "text-white/50 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2"><Clock size={14} />Recent</div>
            </button>
            
            <button
              onClick={() => setActiveTab("favorites")}
              className={`flex-shrink-0 py-2 px-4 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === "favorites" ? "text-white border-b-2 border-yellow-400" : "text-white/50 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2"><Bookmark size={14} />Favorites</div>
            </button>
            
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex-shrink-0 py-2 px-4 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === "settings" ? "text-white border-b-2 border-yellow-400" : "text-white/50 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2"><Settings size={14} />Settings</div>
            </button>
          </div>

          {activeTab === "recent" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg text-white">Recent</h2>
                {recentHistory.length > 0 && (
                  <button
                    onClick={() => setShowClearModal(true)}
                    className="text-xs text-white/50 hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={14} />Clear History
                  </button>
                )}
              </div>
              
              <div className="glass-card">
                {recentHistory.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400">No recent history.</div>
                ) : (
                  <div className="divide-y divide-zinc-800 max-h-80 overflow-y-auto">
                    {recentHistory.map((item, index) => (
                      <div key={`${item.id}-${index}`} className="p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 bg-zinc-800 text-gray-300 text-[10px] rounded whitespace-nowrap">
                              {(item.subject && item.subject.length > 12) ? item.subject.substring(0, 9) + "..." : (item.subject || "N/A")}
                            </span>
                            <span className="text-[10px] text-white/50">{item.type}</span>
                          </div>
                          <h4 className="text-sm text-white/90 truncate">
                            {(item.title && item.title.length > 40) ? item.title.substring(0, 37) + "..." : (item.title || "Untitled")}
                          </h4>
                          <div className="text-[10px] text-zinc-400 mt-1">
                            Viewed: {new Date(item.viewedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => window.open(item.link, "_blank", "noopener,noreferrer")}
                          className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                        >
                          <ExternalLink size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "favorites" && (
            <div className="space-y-3">
              {favoriteMaterials.length > 0 ? (
                favoriteMaterials.map((material) => {
                  const subject = getSubjectById ? getSubjectById(material.subjectId) : null;
                  const shortName = subject ? (SUBJECT_SHORT_NAMES[subject.name] || subject.name) : "Unknown";

                  return (
                    <div key={material.id} className="glass-card p-3 sm:p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="bg-white/5 p-2 rounded-lg shrink-0">
                          <FileText className="text-blue-400" size={20} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-white/90 text-sm truncate">{material.title}</h4>
                          <p className="text-xs text-white/50 mt-0.5 truncate">
                            {material.type} • {shortName}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <a 
                          href={material.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 bg-blue-500/15 text-blue-300 rounded-xl hover:bg-blue-500/25 transition-colors"
                        >
                          <Upload size={16} />
                        </a>
                        <button 
                          onClick={(e) => { e.preventDefault(); toggleFavorite(material.id); }}
                          className="p-2 bg-yellow-500/20 text-yellow-400 rounded-xl hover:bg-yellow-500/30 transition-colors"
                        >
                          <Bookmark size={16} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center border-dashed border-2 border-white/10 rounded-xl glass-card">
                  <Bookmark className="mx-auto text-white/20 mb-3" size={32} />
                  <p className="text-white/50 font-medium">No saved materials yet</p>
                  <p className="text-white/30 text-xs mt-1">Items you bookmark in the library will appear here.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="glass-card p-6 max-w-full overflow-x-hidden">
              <h3 className="font-bold text-lg mb-6 text-white">Settings</h3>
              <div className="space-y-4">
                {/* Display Size Settings Button */}
        <button 
          onClick={() => setIsZoomModalOpen(true)}
          className="w-full flex items-center justify-between p-4 bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors border border-zinc-800/50 rounded-xl mb-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
              <Monitor size={20} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-white text-sm">Display Size</h3>
              <p className="text-[11px] text-zinc-400">Scale interface (Current: {siteZoom}%)</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-zinc-500" />
        </button>

        {/* 🚨 EXACT SAME UI IN A POPUP (MODAL) 🚨 */}
        {isZoomModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-[#18181b] border border-zinc-800 rounded-2xl p-5 shadow-2xl relative">
              
              {/* Close Button (X) */}
              <button 
                onClick={() => setIsZoomModalOpen(false)} 
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              {/* Exact UI matching your favorite design */}
              <div className="flex items-center gap-3 mb-5 pr-8">
                <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                  <Monitor size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Display Size</h3>
                  <p className="text-[11px] text-zinc-400">Adjust the interface scale</p>
                </div>
                {/* Current Percentage Badge (Uses tempZoom now) */}
                <div className="ml-auto px-3 py-1 bg-zinc-900 rounded-lg border border-zinc-800 shadow-inner">
                  <span className="text-sm font-bold text-[#FFD700]">{tempZoom}%</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 px-1">
                {/* Minus Button */}
                <button 
                  onClick={() => setTempZoom(Math.max(80, tempZoom - 5))}
                  className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
                </button>
                
                {/* Enhanced Range Slider */}
                <input 
                  type="range" 
                  min="80" 
                  max="120" 
                  step="5"
                  value={tempZoom}
                  onChange={(e) => setTempZoom(Number(e.target.value))}
                  className="flex-1 accent-[#FFD700] h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer outline-none"
                />
                
                {/* Plus Button */}
                <button 
                  onClick={() => setTempZoom(Math.min(120, tempZoom + 5))}
                  className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                </button>
              </div>
              
              {/* 🚨 Reset Button AND Tick Button (Same Design) 🚨 */}
              <div className="mt-5 flex justify-center gap-3">
                <button 
                  onClick={() => setTempZoom(window.innerWidth <= 425 ? 85 : 100)}
                  className="text-xs px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 transition-all font-medium border border-white/10 active:scale-95"
                >
                  Reset to Default
                </button>
                
                {/* Tick Button for Saving - Exact same classes */}
                <button 
                  onClick={() => {
                    updateSiteZoom(tempZoom);
                    setIsZoomModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 transition-all font-medium border border-white/10 active:scale-95 flex items-center justify-center"
                >
                  <Check size={16} strokeWidth={3} />
                </button>
              </div>

            </div>
          </div>
        )}

                <div 
                  className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg cursor-pointer hover:bg-zinc-800/50 transition-colors"
                  onClick={() => setIsEditingProfile(true)}
                >
                  <div>
                    <div className="font-medium text-white">Edit Profile</div>
                    <div className="text-xs text-white/50">Update your profile information</div>
                  </div>
                  <Settings size={18} className="text-white/50" />
                </div>
                
                <div className="pt-4 border-t border-zinc-800">
                  <button
                    onClick={clearAllData}
                    className="w-full py-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-medium hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />Clear All Data
                  </button>
                  <p className="text-xs text-white/50 mt-2 text-center">
                    This will remove all history and reset your profile
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card p-6 w-full max-w-md rounded-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Edit Profile</h3>
              <button onClick={() => setIsEditingProfile(false)} className="text-white/50 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full glass-card px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Profile Picture URL</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="url"
                    value={editPhoto}
                    onChange={(e) => setEditPhoto(e.target.value)}
                    placeholder="Paste URL or click upload"
                    className="w-full glass-card px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:border-blue-500 focus:outline-none"
                  />
                  
                  {/* Hidden File Input */}
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload}
                    accept="image/*" 
                  />
                  
                  {/* Upload Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    disabled={isUploadingPhoto}
                    className="p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl border border-zinc-700 transition-colors flex items-center justify-center shrink-0 min-w-[50px] disabled:opacity-50"
                    title="Upload from Gallery"
                  >
                    {isUploadingPhoto ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <Upload size={20} />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">
                  Save Changes
                </button>
                <button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 glass-card py-3 font-bold rounded-xl border border-white/10 text-white/70 hover:bg-white/5">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear History Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700/50 w-full max-w-sm p-6 rounded-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
            <div className="flex flex-col items-center text-center gap-4 mt-2">
              <div className="p-4 bg-zinc-800 rounded-full text-purple-400 mb-1 ring-1 ring-purple-500/30">
                <Sparkles size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Time for a Fresh Start?</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  This will wipe your entire viewing history. <br />It&apos;s like it never happened.✨
                </p>
              </div>
              <div className="flex gap-3 w-full mt-4">
                <button onClick={() => setShowClearModal(false)} className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all font-medium border border-zinc-700">
                  Nah, keep it
                </button>
                <button onClick={() => { clearAllData(); setShowClearModal(false); }} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl transition-all font-bold shadow-lg shadow-purple-500/20">
                  Yes, Clear All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Feedback Modal */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700/50 w-full max-w-md p-6 rounded-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Send Feedback</h3>
                <button onClick={() => setIsFeedbackOpen(false)} className="text-white/50 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Enter your feedback here..."
                className="w-full h-40 p-3 bg-zinc-800 text-white rounded border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
              />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsFeedbackOpen(false)} disabled={isSendingFeedback} className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all font-medium border border-zinc-700 disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleSendFeedback} disabled={isSendingFeedback || !feedbackMessage.trim()} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black rounded-xl transition-all font-bold shadow-lg shadow-yellow-500/20 disabled:opacity-50">
                  {isSendingFeedback ? 'Sending...' : 'Send to Admins'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Dropdown */}
      {isBellOpen && (
        <div ref={dropdownRef} className="fixed top-20 right-5 z-50 w-80 max-h-96 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 bg-zinc-800 border-b border-zinc-700">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Bell size={18} /> Notifications
            </h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-zinc-800">
                {notifications.map((notification) => {
                  if (notification.deletedBy && notification.deletedBy.includes(user.email)) return null;
                  
                  const isUnread = !notification.readBy || !notification.readBy.includes(user.uid);
                  return (
                    <div 
                      key={notification.id} 
                      className={`p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer ${isUnread ? 'bg-zinc-800/30' : ''}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-2">
                        <h4 className="font-semibold text-white text-sm flex-1">{notification.title}</h4>
                        {isUnread && <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>}
                        <button 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDismissNotification(notification.id, notification.targetEmail); }}
                          className="text-zinc-400 hover:text-white transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="relative overflow-hidden flex whitespace-nowrap pt-1 w-full">
                        <div 
                          key={`marquee-${notification.id}-${isBellOpen ? 'open' : 'closed'}`} 
                          className="flex animate-marquee w-max"
                          style={{ 
                            animationDelay: '1.5s', 
                            animationFillMode: 'backwards' 
                          }}
                        >
                          <span className="text-sm text-zinc-400 pr-10">{notification.message}</span>
                          <span className="text-sm text-zinc-400 pr-10" aria-hidden="true">{notification.message}</span>
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500 mt-2">
                        {notification.createdAt?.toDate().toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-zinc-500">No notifications yet</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}