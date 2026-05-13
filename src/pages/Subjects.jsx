import { ArrowLeft, Book, Search, X, Loader2 } from "lucide-react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useState, useEffect, startTransition } from "react";

export default function Subjects() {
  const navigate = useNavigate();
  const location = useLocation();
  const { semId } = useParams();
  
  const [loadingSubject, setLoadingSubject] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { subjects, getSemesterById, getSubjectsBySemester, getMaterialsBySubject } = useApp();

  // Auto-reset the spinner when navigation completes
  useEffect(() => {
    setLoadingSubject(null);
  }, [location.pathname]);
  
  // Safety check: Ensure subjects data exists
  if (!subjects) {
    return (
      <div className="p-5 pt-8 max-w-md mx-auto">
        <div className="glass-card p-6 text-center">
          <div className="font-semibold text-white">Loading subjects...</div>
          <div className="text-sm text-white/50 mt-2">Please wait</div>
        </div>
      </div>
    );
  }
  
  // Get semester info
  const semester = getSemesterById(semId);
  
  // Safety check: Semester not found
  if (!semester) {
    return (
      <div className="p-5 pt-8 max-w-md mx-auto">
        <div className="glass-card p-6">
          <div className="font-semibold text-white mb-2">Semester not found</div>
          <div className="text-sm text-white/50 mb-4">
            Please go back and choose a valid semester.
          </div>
          <button
            type="button"
            className="btn-primary w-full"
            onClick={() => navigate("/")}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }
  
  // Get subjects for this semester (with type-safe filtering)
  const semesterSubjects = getSubjectsBySemester(semId) || [];
  
  return (
    <div className="p-5 pt-6 max-w-md mx-auto">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="glass-card h-10 w-10 flex items-center justify-center hover:bg-white/10 transition-colors"
          aria-label="Back to Home"
          title="Back to Home"
        >
          <ArrowLeft size={18} className="text-white/80" />
        </button>
        
        <div className="text-center">
          <div className="text-xs text-white/55 uppercase tracking-wider font-bold">Subjects</div>
          <div className="font-bold text-lg">{semester.name}</div>
        </div>
        
        <div className="w-10" /> {/* Spacer for alignment */}
      </div>

      {/* Subject List Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 text-sm font-bold text-zinc-400 tracking-wider">
          <Book size={14} />
          <span>SUBJECT LIST</span>
        </div>
        <button
          onClick={() => {
            setIsSearchOpen(!isSearchOpen);
            if (isSearchOpen) setSearchQuery(''); // Clear search on close
          }}
          className="text-zinc-400 hover:text-yellow-400 p-1 transition-colors"
        >
          {isSearchOpen ? <X size={18} /> : <Search size={18} />}
        </button>
      </div>

      {isSearchOpen && (
        <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Subjects Grid */}
      <div className="space-y-3">
        {semesterSubjects && semesterSubjects.length > 0 ? (
          semesterSubjects.filter(subject => 
            subject.name.toLowerCase().includes(searchQuery.toLowerCase())
          ).map((subject) => {
            // Get approved materials count for this subject
            const approvedCount = getMaterialsBySubject(subject.id)?.length || 0;
            
            const handleSubjectClick = (e, path, id) => {
              e.preventDefault();
              if (location.pathname !== path) {
                setLoadingSubject(id);
                // Use React 18 concurrent feature for smooth, non-blocking UI
                startTransition(() => {
                  navigate(path);
                });
              }
            };

            return (
              <button
                key={subject.id}
                type="button"
                onClick={(e) => handleSubjectClick(e, `/semester/${semId}/${subject.id}`, subject.id)}
                className="glass-card w-full p-4 flex items-center gap-3 transition-all hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98] text-left"
              >
                {/* Subject Icon */}
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-extrabold text-xs text-white/85">
                  {subject.name
                    .split(" ")
                    .slice(0, 2)
                    .map((word) => word[0]?.toUpperCase() || "")
                    .join("")}
                </div>

                {/* Subject Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate text-white">{subject.name}</div>
                  <div className="text-xs text-white/55 truncate">
                    {approvedCount} approved material{approvedCount !== 1 ? "s" : ""}
                  </div>
                </div>

                {/* Arrow/Spinner */}
                <div className="text-white/40">
                  {loadingSubject === subject.id ? (
                    <Loader2 className="animate-spin text-[#FFD700]" size={20} />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  )}
                </div>
              </button>
            );
          })
        ) : (
          // Empty State
          <div className="glass-card p-8 text-center">
            <div className="text-white/50 mb-2">
              <Book size={32} className="mx-auto mb-3 opacity-50" />
            </div>
            <div className="font-semibold text-white mb-1">No subjects found</div>
            <div className="text-sm text-white/40">
              No subjects are available for {semester.name} yet.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

