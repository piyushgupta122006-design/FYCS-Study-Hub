import { Home, Layers, Shield, Upload, User, Library, Loader2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

const Navbar = () => {
  const location = useLocation();
  const { isAdmin, user } = useApp();
  const [hasUnread, setHasUnread] = useState(false);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [loadingPath, setLoadingPath] = useState(null);

  // Automatically reset the loading spinner once the route successfully changes
  useEffect(() => {
    setLoadingPath(null);
  }, [location.pathname]);
  
  useEffect(() => {
    // Ensure you use your actual user variable (user.email or currentUser.email)
    const currentUserEmail = user?.email || user?.email; 
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
        const isRead = data.readBy && data.readBy.includes(user.uid); // Use uid for readBy check
        
        // It is unread ONLY if it's meant for the user, AND not deleted, AND not read.
        return isTarget && !isDeleted && !isRead; 
      });
      
      setHasUnread(unreadExists);
    });

    return () => unsubscribe();
  }, [user?.email, user?.uid]); // Re-run if user email changes
  
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
      
      setUnresolvedCount(unreadExists ? 1 : 0); // Set to 1 if there are unread reports, 0 otherwise
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

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  // Non-blocking click handler
  const handleTabClick = (path) => {
    // Only show loader if we are actually navigating to a different page
    if (location.pathname !== path) {
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
            onClick={() => handleTabClick(item.path)}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive(item.path)
                ? "text-[#FFD700]"
                : "text-zinc-300 hover:text-white/80"
            }`}
          >
            <div className="relative">
              {loadingPath === item.path ? (
                <Loader2 className="animate-spin text-[#FFD700]" size={22} />
              ) : (
                item.icon
              )}
              {item.path === "/profile" && hasUnread && !loadingPath && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black"></span>
              )}
              {item.path === "/admin" && unresolvedCount > 0 && !loadingPath && (
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