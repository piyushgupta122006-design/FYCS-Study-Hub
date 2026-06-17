import { Home, Shield, Upload, User, Library, Loader2 } from "lucide-react"; // 🚨 Loader2 wapas import kiya
import { Link, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useState, useEffect } from "react";
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const Navbar = () => {
  const location = useLocation();
  const { isAdmin, user } = useApp();
  const [hasUnread, setHasUnread] = useState(false);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  
  const [loadingPath, setLoadingPath] = useState(null);

  // 🚨 1. NAYA PATH CHECK LOGIC (Hash ki jagah Pathname)
  const currentPath = location.pathname;

  // Jaise hi path change hoga, spinner band ho jayega
  useEffect(() => {
    setLoadingPath(null);
  }, [currentPath]);

  useEffect(() => {
    const currentUserEmail = user?.email; 
    if (!currentUserEmail) {
      setHasUnread(false);
      return;
    }

    const q = query(collection(db, 'notifications'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const unreadExists = snapshot.docs.some(doc => {
        const data = doc.data();
        const isTarget = data.targetEmail === 'ALL' || data.targetEmail === currentUserEmail;
        const isDeleted = data.deletedBy && data.deletedBy.includes(currentUserEmail);
        const isRead = data.readBy && data.readBy.includes(user.uid); 
        
        return isTarget && !isDeleted && !isRead; 
      });
      setHasUnread(unreadExists);
    });

    return () => unsubscribe();
  }, [user?.email, user?.uid]);
  
  // Fetch unresolved reports count
  useEffect(() => {
    if (!isAdmin) {
      setUnresolvedCount(0);
      return;
    }
    
    const q = query(collection(db, 'reports'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lastChecked = localStorage.getItem('lastCheckedReports') || 0;
      const unreadExists = snapshot.docs.some(doc => {
        const data = doc.data();
        const isUnresolved = data.status !== 'resolved';
        const isNew = data.createdAt?.toMillis() > Number(lastChecked);
        return isUnresolved && isNew;
      });
      
      setUnresolvedCount(unreadExists ? 1 : 0);
    });
    
    return () => unsubscribe();
  }, [isAdmin]);
  
  // Build nav items conditionally
  const navItems = isAdmin ? [
    { icon: <Home size={22} />, label: "Home", path: "/" },
    { icon: <Library size={22} />, label: "Library", path: "/library" },
    { icon: <Upload size={22} />, label: "Upload", path: "/admin-upload" },
    { icon: <Shield size={22} />, label: "Admin", path: "/admin" },
    { icon: <User size={22} />, label: "Profile", path: "/profile" },
  ] : [
    { icon: <Home size={22} />, label: "Home", path: "/" },
    { icon: <Library size={22} />, label: "Library", path: "/library" },
    { icon: <Upload size={22} />, label: "Upload", path: "/upload" },
    { icon: <User size={22} />, label: "Profile", path: "/profile" },
  ];

  // 🚨 2. EXACT MATCH ACTIVE TAB LOGIC
  const isActive = (path) => {
    if (path === '/') {
      // Home tab tabhi active hoga jab actual path '/' ho ya koi andar ka '/semester' page ho
      return currentPath === '/' || currentPath.startsWith('/semester');
    }
    if (path === '/admin') {
      return currentPath.startsWith('/admin');
    }
    // Baaki tabs ke liye EXACT match chahiye taaki /admin aur /admin-upload mix na hon
    return currentPath === path;
  };

  // 🚨 Click Handle Function for Spinner
  const handleTabClick = (path) => {
    if (!isActive(path)) {
      setLoadingPath(path);
    }
  };

  return (
    <nav className="glass-nav px-2 py-3">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path} 
            onClick={() => handleTabClick(item.path)} // Spinner trigger karega
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive(item.path)
                ? "text-[#FFD700]"
                : "text-zinc-300 hover:text-white/80"
            }`}
          >
            <div className="relative">
              {/* 🚨 Spinner Condition */}
              {loadingPath === item.path ? (
                <Loader2 size={22} className="animate-spin text-[#FFD700]" />
              ) : (
                item.icon
              )}

              {item.path === "/profile" && hasUnread && loadingPath !== item.path && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black"></span>
              )}
              {item.path === "/admin" && unresolvedCount > 0 && loadingPath !== item.path && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border border-black">
                  {unresolvedCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;