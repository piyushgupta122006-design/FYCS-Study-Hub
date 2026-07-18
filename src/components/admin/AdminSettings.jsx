import { useState, useEffect, useRef } from "react";
import { Trash2, Loader2, Send, Eye, Sparkles, Image } from "lucide-react";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";

// 🌟 STAR GENERATOR CONSTANTS (AdminSettings function ke bahar)
const STATIC_STARS = Array.from({ length: 4 }).map(() => ({
  '--duration': Math.floor(Math.random() * 15 + 6),
  '--delay': Math.floor(Math.random() * 10 + 1),
}));

const ORBIT_STARS = Array.from({ length: 20 }).map(() => ({
  '--angle': Math.floor(Math.random() * 360),
  '--duration': Math.floor(Math.random() * 15 + 6),
  '--delay': Math.floor(Math.random() * 10 + 1),
  '--alpha': Math.floor(Math.random() * 51 + 40) / 100,
  '--size': Math.floor(Math.random() * 5 + 2),
  '--distance': Math.floor(Math.random() * 161 + 40)
}));

export default function AdminSettings({
  users,
  notificationEmail, setNotificationEmail,
  notificationTitle, setNotificationTitle,
  notificationMessage, setNotificationMessage,
  emailMessage, setEmailMessage,
  isTestMode, setIsTestMode,
  handleSendNotification, isSending,
  sentNotifications, handleDeleteGlobal,
  CREATOR_EMAILS, user, handleResetAnalytics
}) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [accountQuotas, setAccountQuotas] = useState([]);
  const [loadingQuotas, setLoadingQuotas] = useState(false);
  const dropdownRef = useRef(null);

  const fetchAllQuotas = async () => {
    setLoadingQuotas(true);
    const urls = (import.meta.env.VITE_MAIL_SCRIPT_URL || "").split(",").map(u => u.trim()).filter(Boolean);
    const results = await Promise.all(urls.map(async (url, idx) => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ action: "checkQuota" })
        });
        const data = await res.json();
        return { accountNo: idx + 1, remaining: data.remaining ?? 0 };
      } catch {
        return { accountNo: idx + 1, remaining: 0 };
      }
    }));
    setAccountQuotas(results);
    setLoadingQuotas(false);
  };

  useEffect(() => {
    fetchAllQuotas();
  }, []);

  const tags = notificationEmail ? notificationEmail.split(",").map(t => t.trim()).filter(Boolean) : [];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!notificationEmail) {
      setInputValue("");
    }
  }, [notificationEmail]);

  const handleAiEnhance = async () => {
    if (!emailMessage.trim()) {
      toast.error("Please type your detailed draft in the 'Professional Email Message (Long)' box first!");
      return;
    }
    // SECURE NOTE: Client-side keys are bundled in the frontend and visible in the browser.
    // Ensure this key is strictly restricted using HTTP referrer restrictions (Domain Restriction) in the Google Cloud Console.
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      toast.error("Gemini API key is not configured.");
      return;
    }
    const loadingToast = toast.loading("AI is parsing your custom draft data...");
    try {
      const prompt = `You are an Expert Copywriter and Official Announcement Architect for BNN CS Study Hub.
      Your task is to take the user's rough input and ENHANCE it into a highly engaging, professional, and visually appealing email announcement.
      
      CRITICAL ROLE & STRICT TONAL BOUNDS:
      - The tone must be exciting, professional, and welcoming (perfect for university students).
      - Do not just repeat the input. EXPAND on it beautifully. Add proper greetings, smooth transitions, and a professional sign-off (e.g., "Best regards, [Name], Admin & Creator").
      - Use emojis naturally to make it visually appealing and scannable (e.g., 📁, 👥, ✨, 🚀).
      - Structure the 'emailBody' perfectly using HTML formatting: use <br/><br/> for paragraph breaks, and <b>...</b> to highlight key metrics or important words. If statistics are provided, format them as a clear list.
      -Do not Use Hard english Words.
      STRICT CONSTRAINTS:
      1. 'title': MAXIMUM 4-6 words long, catchy, official, with exactly 1 relevant emoji.
      2. 'shortMessage': A single-line marquee notification text (MAX 60 characters with 1 emoji).
      3. 'emailBody': The fully enhanced, expanded, and beautiful HTML email text.

      Original Rough Draft to enhance: "${emailMessage}"
      
      Return ONLY a pure valid JSON object string in this exact schema template without any markdown formatting wraps or codeblocks:
      {
        "title": "...",
        "shortMessage": "...",
        "emailBody": "..."
      }`;

      const makeRequest = async (apiVersion) => {
        const response = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error?.message || `HTTP ${response.status}`);
        }
        return data;
      };

      let data = null;
      let successfulVersion = "";

      // Try stable v1 first (highly available), then fallback to v1beta
      const versions = ["v1", "v1beta"];
      let lastErrorMessage = "";

      for (const version of versions) {
        try {
          data = await makeRequest(version);
          successfulVersion = version;
          break;
        } catch (err) {
          console.warn(`Attempt failed for gemini-3.1-flash-lite on ${version}:`, err.message);
          lastErrorMessage = err.message;
        }
      }

      if (!data) {
        throw new Error(lastErrorMessage);
      }

      let aiText = data.candidates[0].content.parts[0].text;

      // Strict JSON extraction regex to clean markdown noise if any
      aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(aiText);

      // 🌟 AUTOMATIC TEENO NODES SIMULTANEOUS STREAM FILL
      setNotificationTitle(parsed.title || "");
      setNotificationMessage(parsed.shortMessage || "");
      setEmailMessage(parsed.emailBody || "");

      toast.success("All fields filled with premium formats! ✨", { id: loadingToast });
    } catch (error) {
      console.error(error);
      toast.error(`AI Error: ${error.message}`, { id: loadingToast });
    }
  };

  const compressImage = (file, maxWidth = 1280, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, maxWidth / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64.split(',')[1]); // base64 payload only
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 🌟 SCREENSHOT UPLOAD LOGIC FOR EMAILS WITH CLIENT-SIDE COMPRESSION
  const handleImageUploadForEmail = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // relaxed limit, compression handles the rest
      toast.error("Screenshot must be under 5MB.");
      e.target.value = '';
      return;
    }

    const loadingToast = toast.loading("Compressing & uploading screenshot...");
    setIsUploadingImg(true);

    try {
      const base64Image = await compressImage(file, 1280, 0.7);

      const formData = new FormData();
      formData.append('image', base64Image);

      const imgbbKey = import.meta.env.VITE_IMGBB_KEY;
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
        method: 'POST',
        body: formData
      });

      const result = await res.json();

      if (result.success) {
        // HTML Image tag banakar email text me jod do
        const imgHtml = `<br/><br/><img src="${result.data.url}" alt="Admin Screenshot" style="max-width:100%; height:auto; border-radius:8px; border:1px solid #333;" /><br/>`;

        setEmailMessage((prev) => prev + imgHtml);
        toast.success("Screenshot compressed & attached successfully!", { id: loadingToast });
      } else {
        throw new Error("ImgBB server rejected image");
      }
    } catch (err) {
      toast.error("Upload failed.", { id: loadingToast });
    } finally {
      setIsUploadingImg(false);
      e.target.value = '';
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const updatedTags = tags.filter(t => t !== tagToRemove);
    setNotificationEmail(updatedTags.join(", "));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newEmail = inputValue.trim().replace(/,/g, "");
      if (newEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(newEmail)) {
          if (!tags.includes(newEmail)) {
            const updatedTags = [...tags, newEmail];
            setNotificationEmail(updatedTags.join(", "));
            setInputValue("");
            setShowDropdown(false);
          } else {
            toast.error("Email already added");
          }
        } else {
          toast.error("Please enter a valid email");
        }
      }
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      const updatedTags = tags.slice(0, -1);
      setNotificationEmail(updatedTags.join(", "));
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-3 sm:p-4">
        <h3 className="font-bold text-sm sm:text-base mb-2 sm:mb-3 text-white/90">📢 Send Notification</h3>
        <div className="space-y-3">
          <div className="relative" ref={dropdownRef}>
            <label className="block text-white/70 text-xs sm:text-sm mb-1">Target User Email (leave blank for ALL)</label>
            <div className="flex flex-wrap gap-2 items-center w-full glass-card px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg border border-white/10 bg-white/5 focus-within:border-blue-500/80 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all duration-200">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border shrink-0 font-medium transition-colors"
                  style={{
                    color: "oklch(0.89 0.1 214.95)",
                    backgroundColor: "oklch(0.89 0.1 214.95 / 0.1)",
                    borderColor: "oklch(0.89 0.1 214.95 / 0.25)"
                  }}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-400 font-bold text-[14px] leading-none transition-colors outline-none cursor-pointer"
                    style={{ color: "oklch(0.89 0.1 214.95 / 0.7)" }}
                  >
                    &times;
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={inputValue}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setShowDropdown(true);
                }}
                onKeyDown={handleKeyDown}
                className="flex-grow bg-transparent text-white placeholder:text-white/60 focus:outline-none text-sm p-0.5 min-w-[150px]"
                placeholder={tags.length === 0 ? "user@example.com" : ""}
              />
            </div>

            {/* 🌟 USER EMAIL MATCHING RECOMMENDATIONS DROPDOWN */}
            {(() => {
              const currentQuery = inputValue.trim();
              const earlierEmails = tags.map(t => t.toLowerCase());

              const matches = users && currentQuery.length > 0
                ? users.filter(u =>
                  u.email &&
                  u.email.toLowerCase().includes(currentQuery.toLowerCase()) &&
                  !earlierEmails.includes(u.email.toLowerCase()) &&
                  u.email.toLowerCase() !== currentQuery.toLowerCase()
                )
                : [];

              if (showDropdown && currentQuery.length > 0 && matches.length > 0) {
                return (
                  <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-[#0f0f11] border border-white/10 rounded-lg shadow-xl z-50 no-scrollbar">
                    {matches.map((userMatch) => (
                      <div
                        key={userMatch.id || userMatch.email}
                        onClick={() => {
                          const updatedTags = [...tags, userMatch.email];
                          setNotificationEmail(updatedTags.join(", "));
                          setInputValue("");
                          setShowDropdown(false);
                        }}
                        className="px-4 py-2.5 text-xs text-zinc-300 hover:text-white hover:bg-white/5 cursor-pointer border-b border-white/[0.03] last:border-none flex justify-between items-center"
                      >
                        <span className="font-medium truncate">{userMatch.email}</span>
                        {userMatch.displayName && (
                          <span className="text-[10px] text-zinc-500 ml-2 truncate">({userMatch.displayName})</span>
                        )}
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })()}
          </div>
          <div>
            <label className="block text-white/80 text-xs sm:text-sm font-medium mb-1">Notification Title</label>
            <input
              type="text"
              value={notificationTitle}
              onChange={(e) => setNotificationTitle(e.target.value)}
              className="w-full glass-card px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-white/20 bg-white/5 text-white placeholder:text-white/60 focus:border-blue-500 focus:outline-none text-sm"
              placeholder="Notification title"
              required
            />
          </div>
          {/* Box 1: Short In-App Notification */}
          <div>
            <label className="block text-white/80 text-xs sm:text-sm font-medium mb-1">App Notification (Short, 1-line marquee)</label>
            <input
              type="text"
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
              className="w-full glass-card px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-white/20 bg-white/5 text-white placeholder:text-white/60 focus:border-blue-500 focus:outline-none text-sm"
              placeholder="e.g. Assignment date extended (Type here & click Enhance with AI)..."
            />
          </div>

          {/* Box 2: Long Professional Email */}
          <div>
            <label className="block text-purple-300 text-xs sm:text-sm font-medium mb-1">Professional Email Message (Long)</label>
            <textarea
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              className="w-full glass-card px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-purple-500/40 bg-purple-500/5 text-white placeholder:text-purple-200/60 focus:border-purple-500 focus:outline-none text-sm min-h-[150px] no-scrollbar"
              placeholder="AI will automatically write the detailed professional email here... (You can also type manually and attach screenshots)"
            />

            {/* 🌟 TEST MODE TOGGLE & ATTACH SCREENSHOT BUTTON */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
              <label className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer select-none bg-zinc-800/40 hover:bg-zinc-800/70 border border-zinc-700/50 px-3 py-1.5 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={isTestMode}
                  onChange={(e) => setIsTestMode(e.target.checked)}
                  className="accent-amber-500 rounded cursor-pointer w-4 h-4"
                />
                <span className="font-semibold text-amber-400">🧪 Test Mode</span>
                <span className="text-[10px] text-zinc-400 hidden sm:inline">(simulate - no real email sent)</span>
              </label>

              <label className={`cursor-pointer text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${isUploadingImg
                  ? 'bg-zinc-800 text-zinc-500 border-zinc-700'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
                }`}>
                {isUploadingImg ? <Loader2 className="animate-spin" size={14} /> : <Image size={14} />}
                {isUploadingImg ? "Uploading..." : "Attach Screenshot"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUploadForEmail}
                  disabled={isUploadingImg}
                />
              </label>
            </div>
          </div>

          {/* 🚀 INTERNAL CSS SIRF GALAXY BUTTON KE LIYE */}
          <style>{`
            .galaxy-btn-container {
              --transition: 0.25s;
              --spark: 1.8s;
              --hue: 245;
              --active: 1; /* 🌟 'hover wala state' permanently active! */
            }
            .galaxy-btn {
              --cut: 0.1em;
              --bg:
                radial-gradient(120% 120% at 126% 126%, hsl(var(--hue) calc(var(--active) * 97%) 98% / calc(var(--active) * 0.9)) 40%, transparent 50%) calc(100px - (var(--active) * 100px)) 0 / 100% 100% no-repeat, 
                radial-gradient(120% 120% at 120% 120%, hsl(var(--hue) calc(var(--active) * 97%) 70% / calc(var(--active) * 1)) 30%, transparent 70%) calc(100px - (var(--active) * 100px)) 0 / 100% 100% no-repeat,
                hsl(var(--hue) calc(var(--active) * 100%) calc(12% - (var(--active) * 8%)));
              background: var(--bg);
              border: 0;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 0.5em;
              white-space: nowrap;
              position: relative;
              box-shadow:
                0 0 calc(var(--active) * 6em) calc(var(--active) * 3em) hsl(var(--hue) 97% 61% / 0.5),
                0 0.05em 0 0 hsl(var(--hue) calc(var(--active) * 97%) calc((var(--active) * 50%) + 30%)) inset,
                0 -0.05em 0 0 hsl(var(--hue) calc(var(--active) * 97%) calc(var(--active) * 10%)) inset;
              transition: box-shadow var(--transition), scale var(--transition), background var(--transition);
              transform-style: preserve-3d;
              perspective: 100vmin;
              overflow: hidden;
            }
            .galaxy-btn:active:not(:disabled) { scale: 0.97; }
            .galaxy-star {
              height: calc(var(--size) * 1px);
              aspect-ratio: 1;
              background: white;
              border-radius: 50%;
              position: absolute;
              opacity: var(--alpha);
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(10deg) rotate(0deg) translateY(calc(var(--distance) * 1px));
              animation: orbit calc(var(--duration) * 1s) calc(var(--delay) * -1s) infinite linear;
            }
            @keyframes orbit { to { transform: translate(-50%, -50%) rotate(10deg) rotate(360deg) translateY(calc(var(--distance) * 1px)); } }
            .galaxy-wrapper { position: absolute; width: 100%; aspect-ratio: 1; top: 50%; left: 50%; translate: -50% -50%; overflow: hidden; opacity: var(--active); }
            .galaxy-ring { height: 200%; width: 200%; position: absolute; top: 50%; left: 50%; border-radius: 50%; transform: translate(-28%, -40%) rotateX(-24deg) rotateY(-30deg) rotateX(90deg); transform-style: preserve-3d; }
            .galaxy-container { position: absolute; inset: 0; opacity: var(--active); mask: radial-gradient(white, transparent); -webkit-mask: radial-gradient(white, transparent); }
            .star-static { animation: none; top: 50%; left: 50%; transform: translate(0, 0); max-height: 4px; filter: brightness(4); opacity: 0.9; animation: move-x calc(var(--duration) * 0.1s) calc(var(--delay) * -0.1s) infinite linear, move-y calc(var(--duration) * 0.2s) calc(var(--delay) * -0.2s) infinite linear; }
            @keyframes move-x { 0% { translate: -100px 0; } 100% { translate: 100px 0; } }
            @keyframes move-y { 0% { transform: translate(0, -50px); } 100% { transform: translate(0, 50px); } }
            .galaxy-spark { position: absolute; inset: 0; border-radius: 0.75rem; rotate: 0deg; overflow: hidden; mask: linear-gradient(white, transparent 50%); -webkit-mask: linear-gradient(white, transparent 50%); animation: flip calc(var(--spark) * 2) infinite steps(2, end); }
            @keyframes flip { to { rotate: 360deg; } }
            .galaxy-spark:before { content: ""; position: absolute; width: 200%; aspect-ratio: 1; top: 0%; left: 50%; z-index: -1; translate: -50% -15%; rotate: 0; transform: rotate(-90deg); opacity: calc((var(--active)) + 0.4); background: conic-gradient(from 0deg, transparent 0 340deg, white 360deg); animation: rotate var(--spark) linear infinite both; }
            .galaxy-spark:after { content: ""; position: absolute; inset: var(--cut); border-radius: 0.75rem; }
            .galaxy-backdrop { position: absolute; inset: var(--cut); background: var(--bg); border-radius: 0.75rem; }
            @keyframes rotate { to { transform: rotate(90deg); } }
          `}</style>

          {/* 🌟 Magic Buttons Side-by-Side */}
          <div className="flex flex-row gap-2 sm:gap-3 pt-2 w-full items-stretch justify-between">

            {/* 🚀 SEND BUTTON: Max layout tracking stretch flex */}
            <button
              type="button"
              disabled={!notificationTitle || !notificationMessage || isSending}
              onClick={() => handleSendNotification(emailMessage)}
              className="flex-1 px-3 sm:px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-[12px] sm:text-sm whitespace-nowrap min-w-0 shadow-lg"
            >
              {isSending ? <Loader2 className="animate-spin shrink-0" size={16} /> : <Send className="shrink-0" size={16} />}
              <span className="truncate">{isSending ? "Sending..." : "Send Notification"}</span>
            </button>

            {/* 🚀 GALAXY AI BUTTON: Compact mobile square frame setup */}
            <div className="w-[48px] h-[48px] sm:w-auto sm:flex-1 galaxy-btn-container relative shrink-0">
              <button
                type="button"
                onClick={handleAiEnhance}
                disabled={!emailMessage || isSending}
                className="galaxy-btn w-full h-full !rounded-xl group disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <span className="galaxy-spark"></span>
                <span className="galaxy-backdrop"></span>

                <span className="galaxy-container">
                  {STATIC_STARS.map((style, i) => <span key={i} className="galaxy-star star-static" style={style}></span>)}
                </span>

                <span className="galaxy-wrapper">
                  <span className="galaxy-ring">
                    {ORBIT_STARS.map((style, i) => <span key={i} className="galaxy-star" style={style}></span>)}
                  </span>
                </span>

                <span className="relative z-10 flex items-center justify-center gap-2 text-white/90 group-disabled:text-white/50 text-[12px] sm:text-sm w-full px-1">
                  {/* 🌌 GALAXY STAR SVG ICON ACCENT */}
                  <svg viewBox="0 0 24 24" height={22} width={22} xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]">
                    <g fill="none">
                      <path d="m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z"></path>
                      <path d="M9.107 5.448c.598-1.75 3.016-1.803 3.725-.159l.06.16l.807 2.36a4 4 0 0 0 2.276 2.411l.217.081l2.36.806c1.75.598 1.803 3.016.16 3.725l-.16.06l-2.36.807a4 4 0 0 0-2.412 2.276l-.081.216l-.806 2.361c-.598 1.75-3.016 1.803-3.724.16l-.062-.16l-.806-2.36a4 4 0 0 0-2.276-2.412l-.216-.081l-2.36-.806c-1.751-.598-1.804-3.016-.16-3.724l.16-.062l2.36-.806A4 4 0 0 0 8.22 8.025l.081-.216zM11 6.094l-.806 2.36a6 6 0 0 1-3.49 3.649l-.25.091l-2.36.806l2.36.806a6 6 0 0 1 3.649 3.49l.091.25l.806 2.36l.806-2.36a6 6 0 0 1 3.49-3.649l.25-.09l2.36-.807l-2.36-.806a6 6 0 0 1-3.649-3.49l-.09-.25zM19 2a1 1 0 0 1 .898.56l.048.117l.35 1.026l1.027.35a1 1 0 0 1 .118 1.845l-.118.048l-1.026.35l-.35 1.027a1 1 0 0 1-1.845.117l-.048-.117l-.35-1.026l-1.027-.35a1 1 0 0 1-.118-1.845l.118-.048l1.026-.35l.35-1.027A1 1 0 0 1 19 2" fill="currentColor"></path>
                    </g>
                  </svg>
                  <span className="hidden sm:inline font-bold tracking-wide text-shadow-sm truncate">AI Enhance ✨</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 EMAIL QUOTA STATUS CARD */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Email Quota Status</h3>
          <button
            type="button"
            onClick={fetchAllQuotas}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-white font-medium transition-colors cursor-pointer"
          >
            {loadingQuotas ? "Checking..." : "Refresh"}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {accountQuotas.length > 0 ? (
            accountQuotas.map((q) => (
              <div key={q.accountNo} className="bg-zinc-800/50 rounded-lg p-2.5 text-center border border-zinc-700/30">
                <p className="text-[10px] text-zinc-400">Account {q.accountNo}</p>
                <p className="text-lg font-bold text-emerald-400 my-0.5">{q.remaining}</p>
                <p className="text-[9px] text-zinc-500">emails left today</p>
              </div>
            ))
          ) : (
            <p className="col-span-full text-xs text-zinc-500 text-center py-2">
              {loadingQuotas ? "Checking account quotas..." : "No email script URLs configured"}
            </p>
          )}
        </div>
      </div>

      {/* 🌟 UPDATED SENT NOTIFICATIONS CARD WITH DYNAMIC DELETE ALL ICON */}
      <div className="glass-card p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base md:text-lg text-white/90">📋 Sent Notifications</h3>

          {/* 🚨 TEMPORARY / PERMANENT BULK DELETE ACTION FOR CREATOR/ADMIN POOL */}
          {sentNotifications.length > 0 && CREATOR_EMAILS.includes(user?.email) && (
            <button
              type="button"
              onClick={async () => {
                const result = await Swal.fire({
                  title: "Delete All Notifications?",
                  text: "This will permanently delete all sent notifications from the database! This action cannot be undone.",
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonText: "Yes, Wipe Out",
                  cancelButtonText: "Cancel",
                  buttonsStyling: false,
                  background: "#0c0c0e",
                  color: "#ffffff",
                  customClass: {
                    popup: "border border-zinc-800 rounded-3xl p-5 shadow-2xl",
                    confirmButton: "bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl text-xs font-bold text-white mr-3 cursor-pointer",
                    cancelButton: "bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
                  }
                });

                if (result.isConfirmed) {
                  const loadingToast = toast.loading("Clearing notification broadcast streams...");
                  try {
                    // Loop over each active record sequentially to execute delete flows
                    for (const notif of sentNotifications) {
                      await handleDeleteGlobal(notif.id);
                    }
                    toast.success("All notifications deleted successfully! 🧹", { id: loadingToast });
                  } catch (err) {
                    console.error(err);
                    toast.error("Bulk deletion failed on database synchronization node.", { id: loadingToast });
                  }
                }
              }}
              className="flex items-center gap-1 p-1.5 sm:px-3 sm:py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-bold border border-rose-500/20 active:scale-95 transition-all cursor-pointer shadow-sm"
              title="Delete All Notifications"
            >
              <Trash2 size={14} className="shrink-0" />
              <span className="hidden sm:inline">Delete All</span>
            </button>
          )}
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sentNotifications.length > 0 ? (
            sentNotifications.map((notif) => (
              <div key={notif.id} className="flex items-center justify-between p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/50">
                <div className="min-w-0 flex-1 pr-4">
                  <h4 className="font-bold text-sm text-white truncate">{notif.title}</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">To: {notif.targetEmail === 'ALL' ? 'Everyone' : notif.targetEmail}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Eye icon/read counts hidden on mobile, only delete button shown */}
                  <div
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium border border-blue-500/20"
                    title={`${notif.readBy?.length || 0} users have read this`}
                  >
                    <Eye size={14} />
                    <span>{notif.readBy?.length || 0}</span>
                  </div>

                  {CREATOR_EMAILS.includes(user.email) && (
                    <button
                      onClick={async () => {
                        const result = await Swal.fire({
                          title: "Delete Notification?",
                          text: `Are you sure you want to delete "${notif.title}"?`,
                          icon: "warning",
                          showCancelButton: true,
                          confirmButtonText: "Yes, Delete",
                          cancelButtonText: "Cancel",
                          buttonsStyling: false,
                          background: "#0c0c0e",
                          color: "#ffffff",
                          customClass: {
                            popup: "border border-zinc-800 rounded-3xl p-5 shadow-2xl",
                            confirmButton: "bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl text-xs font-bold text-white mr-3 cursor-pointer",
                            cancelButton: "bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
                          }
                        });

                        if (result.isConfirmed) {
                          try {
                            await handleDeleteGlobal(notif.id);
                            toast.success("Notification deleted successfully! 🧹");
                          } catch (err) {
                            console.error(err);
                            toast.error("Deletion failed on database synchronization node.");
                          }
                        }
                      }}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete Notification"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-white/50 text-center py-4">No notifications sent yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
