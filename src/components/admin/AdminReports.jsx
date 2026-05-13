import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { Flag, CheckCircle, Trash2, AlertTriangle, Loader2 } from "lucide-react";

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const reportsQuery = query(
        collection(db, "reports"),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(reportsQuery);
      const reportsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReports(reportsData);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    // Set the resolving ID at the beginning
    setResolvingId(id);
    
    try {
      // Get the full report data first
      const report = reports.find(r => r.id === id);
      
      const reportRef = doc(db, "reports", id);
      await updateDoc(reportRef, { status: "resolved" });
      setReports((prev) =>
        prev.map((report) =>
          report.id === id ? { ...report, status: "resolved" } : report
        )
      );
      
      // Only send notification if we know who reported it
      if (report?.reporterEmail && report.reporterEmail !== 'Unknown') {
        try {
          await addDoc(collection(db, 'notifications'), {
            targetEmail: report.reporterEmail, // Targeted only to this user
            title: 'Report Resolved ✅',
            message: `Resolved: "${report.materialTitle}". Check it out!`,
            createdAt: serverTimestamp(),
            readBy: [],
            deletedBy: []
          });
        } catch (notifError) {
          console.error("Failed to send resolution notification:", notifError);
        }
      }
    } catch (error) {
      console.error("Error resolving report:", error);
    } finally {
      // Reset the resolving ID in the finally block
      setResolvingId(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      const reportRef = doc(db, "reports", id);
      await deleteDoc(reportRef);
      setReports((prev) => prev.filter((report) => report.id !== id));
    } catch (error) {
      console.error("Error deleting report:", error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="w-full py-32 flex flex-col items-center justify-center glass-card rounded-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFD700] mb-4"></div>
        <span className="text-white/60 font-medium">Loading reports...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Flag className="text-red-500 w-6 h-6 md:w-7 md:h-7" />
          <h1 className="text-xl md:text-2xl font-bold">User Reports</h1>
          <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-xs md:text-sm">
            {reports.filter((r) => r.status !== "resolved").length} unresolved
          </span>
        </div>

        {reports.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-xl p-6 md:p-10 text-center">
            <CheckCircle className="mx-auto text-green-500 mb-3 w-10 h-10 md:w-12 md:h-12" />
            <h2 className="text-lg md:text-xl font-semibold mb-2">No Reports Yet</h2>
            <p className="text-sm md:text-base text-white/55">All materials are working correctly!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => (
              <div key={report.id} className="p-4 sm:p-5 border border-zinc-800 rounded-xl bg-[#0f0f0f] flex flex-col gap-3.5">

                {/* Row 1: Title & Action Button */}
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-lg font-bold text-white leading-tight">{report.materialTitle || "Unknown Material"}</h3>
                  
                  <button 
                    onClick={() => handleDelete(report.id)}
                    className="flex-shrink-0 px-3 py-1.5 text-sm bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors flex items-center gap-2 border border-red-500/20">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>

                {/* Meta Information Container (Vertically Stacked) */}
                <div className="flex flex-col gap-2.5">
                  
                  {/* Row 2: Status Badge & Date */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-md border ${report.status === "resolved" ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                      {report.status === "resolved" ? 'Resolved' : 'Unresolved'}
                    </span>
                    <span className="text-xs text-zinc-500 font-medium">
                      • {formatDate(report.createdAt)}
                    </span>
                    {report.status !== "resolved" && (
                      <button 
                        onClick={() => handleResolve(report.id)}
                        disabled={resolvingId === report.id}
                        className="px-2.5 py-1 text-xs bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-md transition-colors flex items-center gap-1 border border-green-500/20 ml-auto">
                        {resolvingId === report.id ? (
                          <div className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Resolving...
                          </div>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            ✅ Resolve
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Row 3: Reporter */}
                  <div className="text-sm text-zinc-400 flex items-center gap-1.5 overflow-hidden w-full">
                    <span className="flex-shrink-0">👤 Reported by:</span>
                    <span className="text-zinc-300 font-medium truncate" title={report.reporterName || 'Anonymous Student'}>
                      {report.reporterName || 'Anonymous Student'}
                    </span>
                  </div>

                  {/* Row 4: Location */}
                  <p className="text-sm text-zinc-400 flex items-center gap-1.5">
                    📍 {report.semester || 'N/A'} → {report.subject || 'N/A'}
                  </p>

                  {/* Row 5: Reason */}
                  <p className="text-yellow-500 text-sm font-medium flex items-center gap-1.5">
                    ⚠️ {report.reason === "Broken Link"
                      ? "Broken Link"
                      : report.reason?.startsWith("Other:")
                      ? report.reason
                      : report.reason || "Unknown issue"}
                  </p>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}