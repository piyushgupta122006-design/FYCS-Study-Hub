import { CloudUpload, Link2, Tag, FileText, Code, Star, Edit3, CheckCircle, XCircle, RefreshCw, Plus } from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useApp } from "../context/AppContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";

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
        <span className={`truncate mr-2 ${!selectedOption ? "text-white/40 text-sm" : "text-sm font-medium"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg className={`flex-shrink-0 transition-transform duration-300 text-white/40 ${isOpen ? 'rotate-180 text-[#FFD700]' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && (
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
                  className={`px-4 py-2.5 cursor-pointer transition-all text-sm relative flex items-center ${
                    String(value) === String(opt.value) 
                      ? 'bg-[#FFD700]/15 text-[#FFD700] font-bold' 
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="block whitespace-nowrap pr-6">
                    {opt.label}
                  </span>
                  
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

export default function AdminUpload() {
  const navigate = useNavigate();
  const { semesters, subjects, addMaterial, isAdmin, materials, user, approveMaterial, rejectMaterial, uploadSingleFile } = useApp();
  
  const [activeTab, setActiveTab] = useState('upload');
  const [isGoogleApiLoaded, setIsGoogleApiLoaded] = useState(false);
  
  // 🌟 NEW STATES FOR DIRECT UPLOAD WORKFLOW 🌟
  const [isDirectUploading, setIsDirectUploading] = useState(false);
  const [directUploadProgress, setDirectUploadProgress] = useState(0);
  const directUploadRef = useRef(null);

  const pendingMaterials = materials.filter(material => {
    const stat = (material.status || '').toString().trim().toLowerCase();
    return stat === 'pending';
  });
  
  useEffect(() => {
    if (isAdmin === false) {
      navigate("/");
    }
  }, [isAdmin, navigate]);
  
  if (isAdmin === false) {
    return null;
  }

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
        window.gapi.load('picker');
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
      setTimeout(() => {
        setIsGoogleApiLoaded(true);
      }, 100);
    });
  }, []);

  const openDrivePicker = () => {
    const userEmail = auth.currentUser?.email;
    if (!userEmail) {
      toast.error("Please sign in first.");
      return;
    }

    if (!window.google || !window.google.picker) {
      toast.error("Google Drive interface is still loading. Please try again in a few seconds.");
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      login_hint: userEmail,
      callback: (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          showPicker(tokenResponse.access_token);
        } else {
          toast.error("Failed to get access token. Please try again.");
        }
      },
    });
    client.requestAccessToken({ prompt: "" });
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

  const types = useMemo(() => ["Notes", "Practicals", "IMP", "Assignment"], []);

  const [form, setForm] = useState({
    title: "",
    semester: "",
    type: "Notes",
    subject: "",
    driveLink: "",
    uploadDate: new Date().toLocaleDateString(),
  });

  const filteredSubjects = useMemo(
    () => subjects.filter(s => Number(s.semId) === Number(form.semester)),
    [subjects, form.semester]
  );

  const isFormValid = form.title && form.semester && form.subject && form.driveLink;
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  function onChange(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  // 🌟 BOT REPLICATION DICTIONARY MAPPING FOR HIGH SPEED LOOKUPS 🌟
  const getSubjectAbbreviation = (subjectName) => {
    if (!subjectName) return "SUB";
    const abbreviations = {
      "Human Resource Management": "HRM",
      "Web Development": "WD",
      "Algorithm": "Algo",
      "Number Theory": "Maths",
      "Maths (Number Theory)": "Maths",
      "Co-Curriculum": "CC",
      "Environmental Management & Sustainability": "EMSD",
      "Marketing Mix-2": "MM-2",
      "Object Oriented Programming": "OOPs",
      "OOPs (C++)": "OOPs",
      "Hindi": "Hindi",
      "Time Table": "TT",
      "Certificate/Index/Page": "Certificate",
      "Python": "Python"
    };
    if (abbreviations[subjectName]) return abbreviations[subjectName];
    
    // Telegram Bot inline fallback strategy
    const bracketMatch = subjectName.match(/\(([^)]+)\)/);
    if (bracketMatch && bracketMatch[1]) return bracketMatch[1].trim().toUpperCase();
    const words = subjectName.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
    return words.map(word => word.charAt(0)).join('').toUpperCase();
  };

  // 🌟 DIRECT BACKGROUND CLOUD UPLOAD ON PLUS CLICK 🌟
  // 🌟 SMART FALLBACK DIRECT UPLOAD WORKFLOW 🌟
  const handleDirectUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    let targetPremiumName = null;
    let isMetadataMissing = !form.semester || !form.subject || !form.title.trim();

    // Agar saari fields filled hain, toh premium name banao (Bot Workflow)
    if (!isMetadataMissing) {
      const selectedSubject = subjects.find(s => s.id === form.subject);
      const subShort = selectedSubject ? getSubjectAbbreviation(selectedSubject.name) : "SUB";
      const extension = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
      targetPremiumName = `${subShort} - ${form.title.trim()}${extension}`;
    }

    setIsDirectUploading(true);
    setDirectUploadProgress(0);

    try {
      // Background upload request trigger (targetPremiumName null hoga toh original name se upload hoga)
      const result = await uploadSingleFile(
        file,
        "Admin_Direct",
        targetPremiumName,
        (percent) => {
          setDirectUploadProgress(percent);
        }
      );
      setDirectUploadProgress(100);

      if (result.success) {
        setForm(prev => ({ ...prev, driveLink: result.fileUrl }));
        
        // 🚨 FALLBACK TOAST TRIGGER
        if (isMetadataMissing) {
          toast(
            `⚠️ Uploaded! Please rename on Drive (Subject or Title was missing during attach).`,
            {
              duration: 5000,
              icon: '📂',
              style: {
                background: '#1c1917',
                color: '#fbbf24',
                border: '1px solid #d97706',
                fontSize: '13px',
                fontWeight: 'bold'
              },
            }
          );
        } else {
          toast.success(`Uploaded and named: "${targetPremiumName}" successfully! 📦`);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Direct upload stream rejected by Drive server configuration.");
    } finally {
      setTimeout(() => {
        setIsDirectUploading(false);
        setDirectUploadProgress(0);
      }, 800);
      e.target.value = ""; 
    }
  };

  async function onSubmit(e) {
    e.preventDefault();
    
    if (!form.title || !form.subject || !form.driveLink) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    try {
      setIsCheckingDuplicate(true);
      const querySnapshot = await getDocs(collection(db, "materials"));
      const normalizedInputTitle = form.title.toLowerCase().trim();
      
      let inputFileName = "";
      const driveLink = form.driveLink.trim();
      if (driveLink) {
        try {
          const urlObj = new URL(driveLink);
          const pathParts = urlObj.pathname.split('/');
          const fileNamePart = pathParts.find(part => part.includes('.') && !part.startsWith('d'));
          if (fileNamePart) inputFileName = fileNamePart.toLowerCase().trim();
        } catch (urlError) {
          const fileNameMatch = driveLink.match(/[^/]+\.[^/]+$/);
          if (fileNameMatch) inputFileName = fileNameMatch[0].toLowerCase().trim();
        }
      }
      
      const selectedSubject = subjects.find(s => s.id === form.subject);
      const subjectName = selectedSubject ? selectedSubject.name : "this subject";
      let isDuplicate = false;

      querySnapshot.forEach((doc) => {
        const dbData = doc.data();
        if (dbData.subjectId === form.subject) {
          const dbTitle = dbData.title ? dbData.title.toLowerCase().trim() : "";
          if (dbTitle === normalizedInputTitle) {
            isDuplicate = true;
            return;
          }
          if (inputFileName) {
            const dbFileName = (dbData.fileName || "").toLowerCase().trim();
            const dbLink = (dbData.link || "").toLowerCase().trim();
            let dbExtractedFileName = "";
            if (dbLink) {
              try {
                const dbUrlObj = new URL(dbLink);
                const dbPathParts = dbUrlObj.pathname.split('/');
                const dbFileNamePart = dbPathParts.find(part => part.includes('.') && !part.startsWith('d'));
                if (dbFileNamePart) dbExtractedFileName = dbFileNamePart.toLowerCase().trim();
              } catch (dbUrlError) {
                const dbFileNameMatch = dbLink.match(/[^/]+\.[^/]+$/);
                if (dbFileNameMatch) dbExtractedFileName = dbFileNameMatch[0].toLowerCase().trim();
              }
            }
            if (dbFileName === inputFileName || dbExtractedFileName === inputFileName) {
              isDuplicate = true;
              return;
            }
          }
        }
      });
      
      if (isDuplicate) {
        toast.error(`🚨 Wait! This material already exists in the "${subjectName}" subject. Check the Library!`);
        setIsCheckingDuplicate(false);
        return;
      }
      
      const result = await addMaterial({
        title: form.title,
        semId: form.semester,
        subjectId: form.subject,
        type: form.type,
        link: form.driveLink,
        status: "Pending",
        uploadedBy: user?.displayName || user?.email.split('@')[0] || "Student",
        uploadedByUid: user?.uid || null,
      });
      
      if (result.success) {
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
      
      <div className="flex w-full bg-zinc-900 rounded-lg p-1 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2 text-center font-bold transition-colors ${
            activeTab === 'upload' ? 'bg-yellow-400 text-black rounded-md' : 'text-white/70'
          }`}
        >
          Upload
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pending_admin')}
          className={`flex-1 py-2 text-center font-bold transition-colors ${
            activeTab === 'pending_admin' ? 'bg-yellow-400 text-black rounded-md' : 'text-white/70'
          }`}
        >
          Pending (Admin)
        </button>
      </div>
      
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
            <div className="mb-4">
              <label className="block text-white/70 text-sm mb-2">Semester *</label>
              <CustomSelect
                value={form.semester}
                onChange={(val) => { setForm(prev => ({ ...prev, semester: val, subject: "" })); }}
                placeholder="Select Semester"
                options={[
                  ...(semesters || []).map(sem => ({ value: sem.id, label: sem.name }))
                ]}
              />
            </div>

            <div className="mb-4">
              <label className="block text-white/70 text-sm mb-2">Type *</label>
              <CustomSelect
                value={form.type}
                onChange={(val) => onChange("type")({ target: { value: val } })}
                placeholder="Select Type"
                options={[
                  { value: "Notes", label: "Notes" },
                  { value: "Practicals", label: "Practicals" },
                  { value: "IMP", label: "IMP" },
                  { value: "Assignment", label: "Assignment" }
                ]}
              />
            </div>

            <div className="mb-4 relative z-[90]">
              <label className="block text-white/70 text-sm mb-2">Subject *</label>
              <CustomSelect
                value={form.subject}
                onChange={(val) => onChange("subject")({ target: { value: val } })}
                placeholder={form.semester ? "Select subject..." : "Select semester first"}
                options={form.semester ? (filteredSubjects || []).map(sub => ({ value: sub.id, label: `${sub.name} (Sem ${sub.semId})` })) : []}
                emptyMessage="⚠️ Please select Semester first"
              />
              {!form.semester && (
                <div className="text-[10px] text-amber-400 mt-1">
                  Please select a semester first
                </div>
              )}
            </div>
          </div>

          <label className="block mb-4">
            <div className="text-[11px] font-bold text-white/70 mb-2">
              Google Drive Link *
            </div>
            <div className="glass-card px-4 py-3 flex items-center gap-3">
              {isDirectUploading ? (
                <div className="relative w-5 h-5 flex items-center justify-center shrink-0" title="Uploading directly to Drive folder...">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.1)" strokeWidth="2" fill="transparent" />
                    <circle cx="10" cy="10" r="8" stroke="#FFD700" strokeWidth="2" fill="transparent"
                      strokeDasharray={2 * Math.PI * 8}
                      strokeDashoffset={(2 * Math.PI * 8) - (directUploadProgress / 100) * (2 * Math.PI * 8)}
                      className="transition-all duration-100"
                    />
                  </svg>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => directUploadRef.current?.click()}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-[#FFD700]/20 flex items-center justify-center text-white/55 hover:text-[#FFD700] transition-colors shrink-0 shadow-inner"
                  title="Direct Plus Upload to Drive (Bot Workflow)"
                >
                  <Plus size={14} strokeWidth={2.5} />
                </button>
              )}
              
              <input 
                type="file" 
                ref={directUploadRef} 
                className="hidden" 
                onChange={handleDirectUpload} 
              />

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

          <button 
            type="submit" 
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              isFormValid && !isCheckingDuplicate ? "btn-primary" : "bg-white/10 text-white/30 cursor-not-allowed"
            }`}
            disabled={!isFormValid || isCheckingDuplicate}
          >
            {isCheckingDuplicate 
              ? "Checking for duplicates..." 
              : isFormValid ? "Publish Material" : "Fill all required fields"}
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
