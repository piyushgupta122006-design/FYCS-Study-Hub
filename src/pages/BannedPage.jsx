import { LockKeyhole, Mail, LogOut, Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useState } from "react";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function BannedPage() {
  const { logout } = useApp();
  const [isContacting, setIsContacting] = useState(false);

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error signing out:", error);
      // Fallback to hard refresh if logout fails
      window.location.href = "/";
    }
  };

  const handleContactAdmin = async () => {
    setIsContacting(true);
    try {
      // Fetch admins from database
      const q = query(collection(db, 'users'), where('role', '==', 'admin'));
      const querySnapshot = await getDocs(q);
      const adminEmails = [];
      querySnapshot.forEach((doc) => {
        if (doc.data().email) adminEmails.push(doc.data().email);
      });

      // Creators fallback (ensure creators always get it)
      const creatorEmails = ["rishiuttamsahu@gmail.com", "piyushgupta122006@gmail.com"];
      
      // Merge and remove duplicates
      const allTargetEmails = [...new Set([...adminEmails, ...creatorEmails])];
      const joinedEmails = allTargetEmails.join(',');
      
      const subject = encodeURIComponent("Account Unban Request - BNN CS Study Hub");
      const body = encodeURIComponent("Hello Admins,\n\nMy account has been temporarily paused. Could you please review my status and restore my access?\n\nThank you.");
      
      window.location.href = `mailto:${joinedEmails}?subject=${subject}&body=${body}`;
    } catch (error) {
      console.error('Error fetching admins:', error);
      // Fallback to direct creator email
      window.location.href = `mailto:rishiuttamsahu@gmail.com?subject=Account Unban Request - BNN CS Study Hub`;
    } finally {
      setIsContacting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(245, 158, 11, 0.15) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl animate-pulse" />
      
      {/* Glass Card Container */}
      <div className="relative z-10 max-w-md w-full">
        <div className="bg-zinc-900/70 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-8 shadow-2xl shadow-orange-500/20">
          <div className="text-center">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500/30 to-orange-600/30 border border-orange-500/50 flex items-center justify-center shadow-lg shadow-orange-500/30 backdrop-blur-sm">
                <LockKeyhole 
                  size={48} 
                  className="text-orange-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" 
                />
              </div>
            </div>
            
            {/* Title */}
            <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Access Paused
            </h1>
            
            {/* Message */}
            <p className="text-zinc-300 text-sm mb-8 leading-relaxed">
              We noticed some activity that requires a check. Your access is temporarily paused. 
              Please contact the admin to resolve this quickly.
            </p>
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-4 mb-6">
              {/* Contact Admin Button */}
              <button
                onClick={handleContactAdmin}
                disabled={isContacting}
                className="w-full py-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold flex items-center justify-center gap-3 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isContacting ? (
                  <><Loader2 className="animate-spin" size={20} /> Contacting...</>
                ) : (
                  <><Mail size={20} /> Contact Admin</>
                )}
              </button>
              
              {/* Sign Out Button */}
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-4 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-white font-bold flex items-center justify-center gap-3 hover:scale-105 transition-all duration-300"
              >
                <LogOut size={20} />
                Sign Out
              </button>
            </div>
            
            {/* Support Info */}
            <div className="mt-6 text-center">
              <p className="text-zinc-400 text-xs">
                For assistance, tap the Contact Admin button above.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}