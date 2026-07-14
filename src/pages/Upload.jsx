import { CloudUpload, Plus, X, File, CheckCircle, Loader2 } from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { useApp } from "../context/AppContext";
import { useNavigate } from "react-router-dom";

const defaultUploadMemory = { title: "", semester: "", subject: "", type: "Notes", files: [], fileLinks: {} };
let uploadMemory = { ...defaultUploadMemory };

// 🚨 CUSTOM SELECT
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
        className="w-full glass-card px-4 py-3 rounded-xl border border-white/10 bg-black/50 text-white hover:border-[#FFD700]/50 cursor-pointer flex justify-between items-center transition-all duration-300"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`truncate mr-2 ${!selectedOption ? "text-white/35 text-sm" : "text-sm font-medium"}`}>
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
                  <span className="block whitespace-nowrap pr-6">{opt.label}</span>
                  {String(value) === String(opt.value) && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute right-4 top-1/2 -translate-y-1/2 flex-shrink-0">
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

export default function Upload() {
  const { semesters, subjects, user, isAdmin, startGlobalUpload, uploadSingleFile } = useApp();
  const navigate = useNavigate();

  const [title, setTitle] = useState(() => uploadMemory.title);
  const [semester, setSemester] = useState(() => uploadMemory.semester);
  const [subject, setSubject] = useState(() => uploadMemory.subject);
  const [type, setType] = useState(() => uploadMemory.type);
  const [selectedFiles, setSelectedFiles] = useState(() => uploadMemory.files);
  
  // 🌟 Background progress & links tracker management mapping
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadedLinks, setUploadedLinks] = useState(() => uploadMemory.fileLinks || {});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const dragDepthRef = useRef(0);

  useEffect(() => {
    uploadMemory = { title, semester, subject, type, files: selectedFiles, fileLinks: uploadedLinks };
  }, [title, semester, subject, type, selectedFiles, uploadedLinks]);

  useEffect(() => {
    if (isAdmin === true) {
      navigate("/admin-upload");
    }
  }, [isAdmin, navigate]);

  const availableSubjects = useMemo(() => {
    if (!semester) return [];
    return subjects.filter(s => String(s.semId) === String(semester));
  }, [subjects, semester]);

  // 🌟 Check if all background cloud files have completed their operations safely
  const allFilesUploaded = useMemo(() => {
    if (selectedFiles.length === 0) return false;
    return selectedFiles.every(file => uploadedLinks[file.name]);
  }, [selectedFiles, uploadedLinks]);

  const isFormValid = title && semester && subject && type && allFilesUploaded;

  if (isAdmin === true) return null;

  const clearUploadMemory = () => {
    uploadMemory = { ...defaultUploadMemory };
    setTitle("");
    setSemester("");
    setSubject("");
    setType("Notes");
    setSelectedFiles([]);
    setUploadProgress({});
    setUploadedLinks({});
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 🌟 Real background asynchronous upload matching typical upload states
  const triggerBackgroundUpload = async (file) => {
    const fileName = file.name;
    setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));

    try {
      const result = await uploadSingleFile(
        file,
        user?.displayName || user?.email?.split('@')[0] || "Student",
        undefined,
        (percent) => {
          setUploadProgress(prev => ({ ...prev, [fileName]: percent }));
        }
      );

      if (result.success) {
        setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
        setUploadedLinks(prev => ({ ...prev, [fileName]: { fileUrl: result.fileUrl, fileId: result.fileId } }));
        toast.success(`✓ ${fileName} ready!`);
      } else {
        setUploadProgress(prev => { const c = { ...prev }; delete c[fileName]; return c; });
        setSelectedFiles(prev => prev.filter(f => f.name !== fileName));
        toast.error(`Failed to upload ${fileName}`);
      }
    } catch (err) {
      setUploadProgress(prev => { const c = { ...prev }; delete c[fileName]; return c; });
      setSelectedFiles(prev => prev.filter(f => f.name !== fileName));
      toast.error(`Failed to upload ${fileName}`);
    }
  };

  const appendFiles = (files) => {
    if (!files.length) return;
    setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
    
    // Trigger instantly upon injection tracking metrics block setup
    files.forEach(file => {
      triggerBackgroundUpload(file);
    });
  };

  const handleFileSelect = (e) => {
    appendFiles(Array.from(e.target.files || []));
    e.target.value = "";
  };

  const removeFile = (indexToRemove, fileName) => {
    setSelectedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    setUploadProgress(prev => { const c = { ...prev }; delete c[fileName]; return c; });
    setUploadedLinks(prev => { const c = { ...prev }; delete c[fileName]; return c; });
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    appendFiles(Array.from(e.dataTransfer.files || []));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);

    try {
      // Transforming dynamic parameters arrays mapping to final validation sets
      const finalLinksArray = selectedFiles.map(f => uploadedLinks[f.name]);
      
      const result = await startGlobalUpload(
        selectedFiles,
        { title, semester, subject, type, preUploadedLinks: finalLinksArray },
        user?.displayName || user?.email?.split('@')[0] || "Student",
        user?.email
      );

      if (result?.success) {
        clearUploadMemory();
        setIsDragging(false);
        dragDepthRef.current = 0;
        toast.success("Submitted successfully for admin approval!");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-5 pt-8 max-w-md mx-auto min-h-[100dvh] pb-24 relative">

      <div className="mb-6 text-center">
        <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">Contribute</h1>
        <p className="text-white/55 text-xs mt-1">Share notes, practicals, and assignments.</p>
      </div>
      
      <form className="glass-card p-4" onSubmit={handleSubmit}>
        {/* User Identity Banner */}
        <div className="mb-5 glass-card p-3 flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl">
          {user?.photoURL ? (
            <img
              src={user.photoURL.includes("googleusercontent.com") ? (user.photoURL.includes("=") ? user.photoURL.replace(/=s\d+-c/, '=s128-c') : user.photoURL + "=s128-c") : user.photoURL}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-lg"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-white font-bold text-lg border border-white/20 shadow-lg">
              {user?.displayName?.charAt(0) || "U"}
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold text-white/90 truncate">{user?.displayName || "Student"}</p>
            <p className="text-[10px] text-white/50 truncate">{user?.email || "Unknown Email"}</p>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
            <CheckCircle size={10} className="text-blue-400" /> Verified
          </div>
        </div>

        <label className="block mb-4">
          <div className="text-[11px] font-bold text-white/70 mb-2">Title *</div>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)} placeholder='e.g., Unit 1 Notes'
            className="w-full glass-card px-4 py-3 text-sm outline-hidden placeholder:text-white/35 bg-black/50 focus:border-[#FFD700]/50" required
          />
        </label>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[11px] font-bold text-white/70 mb-2">Semester *</label>
            <CustomSelect
              value={semester} onChange={(val) => { setSemester(val); setSubject(""); }}
              placeholder="Select Sem" options={(semesters || []).map(sem => ({ value: sem.id, label: sem.name.replace('Semester ', 'Sem ') }))}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-white/70 mb-2">Type *</label>
            <CustomSelect value={type} onChange={(val) => setType(val)} placeholder="Select Type" options={[ { value: "Notes", label: "Notes" }, { value: "Practicals", label: "Practicals" }, { value: "IMP", label: "IMP" }, { value: "Assignment", label: "Assignment" } ]} />
          </div>
        </div>

        <div className="mb-5 relative z-[90]">
          <label className="block text-[11px] font-bold text-white/70 mb-2">Subject *</label>
          <CustomSelect value={subject} onChange={(val) => setSubject(val)} placeholder={semester ? "Select Subject" : "Select semester first"} options={semester ? availableSubjects.map(sub => ({ value: sub.id, label: sub.name })) : []} emptyMessage="⚠️ Please select Semester first" />
        </div>

        <div className="mb-5">
          <label className="block text-[11px] font-bold text-white/70 mb-2">Attachments *</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`glass-card border-dashed border-2 p-6 flex flex-col items-center justify-center cursor-pointer group transition-all ${isDragging ? "border-[#FFD700] bg-[#FFD700]/10 scale-[1.01]" : "border-white/10 hover:border-[#FFD700]/50 bg-black/30 hover:bg-[#FFD700]/5"}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${isDragging ? "bg-[#FFD700]/20" : "bg-white/5 group-hover:bg-[#FFD700]/20"}`}>
              <CloudUpload size={20} className={isDragging ? "text-[#FFD700]" : "text-white/50 group-hover:text-[#FFD700]"} />
            </div>
            <p className="text-xs text-white/70 font-medium text-center">Drop files here or tap to select</p>
            <p className="text-[10px] text-white/35 mt-1 text-center">Multiple files are supported</p>
            <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          </div>
          
          {selectedFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              {selectedFiles.map((file, index) => {
                const progress = uploadProgress[file.name] || 0;
                const isDone = uploadedLinks[file.name];

                return (
                  <div key={index} className="flex items-center justify-between glass-card bg-white/5 p-2.5 px-3 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <File size={14} className="text-[#FFD700] flex-shrink-0" />
                      <span className="text-xs text-white/80 truncate">{file.name}</span>
                    </div>
                    
                    {/* 🌟 ACTION ROW: Left of Cross circular loader mapping integration */}
                    <div className="flex items-center gap-3">
                      {!isDone ? (
                        <div className="relative w-5 h-5 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.1)" strokeWidth="2" fill="transparent" />
                            <circle cx="10" cy="10" r="8" stroke="#FFD700" strokeWidth="2" fill="transparent" 
                              strokeDasharray={2 * Math.PI * 8} 
                              strokeDashoffset={(2 * Math.PI * 8) - (progress / 100) * (2 * Math.PI * 8)} 
                              className="transition-all duration-100"
                            />
                          </svg>
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">Ready</span>
                      )}
                      
                      <button type="button" onClick={() => removeFile(index, file.name)} className="text-white/40 hover:text-red-400 p-1 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button 
          type="submit" 
          disabled={!isFormValid || isSubmitting} 
          className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
            isFormValid && !isSubmitting 
              ? "bg-[#FFD700] text-black shadow-[0_0_15px_rgba(255,215,0,0.3)] hover:scale-[1.02]" 
              : "bg-white/10 text-white/30 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? (
            <><Loader2 size={16} className="animate-spin" /> Submitting Request...</>
          ) : (
            <><CloudUpload size={16} /> Submit for Approval</>
          )}
        </button>
      </form>
    </div>
  );
}
