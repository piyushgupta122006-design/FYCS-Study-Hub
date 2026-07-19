import { FileText, ExternalLink, Download, Edit3, Pencil, Flag, Eye, Calendar, User, CheckCircle, Bookmark, Loader2, Share2, X, Users, Search, Clock } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useState } from "react";
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { createPortal } from 'react-dom';
import { toast } from "react-hot-toast";

export default function MaterialCard({ material, onIncrementView, convertToDownloadLink, navigateToSubject = false, navigate, isNewMaterial, getSubjectById, onEdit, adminCompact = false }) {
  const { isAdmin, user, toggleFavorite, incrementView } = useApp();
  
  // Local state for optimistic updates
  const [viewCount, setViewCount] = useState(material.views || 0);
  const [downloadCount, setDownloadCount] = useState(material.downloads || 0);
  
  // Loading state for favorite button
  const [loadingFavId, setLoadingFavId] = useState(null);
  
  // Loading state for view button
  const [isViewing, setIsViewing] = useState(false);

  // View modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Viewers search query state
  const [viewersSearchQuery, setViewersSearchQuery] = useState("");

  // Helper function to format time and date as "18 Jul, 05:55 PM"
  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    try {
      const date = new Date(timeString);
      const day = date.getDate();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[date.getMonth()];
      const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${day} ${month}, ${time}`;
    } catch (e) {
      return "N/A";
    }
  };
  
  // Report issue state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Broken Link');
  const [otherReason, setOtherReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Share handler function
  const handleShare = async (material) => {
    const shareData = {
      title: `BNN CS Study Hub - ${material.title}`,
      text: `Check out this ${material.type} for ${material.title} on BNN CS Study Hub!`,
      url: material.link, 
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error sharing:", error);
        }
      }
    } else {
      // Fallback for desktop browsers that don't support Web Share API
      try {
        await navigator.clipboard.writeText(material.link);
        toast.success("Link copied to clipboard!");
      } catch (err) {
        toast.error("Failed to copy link");
      }
    }
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "Just now";
    
    try {
      if (dateString?.toDate) {
        return dateString.toDate().toLocaleDateString()
      }
      else if (typeof dateString === 'string') {
        return new Date(dateString).toLocaleDateString()
      }
      else if (dateString instanceof Date) {
        return dateString.toLocaleDateString()
      }
      else {
        return new Date(dateString).toLocaleDateString()
      }
    } catch (error) {
      console.warn('Invalid date:', dateString, error);
      return "Just now";
    }
  };

  // Helper function to get subject abbreviation
  const getSubjectAbbreviation = (subjectName) => {
    const abbreviations = {
      "Human Resource Management": "HRM",
      "Web Development": "Web Dev",
      "Algorithm": "Algo",
      "Number Theory": "Maths",
      "Co-Curriculum": "CC",
      "Environmental Management and Sustainable Development": "EMSD",
      "Marketing Mix-2": "MM-2",
      "Object Oriented Programming": "OOPs"
    };
    
    if (abbreviations[subjectName]) {
      return abbreviations[subjectName];
    }
    
    if (subjectName.length > 15) {
      return subjectName.substring(0, 12) + "...";
    }
    
    return subjectName;
  };

  // Helper function to add material to recent history (views)
  const addToRecentHistory = (material) => {
    const historyItem = {
      id: material.id,
      title: material.title,
      subject: getSubjectById?.(material.subjectId)?.name || "Unknown",
      link: material.link,
      type: material.type,
      viewedAt: new Date().toISOString()
    };
    
    const existingHistory = JSON.parse(localStorage.getItem('recentHistory') || '[]');
    const filteredHistory = existingHistory.filter(item => item.id !== material.id);
    const updatedHistory = [historyItem, ...filteredHistory].slice(0, 10);
    localStorage.setItem('recentHistory', JSON.stringify(updatedHistory));
  };

  // Helper function to add material to download history
  const addToDownloadHistory = (material) => {
    const historyItem = {
      id: material.id,
      title: material.title,
      subject: getSubjectById?.(material.subjectId)?.name || "Unknown",
      link: material.link,
      type: material.type,
      downloadedAt: new Date().toISOString()
    };
    
    const existingHistory = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
    const filteredHistory = existingHistory.filter(item => item.id !== material.id);
    const updatedHistory = [historyItem, ...filteredHistory].slice(0, 10);
    localStorage.setItem('downloadHistory', JSON.stringify(updatedHistory));
  };

  const handleViewClick = async () => {
    if (navigateToSubject && navigate) {
      const tabParam = material.type.toLowerCase();
      navigate(`/semester/${material.semId}/${material.subjectId}?tab=${tabParam}`);
    } else {
      setIsViewing(true);
      try {
        window.open(material.link, "_blank", "noopener,noreferrer");
        const viewedMaterials = JSON.parse(localStorage.getItem('viewedMaterials') || '[]');

        if (!viewedMaterials.includes(material.id)) {
          viewedMaterials.push(material.id);
          localStorage.setItem('viewedMaterials', JSON.stringify(viewedMaterials));

          await incrementView(material.id);

          addToRecentHistory(material);
          setViewCount(prev => prev + 1);

          if (onIncrementView) {
            onIncrementView(material.id);
          }
        }
      } catch (error) {
        console.error("Error updating view count:", error);
        window.open(material.link, "_blank", "noopener,noreferrer");
      } finally {
        setTimeout(() => {
          setIsViewing(false);
        }, 2000);
      }
    }
  };

  // 🌟 PROXY DOWNLOADING WORKFLOW (NO DRIVE INTERCEPTION FILTER)
  const handleDownloadClick = async () => {
    try {
      // 1. Firebase analytics update karo instantly
      await updateDoc(doc(db, "materials", material.id), { 
        downloads: increment(1) 
      });
      
      addToDownloadHistory(material);
      setDownloadCount(prev => prev + 1);
      
      // 2. Google Drive unique file ID extract karo regex se
      const fileIdMatch = material.link.match(/\/d\/([^/]+)/) || material.link.match(/[?&]id=([^&]+)/);
      const fileId = fileIdMatch ? fileIdMatch[1] : null;

      if (fileId) {
        // 3. Address shift to local serverless API endpoint (Bypass mobile intent interception)
        // material.type se dynamic extension fallback backup handle kar rahe hain (e.g. filename.pdf)
        const fileExt = material.link.includes('.pdf') ? '.pdf' : '.zip'; 
        const downloadName = `${material.title || 'file'}${fileExt}`;
        
        window.location.href = `/api/download?id=${fileId}&name=${encodeURIComponent(downloadName)}`;
      } else {
        // Fallback agar direct link na badle
        window.open(material.link, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Proxy download configuration exception:", error);
      // Fail ਹੋne par standard fallback chain execution
      const downloadUrl = convertToDownloadLink(material.link);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleSubmitReport = async () => {
    if (reportReason === 'Other' && !otherReason.trim()) {
      alert("Please specify the issue.");
      return;
    }
    
    setIsReporting(true);
    
    try {
      const finalReason = reportReason === 'Other' ? `Other: ${otherReason}` : reportReason;
      
      await addDoc(collection(db, 'reports'), {
        materialId: material.id,
        materialTitle: material.title,
        materialLink: material.link,
        subject: getSubjectById?.(material.subjectId)?.name || material.subject || 'Unknown Subject',
        semester: material.semester || material.semId || 'Unknown Semester',
        reason: finalReason,
        status: 'unread',
        createdAt: serverTimestamp(),
        reporterName: user?.displayName || user?.name || 'Anonymous Student',
        reporterEmail: user?.email || 'Unknown'
      });
      
      setIsSuccess(true);
      setTimeout(() => {
        setIsReportModalOpen(false);
        setIsSuccess(false);
        setReportReason('Broken Link');
        setOtherReason('');
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Error submitting report. Please try again.');
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div className={adminCompact ? "" : "glass-card p-4"}>
      <div className="flex items-start gap-3">
        <div className="mt-1">
          {material.type === 'Notes' ? <FileText className="text-blue-400" size={18} /> :
           material.type === 'Practicals' ? <FileText className="text-green-400" size={18} /> :
           material.type === 'IMP' ? <FileText className="text-yellow-400" size={18} /> :
           material.type === 'Assignment' ? <FileText className="text-purple-400" size={18} /> :
           <FileText className="text-emerald-400" size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-white/90 truncate">{material.title}</h3>
            {isNewMaterial && isNewMaterial(material) && (
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full whitespace-nowrap">
                New
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <div className="text-xs text-zinc-400">
              {material.type}
            </div>
            
            {material.semId && (
              <span className="text-xs text-zinc-400 whitespace-nowrap">
                • Sem {material.semId}
              </span>
            )}
            
            {getSubjectById && material.subjectId && (
              <span className="px-2 py-0.5 bg-zinc-800 text-gray-300 text-xs rounded-md whitespace-nowrap">
                {getSubjectAbbreviation(getSubjectById(material.subjectId)?.name || "Unknown")}
              </span>
            )}
            <span className="text-xs text-zinc-400 whitespace-nowrap">
              • {formatDate(material.createdAt || material.date)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {/* Button Layout */}
        {!adminCompact && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isViewing}
              onClick={handleViewClick}
              className={`flex-1 py-2 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-200 font-bold hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-2 ${isViewing ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {isViewing ? (
                <>
                  Viewing... <Loader2 className="animate-spin" size={16} />
                </>
              ) : (
                <>
                  View <ExternalLink size={16} />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadClick}
              className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
              title="Download"
              aria-label="Download material"
            >
              <Download size={18} />
            </button>
            <button
              type="button"
              disabled={loadingFavId === material.id}
              onClick={async (e) => {
                e.preventDefault();
                setLoadingFavId(material.id);
                await toggleFavorite(material.id);
                setLoadingFavId(null);
              }}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl border font-bold flex items-center justify-center transition-all ${
                user?.favorites?.includes(material.id)
                  ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30"
                  : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
              } ${loadingFavId === material.id ? "opacity-50 cursor-not-allowed" : ""}`}
              title={user?.favorites?.includes(material.id) ? "Remove from favorites" : "Save to favorites"}
            >
              {loadingFavId === material.id ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Bookmark 
                  size={18} 
                  fill={user?.favorites?.includes(material.id) ? "currentColor" : "none"} 
                />
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleShare(material);
              }}
              className="p-2 sm:px-3 sm:py-2 rounded-xl border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center min-w-[40px]"
              title="Share material"
            >
              <Share2 size={18} />
            </button>
          </div>
        )}

        {/* Unified Card Footer */}
        <div className={`flex flex-wrap items-center justify-between gap-y-2 gap-x-1 text-[11px] sm:text-xs text-zinc-400 ${adminCompact ? 'mt-1' : 'mt-4 pt-3 border-t border-zinc-800/50'}`}>
          <span className="flex items-center gap-1 text-zinc-300">
            <User size={12} /> by {
              material.uploadedBy?.split(' ')[0] || 
              material.uploaderName || 
              'Admin'
            }
          </span>

          {isAdmin && (
            <div className="flex items-center gap-2 sm:gap-3 font-medium mx-auto">
              <span 
                className="flex items-center gap-1 text-blue-400 cursor-pointer hover:underline" 
                title="Viewers Log"
                onClick={() => setIsViewModalOpen(true)}
              >
                <Eye size={12} className="sm:w-[14px] sm:h-[14px]" /> {viewCount}
              </span>
              <span className="flex items-center gap-1 text-green-400" title="Downloads">
                <Download size={12} className="sm:w-[14px] sm:h-[14px]" /> {material.downloads || 0}
              </span>
              <span className="flex items-center gap-1 text-purple-400" title="Date">
                <Calendar size={12} className="sm:w-[14px] sm:h-[14px]" /> 
                {material.createdAt?.seconds ? new Date(material.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          )}

          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1 hover:text-red-400 transition-colors ml-auto sm:ml-0"
          >
            <Flag size={12} /> Report
          </button>
        </div>

        {/* Admin-only Edit Button */}
        {isAdmin && onEdit && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => onEdit(material)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 text-amber-300 text-[10px] font-bold hover:bg-amber-500/25 transition-colors"
              title="Edit material"
            >
              <Pencil size={12} />
              Edit
            </button>
          </div>
        )}
      </div>
      
      {/* Report Issue Modal */}
      {isReportModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border-t-2 border-red-500 rounded-xl p-6 shadow-2xl relative">
            {isSuccess ? (
              <div className="text-center py-6 animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="text-green-500" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Report Submitted!</h3>
                <p className="text-zinc-400 text-sm">Thank you for helping us keep the library clean. Admins will look into it.</p>
              </div>
            ) : (
              <>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500" />
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Report Issue</h3>
                    <button
                      type="button"
                      onClick={() => setIsReportModalOpen(false)}
                      className="text-white/50 hover:text-white transition-colors"
                      aria-label="Close report modal"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="text-sm text-white/70">
                    For: <span className="font-semibold text-white">{material.title}</span>
                  </div>
                  
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Reason for reporting:</label>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full bg-zinc-800 text-white rounded border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-red-500 p-3"
                    >
                      <option value="Broken Link">Broken Link</option>
                      <option value="Wrong File Attached">Wrong File Attached</option>
                      <option value="Outdated / Old Syllabus">Outdated / Old Syllabus</option>
                      <option value="Other">Other</option>
                    </select>
                    {reportReason === 'Other' && (
                      <textarea 
                        value={otherReason} 
                        onChange={(e) => setOtherReason(e.target.value)} 
                        placeholder="Please describe the issue..." 
                        className="w-full mt-3 bg-zinc-800 border border-zinc-700 text-white rounded-lg p-3 text-sm focus:outline-none focus:border-yellow-500 min-h-[80px] resize-none"
                        required
                      />
                    )}
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsReportModalOpen(false)}
                      disabled={isReporting}
                      className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all font-medium border border-zinc-700 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitReport}
                      disabled={isReporting}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl transition-all font-bold shadow-lg shadow-red-500/20 disabled:opacity-50"
                    >
                      {isReporting ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Viewers Log Modal */}
      {isViewModalOpen && createPortal(
        <div 
          onClick={() => {
            setIsViewModalOpen(false);
            setViewersSearchQuery("");
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm glass-card overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200"
          >
            
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.05)]">
                <Users size={14} />
                <span className="text-[11px] font-extrabold tracking-wide">
                  Views: {material.viewedBy?.length || 0}
                </span>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setViewersSearchQuery("");
                }} 
                className="text-zinc-400 hover:text-white transition-colors"
                aria-label="Close viewers modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Input Box */}
            <div className="p-3 border-b border-white/10 bg-black/20">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="text-white/70" size={14} />
                </div>
                <input 
                  type="text" 
                  value={viewersSearchQuery}
                  onChange={(e) => setViewersSearchQuery(e.target.value)}
                  placeholder="Search by name or email..." 
                  className="w-full glass-card pl-9 pr-4 py-2 text-xs bg-white/5 border border-white/20 text-white placeholder:text-white/60 focus:border-[#FFD700] focus:outline-none transition-all duration-200" 
                />
              </div>
            </div>

            {/* Viewers List */}
            <div className="p-2 space-y-1.5 max-h-[calc(100vh-220px)] overflow-y-auto no-scrollbar">
              {(() => {
                const filtered = (material.viewedBy || []).filter(v => {
                  const name = (v.name || "").toLowerCase();
                  const email = (v.email || "").toLowerCase();
                  const q = viewersSearchQuery.toLowerCase();
                  return name.includes(q) || email.includes(q);
                });

                if (filtered.length > 0) {
                  return [...filtered]
                    .sort((a, b) => new Date(b.time) - new Date(a.time))
                    .map((v, i) => (
                      <div 
                        key={i} 
                        className="bg-zinc-900/50 border border-zinc-800/50 p-2.5 px-3 rounded-xl flex items-center justify-between gap-3 transition-colors hover:bg-zinc-800/50 hover:border-zinc-700 duration-150 animate-in fade-in slide-in-from-bottom-1"
                      >
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-bold text-white text-xs truncate tracking-wide">{v.name}</span>
                          <span className="text-[10px] text-white/70 truncate mt-0.5">{v.email}</span>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold rounded-md border border-cyan-500/15">
                            <Clock size={10} />
                            {formatTime(v.time)}
                          </span>
                        </div>
                      </div>
                    ));
                }

                return (
                  <p className="text-zinc-500 text-xs text-center py-6">
                    {material.viewedBy?.length > 0 ? "No matching viewers found." : "No views recorded yet."}
                  </p>
                );
              })()}
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}