import { CloudUpload, Link2, Tag, FileText, Code, Star, Edit3, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useApp } from "../context/AppContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";

export default function Upload() {
  const navigate = useNavigate();
  const { semesters, subjects, addMaterial, isAdmin, materials, user, approveMaterial, rejectMaterial } = useApp();
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'pending_admin'
  const [isGoogleApiLoaded, setIsGoogleApiLoaded] = useState(false);
  
  // Extract file ID from Google Drive URL
  const extractFileId = (url) => {
    const match = url.match(/\/d\/([^/]+)|id=([^&]+)/);
    return match ? (match[1] || match[2]) : null;
  };
  
  // Get pending materials
  const pendingMaterials = materials.filter(material => material.status === 'Pending');
  
  // Redirect non-admin users
  useEffect(() => {
    if (isAdmin === false) {
      navigate("/");
    }
  }, [isAdmin, navigate]);
  
  // Prevent rendering if not admin
  if (isAdmin === false) {
    return null;
  }

  // Dynamically load Google scripts on mount
  useEffect(() => {
    const loadGapi = () => new Promise(res => {
      if (window.gapi) { 
        window.gapi.load('picker');
        res(); 
        return; 
      }
      const s = document.createElement("script");
      s.src = "https://apis.google.com/js/api.js";
      s.async = true;
      s.defer = true;
      s.onload = () => {
        window.gapi.load('picker'); // Pre-load the picker module
        res();
      };
      document.head.appendChild(s);
    });
    
    const loadGis = () => new Promise(res => {
      if (window.google?.accounts?.oauth2) { res(); return; }
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = res;
      document.head.appendChild(s);
    });
    
    Promise.all([loadGapi(), loadGis()]).then(() => {
      // Set a small delay to ensure everything is fully initialized
      setTimeout(() => {
        setIsGoogleApiLoaded(true);
        console.log('✅ Google API fully loaded and ready');
      }, 100);
    });
  }, []);

  // Google Drive Picker with silent token approach
  const openDrivePicker = () => {
    const userEmail = auth.currentUser?.email;
    if (!userEmail) {
      toast.error("Please sign in first.");
      return;
    }

    // Safety check: Ensure Google Picker is fully loaded
    if (!window.google || !window.google.picker) {
      toast.error("Google Drive interface is still loading. Please try again in a few seconds.");
      console.log('Google Picker not ready yet:', { google: !!window.google, picker: !!window.google?.picker });
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      login_hint: userEmail, // THIS IS THE MAGIC THAT SKIPS THE ACCOUNT CHOOSER
      callback: (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          showPicker(tokenResponse.access_token);
        } else {
          toast.error("Failed to get access token. Please try again.");
        }
      },
    });
    client.requestAccessToken({ prompt: "" }); // prompt empty skips the chooser if possible
  };

  const showPicker = (accessToken) => {
    const picker = new window.google.picker.PickerBuilder()
      .addView(window.google.picker.ViewId.DOCS)
      .setOAuthToken(accessToken)
      .setDeveloperKey(import.meta.env.VITE_GOOGLE_API_KEY)
      .setOrigin(window.location.protocol + '//' + window.location.host)
      .setCallback((data) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const file = data.docs[0];
          const driveLink = `https://drive.google.com/file/d/${file.id}/view?usp=sharing`;
          setForm((prev) => ({ ...prev, driveLink }));
          toast.success(`✅ File selected: ${file.name}`);
        }
      })
      .build();
    picker.setVisible(true);
  };

  const types = useMemo(
    () => ["Notes", "Practicals", "IMP", "Assignment"],
    []
  );

  const [form, setForm] = useState({
    title: "",
    semester: "",
    type: "Notes",
    subject: "",
    driveLink: "",
    uploadDate: new Date().toLocaleDateString(),
  });

  // Get subjects filtered by selected semester
  const filteredSubjects = useMemo(
    () => subjects.filter(s => Number(s.semId) === Number(form.semester)),
    [subjects, form.semester]
  );

  // Check if form is valid
  const isFormValid = form.title && form.semester && form.subject && form.driveLink;
  
  // Loading state for duplicate check
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  function onChange(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }
  
  // Function to convert Google Drive link to direct download link
  const handleConvertLink = () => {
    const link = form.driveLink.trim();
    if (!link) {
      toast.error("Please enter a Google Drive link first");
      return;
    }
    
    // Extract file ID using regex
    const match = link.match(/\/d\/(.+?)\/|id=(.+?)(\&|$)/);
    const fileId = match ? (match[1] || match[2]) : null;
    
    if (fileId) {
      // Create direct download link
      const directLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
      
      // Update the form state with the converted link
      setForm(prev => ({ ...prev, driveLink: directLink }));
      
      // Show success toast
      toast.success("Link Converted to Direct Download");
    } else {
      toast.error("Invalid Google Drive link format");
    }
  };

  async function onSubmit(e) {
    e.preventDefault();
    
    // Validate required fields
    if (!form.title || !form.subject || !form.driveLink) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    try {
      // Set loading state for duplicate check
      setIsCheckingDuplicate(true);
      
      // Fetch all materials for comprehensive duplicate check
      const querySnapshot = await getDocs(collection(db, "materials"));
      
      // Normalize user input for comparison
      const normalizedInputTitle = form.title.toLowerCase().trim();
      
      // Extract filename from Google Drive link if possible
      let inputFileName = "";
      const driveLink = form.driveLink.trim();
      if (driveLink) {
        try {
          // Try to extract filename from Google Drive URL
          const urlObj = new URL(driveLink);
          const pathParts = urlObj.pathname.split('/');
          // Look for filename in the URL path
          const fileNamePart = pathParts.find(part => part.includes('.') && !part.startsWith('d'));
          if (fileNamePart) {
            inputFileName = fileNamePart.toLowerCase().trim();
          }
        } catch (urlError) {
          // If URL parsing fails, try to extract from the link text
          const fileNameMatch = driveLink.match(/[^/]+\.[^/]+$/);
          if (fileNameMatch) {
            inputFileName = fileNameMatch[0].toLowerCase().trim();
          }
        }
      }
      
      // Get the subject name for better user feedback
      const selectedSubject = subjects.find(s => s.id === form.subject);
      const subjectName = selectedSubject ? selectedSubject.name : "this subject";
      
      // Check for duplicates in existing materials (scoped by subject)
      let isDuplicate = false;
      querySnapshot.forEach((doc) => {
        const dbData = doc.data();
        
        // ONLY check for duplicates IF the subject is the exact same
        if (dbData.subjectId === form.subject) {
          // Check title duplication (case-insensitive and trimmed)
          const dbTitle = dbData.title ? dbData.title.toLowerCase().trim() : "";
          if (dbTitle === normalizedInputTitle) {
            isDuplicate = true;
            return;
          }
          
          // Check file name duplication if we have a filename to compare
          if (inputFileName) {
            // Check if the database has a fileName field or extract from link
            const dbFileName = (dbData.fileName || "").toLowerCase().trim();
            const dbLink = (dbData.link || "").toLowerCase().trim();
            
            // Try to extract filename from database link
            let dbExtractedFileName = "";
            if (dbLink) {
              try {
                const dbUrlObj = new URL(dbLink);
                const dbPathParts = dbUrlObj.pathname.split('/');
                const dbFileNamePart = dbPathParts.find(part => part.includes('.') && !part.startsWith('d'));
                if (dbFileNamePart) {
                  dbExtractedFileName = dbFileNamePart.toLowerCase().trim();
                }
              } catch (dbUrlError) {
                const dbFileNameMatch = dbLink.match(/[^/]+\.[^/]+$/);
                if (dbFileNameMatch) {
                  dbExtractedFileName = dbFileNameMatch[0].toLowerCase().trim();
                }
              }
            }
            
            // Compare filenames
            if (dbFileName === inputFileName || dbExtractedFileName === inputFileName) {
              isDuplicate = true;
              return;
            }
          }
        }
      });
      
      // If duplicate found, show warning and stop upload
      if (isDuplicate) {
        toast.error(`🚨 Wait! This material already exists in the "${subjectName}" subject. Check the Library!`);
        setIsCheckingDuplicate(false);
        return;
      }
      
      // No duplicates found, proceed with upload
      const result = await addMaterial({
        title: form.title,
        semId: form.semester,
        subjectId: form.subject,
        type: form.type,
        link: form.driveLink,
        uploadedBy: user?.displayName || user?.email.split('@')[0] || "Student", // Use authenticated user's name
      });
      
      if (result.success) {
        // Reset form - preserve semester, subject, and type selections
        setForm(prevForm => ({
          ...prevForm,
          title: "",
          driveLink: "",
          uploadDate: new Date().toLocaleDateString(),
        }));
        
        toast.success("Material submitted successfully! Pending approval.");
      } else {
        const msg = result.error || "An unknown error occurred during submission";
        toast.error("Error submitting material: " + msg);
      }
    } catch (error) {
      console.error("Upload Error Details:", error);
      const msg = error?.message || error?.toString() || "An unknown error occurred";
      toast.error("Error submitting material: " + msg);
    } finally {
      // Always reset loading state
      setIsCheckingDuplicate(false);
    }
  }

  return (
    <div className="p-5 pt-6 max-w-md mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold">Upload</h2>
        <p className="text-white/55 text-xs mt-1">
          Share notes, practicals, important materials, and assignments.
        </p>
      </div>
      
      {/* TOP TAB BAR */}
      <div className="flex w-full bg-zinc-900 rounded-lg p-1 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2 text-center font-bold transition-colors ${
            activeTab === 'upload'
              ? 'bg-yellow-400 text-black rounded-md'
              : 'text-white/70'
          }`}
        >
          Upload
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pending_admin')}
          className={`flex-1 py-2 text-center font-bold transition-colors ${
            activeTab === 'pending_admin'
              ? 'bg-yellow-400 text-black rounded-md'
              : 'text-white/70'
          }`}
        >
          Pending (Admin)
        </button>
      </div>
      
      {/* CONDITIONAL RENDERING */}
      {activeTab === 'upload' ? (
        <form className="glass-card p-4" onSubmit={onSubmit}>
        <div className="mb-4">
          <div className="text-white/50 uppercase text-[10px] tracking-widest font-bold">
            Publish Material
          </div>
          <div className="text-[12px] text-white/70 mt-2">
            Fill in the details exactly so students can find it easily.
          </div>
        </div>

        {/* Title */}
        <label className="block mb-4">
          <div className="text-[11px] font-bold text-white/70 mb-2">Title</div>
          <input
            value={form.title}
            onChange={onChange("title")}
            placeholder='e.g., Unit 1 Notes'
            className="w-full glass-card px-4 py-3 text-sm outline-hidden placeholder:text-white/35"
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          {/* Semester */}
          <label className="block mb-4">
            <div className="text-[11px] font-bold text-white/70 mb-2">
              Semester *
            </div>
            <select
              value={form.semester}
              onChange={onChange("semester")}
              className="select-premium"
              required
            >
              <option value="" className="bg-[#0a0a0a]">Select Semester</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#0a0a0a]">
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          {/* Type */}
          <label className="block mb-4">
            <div className="text-[11px] font-bold text-white/70 mb-2">Type *</div>
            <select
              value={form.type}
              onChange={onChange("type")}
              className="select-premium"
              required
            >
              {types.map((t) => (
                <option key={t} value={t} className="bg-[#0a0a0a]">
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Subject */}
        <label className="block mb-4">
          <div className="text-[11px] font-bold text-white/70 mb-2">Subject *</div>
          <select
            value={form.subject}
            onChange={onChange("subject")}
            className={`select-premium ${!form.semester ? "opacity-50" : ""}`}
            required
            disabled={!form.semester}
          >
            <option value="" className="bg-[#0a0a0a]">
              {form.semester ? "Select subject..." : "Select semester first"}
            </option>
            {filteredSubjects.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#0a0a0a]">
                {s.name} (Sem {s.semId})
              </option>
            ))}
          </select>
          {!form.semester && (
            <div className="text-[10px] text-amber-400 mt-1">
              Please select a semester first
            </div>
          )}
        </label>

        {/* Google Drive Link */}
        <label className="block mb-4">
          <div className="text-[11px] font-bold text-white/70 mb-2">
            Google Drive Link *
          </div>
          <div className="glass-card px-4 py-3 flex items-center gap-3">
            <Link2 size={18} className="text-white/55" />
            <input
              value={form.driveLink}
              onChange={onChange("driveLink")}
              placeholder="https://drive.google.com/..."
              className="w-full bg-transparent text-sm outline-hidden placeholder:text-white/35"
              required
            />
            <button
              type="button"
              onClick={openDrivePicker}
              disabled={!isGoogleApiLoaded}
              title={!isGoogleApiLoaded ? "Loading Google Drive..." : "Pick from Google Drive"}
              className={`flex-shrink-0 p-1.5 rounded-lg transition-all border ${
                !isGoogleApiLoaded 
                  ? "bg-white/5 border-white/10 cursor-not-allowed opacity-50" 
                  : "bg-white/10 hover:bg-white/20 border-white/20"
              }`}
            >
              {!isGoogleApiLoaded ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <svg width="18" height="18" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                  <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                  <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                  <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                </svg>
              )}
            </button>
          </div>
        </label>

        <label className="block mb-5">
          <div className="text-[11px] font-bold text-white/70 mb-2">Upload Date</div>
          <div className="glass-card px-4 py-3 flex items-center gap-3 bg-zinc-900/50">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/55">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
              <line x1="16" x2="16" y1="2" y2="6"/>
              <line x1="8" x2="8" y1="2" y2="6"/>
              <line x1="3" x2="21" y1="10" y2="10"/>
            </svg>
            <input
              value={form.uploadDate}
              readOnly
              className="w-full bg-transparent text-sm outline-hidden text-zinc-400"
            />
          </div>
        </label>

        {/* Submit */}
        <button 
          type="submit" 
          className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            isFormValid && !isCheckingDuplicate
              ? "btn-primary" 
              : "bg-white/10 text-white/30 cursor-not-allowed"
          }`}
          disabled={!isFormValid || isCheckingDuplicate}
        >
          {isCheckingDuplicate 
            ? "Checking for duplicates..." 
            : isFormValid 
              ? "Publish Material" 
              : "Fill all required fields"}
          {isCheckingDuplicate ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <CloudUpload size={18} />
          )}
        </button>
      </form>
      ) : (
        <div className="glass-card p-4">
          <div className="mb-4">
            <div className="text-white/50 uppercase text-[10px] tracking-widest font-bold">
              Pending Materials
            </div>
            <div className="text-[12px] text-white/70 mt-2">
              Materials awaiting approval.
            </div>
          </div>
          
          {pendingMaterials.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingMaterials.map((material) => {
                const subject = subjects.find(s => s.id === material.subjectId);
                const semester = semesters.find(s => s.id === material.semId);
                
                return (
                  <div key={material.id} className="glass-card p-3">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">
                            {material.type === 'Notes' ? <FileText className="text-blue-400" size={16} /> :
                             material.type === 'Practicals' ? <Code className="text-green-400" size={16} /> :
                             material.type === 'IMP' ? <Star className="text-yellow-400" size={16} /> :
                             material.type === 'Assignment' ? <Edit3 className="text-purple-400" size={16} /> :
                             <FileText className="text-amber-400" size={16} />}
                          </div>
                          <div>
                            <h3 className="font-bold text-white/90 text-sm">{material.title}</h3>
                            <div className="text-xs text-white/50 mt-1">
                              {semester?.name} • {subject?.name} • {material.type}
                            </div>
                            <div className="text-xs text-white/40 mt-1">
                              Uploaded by {material.uploadedBy} • {new Date(material.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const result = await approveMaterial(material.id);
                              if (result.success) {
                                toast.success("Material approved successfully!");
                              } else {
                                toast.error(result.error || "Failed to approve material");
                              }
                            } catch (error) {
                              toast.error("Error approving material: " + error.message);
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-200 font-bold hover:bg-emerald-500/20 transition-colors text-xs"
                        >
                          <CheckCircle size={14} />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const result = await rejectMaterial(material.id);
                              if (result.success) {
                                toast.success("Material rejected successfully!");
                              } else {
                                toast.error(result.error || "Failed to reject material");
                              }
                            } catch (error) {
                              toast.error("Error rejecting material: " + error.message);
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 font-bold hover:bg-rose-500/15 transition-colors text-xs"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-white/40">
              <p>No pending materials</p>
              <p className="text-sm mt-1">All materials have been approved!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

