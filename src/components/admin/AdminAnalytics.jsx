import { useNavigate } from "react-router-dom";
import { FileText, Eye, Users, Clock } from "lucide-react";

export default function AdminAnalytics({ safeStats, todayVisitors, uniqueUsersCount, formatNumber }) {
  const navigate = useNavigate();

  return (
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
        
        <div 
          onClick={() => navigate("/admin/analytics/visitors")}
          className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-center hover:border-cyan-500/50 transition-all cursor-pointer hover:bg-zinc-800/50 group"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-400 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 group-hover:text-cyan-300 transition-colors">
              Today's Visitors
            </p>
            <Users size={16} className="text-cyan-400 group-hover:scale-110 transition-transform" />
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
            <div className="font-bold">{uniqueUsersCount}</div>
          </div>
        </div>
      </div>
    </>
  );
}
