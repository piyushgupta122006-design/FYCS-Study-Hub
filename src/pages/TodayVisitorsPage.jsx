import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { ArrowLeft, Users, Clock, Search } from "lucide-react";

export default function TodayVisitorsPage() {
  const navigate = useNavigate();
  const [visitorDetails, setVisitorDetails] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    const statRef = doc(db, 'analytics', today);
    const unsubscribe = onSnapshot(statRef, (docSnap) => {
      if (docSnap.exists()) {
        setVisitorDetails(docSnap.data().visitorDetails || []);
      } else {
        setVisitorDetails([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const sortedVisitors = useMemo(() => {
    const sorted = [...visitorDetails].sort((a, b) => new Date(b.time) - new Date(a.time));
    if (!searchTerm.trim()) return sorted;
    const term = searchTerm.toLowerCase();
    return sorted.filter(v => 
      (v.name || "").toLowerCase().includes(term) || 
      (v.email || "").toLowerCase().includes(term)
    );
  }, [visitorDetails, searchTerm]);

  return (
    <div className="p-5 pt-8 max-w-lg mx-auto min-h-[100dvh] pb-24 relative">
      {/* Sleek Premium Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/admin/analytics")}
          className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all flex items-center justify-center cursor-pointer"
          title="Back to Admin"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white/90 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
            Today's Visitors
          </h1>
          <p className="text-sm text-white/50 mt-1">Logs of all verified student logins for today</p>
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-10 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm text-white/50">Syncing live analytics...</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 self-start text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <Users size={16} />
              <span className="text-xs font-bold">Logins Today: {visitorDetails.length}</span>
            </div>
            {searchTerm.trim() && (
              <div className="text-xs text-white/50">
                Found {sortedVisitors.length} matches
              </div>
            )}
          </div>

          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-white/50" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search visitors by name or email..."
                className="w-full glass-card pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#FFD700] focus:outline-none transition-all duration-300"
              />
            </div>
          </div>

          <div className="p-4 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
            {sortedVisitors.length > 0 ? (
              sortedVisitors.map((visitor, index) => (
                <div key={index} className="glass-card bg-white/5 p-4 border border-white/5 flex items-center justify-between gap-4 transition-colors hover:border-white/10 duration-200">
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-white text-sm truncate">{visitor.name}</span>
                    <span className="text-xs text-white/50 truncate mt-0.5">{visitor.email}</span>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-bold rounded-lg border border-cyan-500/20">
                      <Clock size={12} />
                      {new Date(visitor.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Users size={36} className="mx-auto text-white/20 mb-3" />
                <p className="text-sm font-bold text-white/60">No matching logins found.</p>
                <p className="text-xs text-white/40 mt-1">Try refining your search keyword.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
