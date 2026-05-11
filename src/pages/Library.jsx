import { FileText, Search, BookOpen, GraduationCap, Download, ArrowUpDown, Check } from "lucide-react";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { useData } from "../context/DataContext";
import MaterialCard from "../components/MaterialCard";

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

export default function Library() {
  const { subjects, semesters, getSubjectById, getSemesterById } = useApp();
  const { libraryMaterials, fetchLibraryData, isLibraryLoaded } = useData();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("all"); // default 'all'
  const [selectedType, setSelectedType] = useState("all"); // default 'all'
  const [selectedSubject, setSelectedSubject] = useState("all"); // 🚨 NAYI STATE ADD KI HAI
  const [sortBy, setSortBy] = useState("newest"); // Default to newest first
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [localLoading, setLocalLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(15);
  const observer = useRef();
  const sortRef = useRef(null);

  const lastElementRef = useCallback((node) => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) => prev + 15);
      }
    });
    if (node) observer.current.observe(node);
  }, []);

  // Fetch library data on mount using global cache
  useEffect(() => {
    setLocalLoading(true);
    fetchLibraryData().finally(() => {
      setLocalLoading(false);
    });
  }, [fetchLibraryData]);

  // 🚨 JAB BHI SEMESTER BADLE, SUBJECT 'ALL' PAR RESET HO JAYE
  useEffect(() => {
    setSelectedSubject("all");
  }, [selectedSemester]);

  // 🚨 SUBJECT DROPDOWN FILTER LOGIC - Same as Admin.jsx
  let filteredSubjectsForDropdown = [];
  
  if (selectedSemester === "all" || selectedSemester === "") {
    filteredSubjectsForDropdown = subjects || []; 
  } else {
    const { getSubjectsBySemester } = useApp();
    filteredSubjectsForDropdown = getSubjectsBySemester?.(selectedSemester) || [];
  }

  // Reset visible count when search or filters change
  useEffect(() => {
    setVisibleCount(15);
  }, [searchTerm, selectedSemester, selectedType, sortBy]);

  // Outside click logic for sort dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setShowSortMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Defer heavy rendering to unblock navigation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 50); // Increased to 50ms for better performance
    
    return () => clearTimeout(timer);
  }, []);
  
  // Skeleton Card Component
  const SkeletonCard = () => (
    <div className="glass-card p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-zinc-800 rounded-lg flex-shrink-0"></div>
        <div className="flex-1">
          <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-zinc-800 rounded w-1/2 mb-1"></div>
          <div className="h-3 bg-zinc-800 rounded w-2/3"></div>
        </div>
      </div>
    </div>
  );

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

  // Get unique types from library materials
  const allTypes = useMemo(() => {
    const types = new Set();
    libraryMaterials.forEach(material => {
      if (material.type) {
        types.add(material.type);
      }
    });
    return Array.from(types).sort();
  }, [libraryMaterials]);

  // Filter and sort materials based on search term, filters, and sort option
  const filteredMaterials = useMemo(() => {
    let result = libraryMaterials.filter(material => {
      // Filter by search term (title or subject name)
      const matchesSearch = !searchTerm || 
        material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getSubjectById(material.subjectId)?.name.toLowerCase().includes(searchTerm.toLowerCase());

      // Filter by semester
      const matchesSemester = selectedSemester === "all" || material.semId === selectedSemester;

      // Filter by type
      const matchesType = selectedType === "all" || material.type.toLowerCase() === selectedType.toLowerCase();

      // 🚨 NAYA: Filter by Subject
      const matchesSubject = selectedSubject === "all" || material.subjectId === selectedSubject;

      // Only show approved materials
      const isApproved = material.status === "Approved";

      // 🚨 Return mein matchesSubject add kiya
      return matchesSearch && matchesSemester && matchesType && matchesSubject && isApproved;
    });

    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === "newest") return b.createdAt?.seconds - a.createdAt?.seconds;
      if (sortBy === "oldest") return a.createdAt?.seconds - b.createdAt?.seconds;
      if (sortBy === "title") return a.title.localeCompare(b.title);
      return 0;
    });

    return result;
  }, [libraryMaterials, searchTerm, selectedSemester, selectedType, selectedSubject, getSubjectById, sortBy]);

  // Show loading spinner immediately for better UX
  if (localLoading || !isLibraryLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#0a0a0a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFD700] mx-auto mb-4"></div>
          <p className="text-white/70 text-sm">Loading library materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 pt-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-4 text-center">
        <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
          Study Library
        </h1>
        <p className="text-white/55 text-xs mt-1">
          Browse all notes, practicals, important materials, and assignments
        </p>
      </div>

      {/* Controls Section */}
      <div className="glass-card p-4 mb-4 relative z-50">
        <div className="space-y-3">
          {/* Search Bar with Sort Button */}
          <div className="flex gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-white/50" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search materials..."
                className="w-full glass-card pl-10 pr-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#FFD700] focus:outline-none"
              />
            </div>
            
            {/* Sort Button */}
            <div className="relative" ref={sortRef}>
              <button
                type="button"
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 text-zinc-400 hover:text-white transition-colors"
                aria-label="Sort materials"
                title="Sort materials"
              >
                <ArrowUpDown size={18} />
              </button>
              
              {/* 🚨 FIX: Library Sort Dropdown Transparency Fix */}
              {showSortMenu && (
                <div 
                  // Yahan humne bg-[#16161a] (Solid) aur border-zinc-800 use kiya hai
                  className="absolute right-0 top-full mt-2 w-48 bg-[#16161a] border border-zinc-800 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.9)] z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                >
                  {/* 🚨 FINAL UI FIX: Library Sort Dropdown Checkmark Alignment */}
                  <div className="py-1">
                    {[
                      { value: "newest", label: "Newest First" },
                      { value: "oldest", label: "Oldest First" },
                      { value: "title", label: "Title A-Z" }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSortBy(option.value);
                          setShowSortMenu(false);
                        }}
                        // 🚨 Added 'flex items-center justify-between'
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                          sortBy === option.value 
                            ? 'bg-[#FFD700]/15 text-[#FFD700] font-bold' 
                            : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
                        }`}
                      >
                        {/* 🚨 Text ko span mein rakha taaki wrap na ho */}
                        <span className="whitespace-nowrap">{option.label}</span>

                        {/* 🚨 Checkmark logic */}
                        {sortBy === option.value && (
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="3" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            className="flex-shrink-0 ml-2"
                          >
                            <path d="M20 6 9 17l-5-5"></path>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 🌟 PREMIUM LIBRARY FILTERS FIX */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 relative z-[50]">
            
            <CustomSelect
              value={selectedSemester}
              // 🚨 FIX: Direct 'val' receive karke state mein daalna hai
              onChange={(val) => setSelectedSemester(val)} 
              placeholder="All Semesters"
              options={[
                { value: "all", label: "All Semesters" },
                ...(semesters || []).map(sem => ({ value: sem.id, label: sem.name.replace('Semester ', 'Sem ') }))
              ]}
            />

            <CustomSelect
              value={selectedType}
              // 🚨 FIX: (e.target.value) ka use nahi karna hai
              onChange={(val) => setSelectedType(val)}
              placeholder="All Types"
              options={[
                { value: "all", label: "All Types" },
                { value: "notes", label: "Notes" },
                { value: "practicals", label: "Practicals" },
                { value: "imp", label: "IMP" },
                { value: "assignment", label: "Assignment" }
              ]}
            />

            <CustomSelect
              // 🚨 FIX: Ab ye directly state se connect ho gaya hai
              value={selectedSubject} 
              // 🚨 FIX: Ab ye actually state ko update karega
              onChange={(val) => setSelectedSubject(val)}
              placeholder="All Subjects"
              options={[
                { value: "all", label: "All Subjects" },
                ...(filteredSubjectsForDropdown || []).map(sub => ({ value: sub.id, label: sub.name }))
              ]}
              emptyMessage="⚠️ Please select Semester first"
            />
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-white/70 text-xs">
          Showing <span className="font-bold text-[#FFD700]">{Math.min(visibleCount, filteredMaterials.length)}</span> of <span className="font-bold text-[#FFD700]">{filteredMaterials.length}</span> filtered materials
        </p>
      </div>

      {/* Materials Grid */}
      <div className="space-y-4">
        {filteredMaterials.length > 0 ? (
          <>
            {filteredMaterials.slice(0, visibleCount).map((material, index) => {
              if (index === filteredMaterials.slice(0, visibleCount).length - 1 && index < filteredMaterials.length - 1) {
                // Apply the ref to the last visible element
                return (
                  <div key={material.id} ref={lastElementRef}>
                    <MaterialCard 
                      material={material} 
                      convertToDownloadLink={convertToDownloadLink}
                      getSubjectById={getSubjectById}
                    />
                  </div>
                );
              } else {
                return (
                  <MaterialCard 
                    key={material.id} 
                    material={material} 
                    convertToDownloadLink={convertToDownloadLink}
                    getSubjectById={getSubjectById}
                  />
                );
              }
            })}
            {visibleCount < filteredMaterials.length && (
              <div ref={lastElementRef} className="w-full py-8 flex justify-center items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
                <span className="ml-3 text-zinc-400 text-sm">Loading more...</span>
              </div>
            )}
          </>
        ) : (
          <div className="glass-card p-12 text-center">
            <FileText size={32} className="mx-auto mb-4 text-white/30" />
            <div className="font-semibold text-white mb-2">No materials found</div>
            <div className="text-sm text-zinc-400">
              Try adjusting your search or filter criteria
            </div>
          </div>
        )}
      </div>
    </div>
  );
}