import { BookOpen, Download, FileText, GraduationCap, Layers, Lock, Circle, Loader2 } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useState, useEffect, startTransition } from "react";
import dbLogo from "/logo.png";
import MaterialCard from "../components/MaterialCard";

// Shared shimmer primitive (matches App.jsx route-level skeletons so the
// transition from "global skeleton" -> "section skeleton" -> "real content"
// is visually seamless)
const Sk = ({ className, style }) => (
  <div className={`bg-white/10 animate-pulse rounded ${className || ''}`} style={style} />
);

// Placeholder shown only for the Semesters grid while `subjects` is loading.
// The rest of the page (header, section titles, materials) is unaffected.
const SemestersGridSkeleton = () => (
  <div className="grid grid-cols-2 gap-4 mb-8">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="glass-card p-4 min-h-[132px]">
        <Sk className="w-9 h-9 rounded-full mb-3" />
        <Sk className="h-3.5 w-24 mb-2" />
        <Sk className="h-2.5 w-20 mb-2" />
        <Sk className="h-5 w-14 rounded-full" />
      </div>
    ))}
  </div>
);

// Placeholder shown only for the recent-materials list while `materials` is loading.
const RecentMaterialsSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="glass-card p-4 flex items-start gap-3">
        <Sk className="w-10 h-10 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Sk className="h-3.5 w-3/4" /><Sk className="h-3 w-1/2" /><Sk className="h-2.5 w-1/3" />
        </div>
        <Sk className="w-7 h-7 rounded-md flex-shrink-0" />
      </div>
    ))}
  </div>
);

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loadingCard, setLoadingCard] = useState(null);
  const {
    semesters,
    getSubjectById,
    getSemesterById,
    isAdmin,
    subjects,
    getRecentMaterials,
    materialsLoading,
    subjectsLoading,
  } = useApp();

  // Reset the loading spinner when navigation completes
  useEffect(() => {
    setLoadingCard(null);
  }, [location.pathname]);
  
  // Get recent approved materials from the global context
  const recentMaterials = getRecentMaterials(5);

  const semestersVm = semesters.map((s) => ({
    id: s.id,
    title: s.name,
    subjects: subjects.filter((sub) => Number(sub.semId) === Number(s.id)).length,
    locked: s.id === '4', // Lock only semester 4
    academicYear: s.id === '1' || s.id === '2' ? '2025-26' : s.id === '3' ? '2026-27' : '',
  }));

  // Use cached recent materials
  const recentApproved = recentMaterials.slice(0, 5);
  
  // Helper function to check if material is new (within 24 hours)
  const isNewMaterial = (material) => {
    if (!material.createdAt) return false;
    
    // Handle both Timestamp objects and regular dates
    const createdAt = material.createdAt?.toDate ? 
      material.createdAt.toDate() : 
      new Date(material.createdAt || material.date || Date.now());
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return createdAt > twentyFourHoursAgo;
  };
  
  // Helper function to convert Google Drive view links to direct download links
  const convertToDownloadLink = (viewLink) => {
    if (!viewLink) return viewLink;
    
    // Handle different Google Drive URL formats
    
    // Pattern 1: drive.google.com/file/d/{fileId}/view
    if (viewLink.includes("drive.google.com/file/d/")) {
      // Extract file ID from the URL
      const fileIdMatch = viewLink.match(/\/file\/d\/([^\/]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}&confirm=t`;
      }
    } 
    // Pattern 2: drive.google.com/open?id={fileId} (legacy format)
    else if (viewLink.includes("drive.google.com/open?id=")) {
      // Extract file ID from the legacy URL format
      const urlObj = new URL(viewLink);
      const fileId = urlObj.searchParams.get("id");
      if (fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
      }
    }
    // Pattern 3: Extract ID from URL between /d/ and /view (as specified in requirements)
    else if (viewLink.includes("/d/") && viewLink.includes("/view")) {
      const fileIdMatch = viewLink.match(/\/d\/([^\/]+)\/view/);
      if (fileIdMatch && fileIdMatch[1]) {
        return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}&confirm=t`;
      }
    }
    
    // If it's not a Google Drive link, return the original link
    return viewLink;
  };

  // 🚀 PROGRESSIVE RENDERING
  // No more "wait for everything, then swap the whole page". The static
  // shell (header, titles) renders immediately on first paint. Each data
  // section (Semesters grid, Materials list) independently shows its own
  // tiny skeleton ONLY until ITS data arrives, then renders for real —
  // without waiting on the other section.
  return (
    <div className="p-5 pt-10 max-w-md mx-auto">
      {/* Header Section */}
      <div className="text-center mb-10">
        <img src={dbLogo} alt="BNN CS Study Hub Logo" width="64" height="64" className="w-16 h-16 object-contain mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">BNN CS Study Hub</h1>
        <p className="text-gray-400 text-xs">Your central hub for BNN computer science students</p>
      </div>

      {/* Quick Section Title */}
      <div className="flex items-center gap-2 mb-4 text-white/50 uppercase text-[10px] tracking-widest font-bold">
        <BookOpen size={14} />
        <span>Quick Section</span>
      </div>

      {/* Semesters Grid */}
      {subjectsLoading ? (
        <SemestersGridSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-8">
          {semestersVm.map((sem) => {
            const isLocked = sem.locked;
            const isSem3 = sem.id === '3'; // For the ongoing semester emphasis

            const handleCardClick = (e, path, id) => {
              e.preventDefault();
              if (isLocked) return;
              if (location.pathname !== path) {
                setLoadingCard(id);
                // Use React 18 concurrent feature for smooth, non-blocking UI
                startTransition(() => {
                  navigate(path);
                });
              }
            };

            return (
            <button
              key={sem.id}
              type="button"
              onClick={(e) => handleCardClick(e, `/semester/${sem.id}`, sem.id)}
              disabled={isLocked}
              className={`glass-card p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-gray-500 max-w-[320px] ${isLocked ? 'opacity-70 cursor-not-allowed' : 'hover:bg-white/5'} relative`}
            >
              <div className="bg-gray-800/50 p-2 rounded-full w-fit mb-3 relative">
                {loadingCard === sem.id ? (
                  <Loader2 className="animate-spin text-[#FFD700]" size={18} />
                ) : (
                  <GraduationCap size={16} className="text-white/90" />
                )}
                {isLocked && (
                  <Lock size={12} className="absolute -top-1 -right-1 text-amber-400" />
                )}
                {isSem3 && !isLocked && (
                  <Circle size={6} className="absolute -top-0.5 -right-0.5 text-green-500 fill-current animate-pulse" />
                )}
              </div>
              <h2 className="font-bold text-sm mb-2 flex items-center gap-1">
                {sem.title}
                {isSem3 && !isLocked && (
                  <span className="text-[8px] text-green-500 bg-green-500/10 px-1 py-0.5 rounded">LIVE</span>
                )}
              </h2>
              {isLocked ? (
                <span className="inline-block px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] rounded-full whitespace-nowrap">
                  Coming Soon
                </span>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] text-white/50">{sem.subjects} subjects available</p>
                  {sem.academicYear && (
                    <span className="text-xs px-2 py-1 bg-gray-800/50 text-gray-400 rounded-md inline-block">
                      {sem.academicYear}
                    </span>
                  )}
                </div>
              )}
            </button>
            );
          })}
        </div>
      )}

      {/* Materials Section */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-white/50 uppercase text-[10px] tracking-widest font-bold">
          <Layers size={14} />
          <span>Materials</span>
        </div>
        <Link to="/library" className="text-[11px] font-semibold text-[#FFD700] hover:opacity-90 transition-opacity">
          Explore
        </Link>
      </div>

      {materialsLoading ? (
        <RecentMaterialsSkeleton />
      ) : (
        <div className="space-y-4">
          {recentApproved && recentApproved.length > 0 ? (
            recentApproved.map((m) => (
              <MaterialCard 
                key={m.id} 
                material={m} 
                convertToDownloadLink={convertToDownloadLink}
                navigateToSubject={true}
                navigate={navigate}
                isNewMaterial={isNewMaterial}
                getSubjectById={getSubjectById}
              />
            ))
          ) : (
            <div className="glass-card p-8 text-center">
              <div className="text-white/50 mb-2">No materials found</div>
              <div className="text-sm text-white/40">
                No materials available yet
              </div>
              {isAdmin && (
                <button
                  type="button"
                  className="btn-primary mt-4 px-6 py-2 text-sm"
                  onClick={() => navigate("/upload")}
                >
                  Upload Material
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
