import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect, useLayoutEffect, useState, useRef, lazy, Suspense } from "react";
import { doc, setDoc, increment, arrayUnion } from "firebase/firestore";
import { db } from "./firebase";
import { Bot, X, Loader2 } from "lucide-react";
import BrainCircuitIcon from "./components/AnimatedIcons";

import { useApp } from "./context/AppContext";

// Lazy load ALL main page components for route-level code splitting
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Library = lazy(() => import('./pages/Library'));
const Materials = lazy(() => import('./pages/Materials'));
const BannedPage = lazy(() => import('./pages/BannedPage'));
const Admin = lazy(() => import('./pages/Admin'));
const Profile = lazy(() => import('./pages/Profile'));
const Subjects = lazy(() => import('./pages/Subjects'));
const Upload = lazy(() => import('./pages/Upload'));
const AdminUpload = lazy(() => import('./pages/AdminUpload'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const Navbar = lazy(() => import('./components/Navbar'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));
const TodayVisitorsPage = lazy(() => import('./pages/TodayVisitorsPage'));

// Shared shimmer primitive
const Sk = ({ className, style }) => (
  <div className={`bg-white/10 animate-pulse rounded ${className || ''}`} style={style} />
);

// Matches actual glass-nav: fixed bottom, backdrop-blur, border-t
function NavbarSkeleton() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-white/10 z-50 px-2 py-3"
         style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(24px)' }}>
      <div className="flex justify-around items-center max-w-md mx-auto">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Sk className="w-6 h-6 rounded-md" />
            <Sk className="h-2 w-8 rounded" />
          </div>
        ))}
      </div>
    </nav>
  );
}

function HomePageSkeleton() {
  return (
    <div className="p-5 pt-10 max-w-md mx-auto">
      <div className="text-center mb-10 flex flex-col items-center gap-2.5">
        <Sk className="w-16 h-16 rounded-full" />
        <Sk className="h-7 w-48" />
        <Sk className="h-3 w-64" />
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Sk className="w-3.5 h-3.5" /><Sk className="h-2.5 w-28" />
      </div>
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><Sk className="w-3.5 h-3.5" /><Sk className="h-2.5 w-20" /></div>
        <Sk className="h-2.5 w-12" />
      </div>
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
    </div>
  );
}

function LibraryPageSkeleton() {
  return (
    <div className="p-5 pt-8 max-w-4xl mx-auto pb-24">
      <div className="text-center mb-4 flex flex-col items-center gap-2">
        <Sk className="h-6 w-40" /><Sk className="h-3 w-72" />
      </div>
      <div className="glass-card p-4 mb-4">
        <div className="space-y-3">
          <div className="flex gap-3">
            <Sk className="flex-1 h-10 rounded-xl" />
            <Sk className="w-11 h-10 rounded-xl flex-shrink-0" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Sk className="h-10 rounded-2xl" /><Sk className="h-10 rounded-2xl" /><Sk className="h-10 rounded-2xl" />
          </div>
        </div>
      </div>
      <Sk className="h-3 w-40 mb-3" />
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="glass-card p-4 flex items-start gap-3">
            <Sk className="w-10 h-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Sk className="h-3.5" style={{ width: `${[70,55,80,60,75][i]}%` }} />
              <Sk className="h-3" style={{ width: `${[45,40,50,42,48][i]}%` }} />
              <Sk className="h-2.5 w-1/3" />
            </div>
            <Sk className="w-7 h-7 rounded-md flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SubjectsPageSkeleton() {
  return (
    <div className="p-5 pt-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Sk className="w-10 h-10 rounded-xl" />
        <div className="flex flex-col items-center gap-2"><Sk className="h-2.5 w-16" /><Sk className="h-5 w-32" /></div>
        <div className="w-10" />
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2"><Sk className="w-3.5 h-3.5" /><Sk className="h-3 w-24" /></div>
        <Sk className="w-5 h-5" />
      </div>
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="glass-card p-4 flex items-center gap-3">
            <Sk className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Sk className="h-3.5" style={{ width: `${[70,55,80,60,75,50][i]}%` }} />
              <Sk className="h-2.5 w-28" />
            </div>
            <Sk className="w-5 h-5 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MaterialsPageSkeleton() {
  return (
    <div className="p-5 pt-6 max-w-md mx-auto pb-24">
      <div className="flex items-center justify-between mb-5">
        <Sk className="w-10 h-10 rounded-xl" />
        <div className="flex flex-col items-center gap-2"><Sk className="h-2.5 w-20" /><Sk className="h-4 w-36" /></div>
        <div className="w-10" />
      </div>
      <div className="glass-card p-2 mb-4 rounded-full">
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`flex-1 h-9 rounded-full animate-pulse ${i === 0 ? 'bg-[#FFD700]/20' : 'bg-white/5'}`} />
          ))}
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        <Sk className="flex-1 h-11 rounded-xl" /><Sk className="w-12 h-12 rounded-xl" />
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="glass-card p-4 flex items-start gap-3">
            <Sk className="w-10 h-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Sk className="h-3.5" style={{ width: `${[70,55,80,60,75][i]}%` }} />
              <Sk className="h-3" style={{ width: `${[45,40,50,42,48][i]}%` }} />
              <Sk className="h-2.5 w-24" />
            </div>
            <Sk className="w-9 h-9 rounded-full flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfilePageSkeleton() {
  return (
    <div className="pt-4 min-h-screen bg-black">
      {/* Cover banner */}
      <Sk className="h-24 w-full rounded-none" style={{ borderRadius: 0 }} />
      <div className="px-5 pb-8 max-w-md mx-auto">
        {/* Avatar + bell row */}
        <div className="flex items-end justify-between -mt-12 mb-6">
          <Sk className="w-24 h-24 rounded-full border-4 border-black flex-shrink-0" />
          <Sk className="w-7 h-7 rounded-full mb-2" />
        </div>
        {/* Name + email */}
        <Sk className="h-6 w-40 mb-2" />
        <Sk className="h-3 w-56 mb-4" />
        {/* Action buttons */}
        <div className="flex gap-2 mb-6">
          <Sk className="flex-1 h-10 rounded-xl" />
          <Sk className="flex-1 h-10 rounded-xl" />
        </div>
        {/* Stats row */}
        <div className="glass-card p-4 mb-4">
          <div className="flex justify-around">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <Sk className="h-6 w-10" />
                <Sk className="h-2.5 w-16" />
              </div>
            ))}
          </div>
        </div>
        {/* Upload cards */}
        <Sk className="h-3 w-28 mb-3" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card p-4 flex items-start gap-3">
              <Sk className="w-10 h-10 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Sk className="h-3.5" style={{ width: `${[65,75,55][i]}%` }} />
                <Sk className="h-2.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UploadPageSkeleton() {
  return (
    <div className="p-5 pt-8 max-w-md mx-auto pb-24">
      <div className="text-center mb-6">
        <Sk className="h-6 w-28 mx-auto mb-1" />
        <Sk className="h-3 w-52 mx-auto" />
      </div>
      <div className="glass-card p-4 space-y-4">
        {/* User identity banner */}
        <div className="glass-card p-3 flex items-center gap-3 bg-white/5">
          <Sk className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Sk className="h-3.5 w-32" />
            <Sk className="h-2.5 w-44" />
          </div>
          <Sk className="w-16 h-5 rounded-full flex-shrink-0" />
        </div>
        {/* Title field */}
        <Sk className="h-2.5 w-12 mb-1" />
        <Sk className="h-11 w-full rounded-xl" />
        {/* Sem + Type row */}
        <div className="grid grid-cols-2 gap-3">
          <div><Sk className="h-2.5 w-16 mb-2" /><Sk className="h-11 rounded-xl" /></div>
          <div><Sk className="h-2.5 w-10 mb-2" /><Sk className="h-11 rounded-xl" /></div>
        </div>
        {/* Subject */}
        <Sk className="h-2.5 w-14 mb-2" />
        <Sk className="h-11 w-full rounded-xl" />
        {/* Drop zone */}
        <Sk className="h-28 w-full rounded-xl" style={{ borderRadius: '12px' }} />
        {/* Submit button */}
        <Sk className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

function AdminPageSkeleton() {
  return (
    <div className="p-5 pt-8 max-w-2xl mx-auto pb-24">
      <div className="text-center mb-6">
        <Sk className="h-6 w-24 mx-auto mb-2" />
        <Sk className="h-3 w-48 mx-auto" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card p-4">
            <Sk className="h-7 w-12 mb-1" />
            <Sk className="h-3 w-20" />
          </div>
        ))}
      </div>
      {/* Tab bar */}
      <div className="flex gap-2 mb-4">
        {[...Array(3)].map((_, i) => (
          <Sk key={i} className={`flex-1 h-9 rounded-full ${i === 0 ? 'opacity-60' : 'opacity-30'}`} />
        ))}
      </div>
      {/* Pending cards */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card p-4 flex items-start gap-3">
            <Sk className="w-10 h-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Sk className="h-3.5" style={{ width: `${[70,55,80,60][i]}%` }} />
              <Sk className="h-2.5 w-1/2" />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Sk className="w-8 h-8 rounded-lg" />
              <Sk className="w-8 h-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Route-aware global skeleton.
// Uses useLocation (HashRouter compatible location.pathname) to pick the right page skeleton,
// so the AppContext loading phase and page-level loading phase are visually identical.
function AppSkeleton() {
  const location = useLocation();
  const path = location.pathname;
  const parts = path.split('/').filter(Boolean);

  let PageSkeleton = HomePageSkeleton;
  if (path === '/library') {
    PageSkeleton = LibraryPageSkeleton;
  } else if (path === '/profile') {
    PageSkeleton = ProfilePageSkeleton;
  } else if (path === '/upload' || path === '/admin-upload') {
    PageSkeleton = UploadPageSkeleton;
  } else if (path.startsWith('/admin')) {
    PageSkeleton = AdminPageSkeleton;
  } else if (parts[0] === 'semester' && parts.length >= 3) {
    PageSkeleton = MaterialsPageSkeleton;
  } else if (parts[0] === 'semester') {
    PageSkeleton = SubjectsPageSkeleton;
  }

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen">
      <PageSkeleton />
      <NavbarSkeleton />
    </div>
  );
}

// Route transition fallback (keeps navbar mounted, only renders the page skeleton)
function RouteSuspenseFallback() {
  const location = useLocation();
  const path = location.pathname;
  const parts = path.split('/').filter(Boolean);

  let PageSkeleton = HomePageSkeleton;
  if (path === '/library') {
    PageSkeleton = LibraryPageSkeleton;
  } else if (path === '/profile') {
    PageSkeleton = ProfilePageSkeleton;
  } else if (path === '/upload' || path === '/admin-upload') {
    PageSkeleton = UploadPageSkeleton;
  } else if (path.startsWith('/admin')) {
    PageSkeleton = AdminPageSkeleton;
  } else if (parts[0] === 'semester' && parts.length >= 3) {
    PageSkeleton = MaterialsPageSkeleton;
  } else if (parts[0] === 'semester') {
    PageSkeleton = SubjectsPageSkeleton;
  }

  return <PageSkeleton />;
}

function App() {
  const { user, loading, isBanned, siteZoom } = useApp();
  const location = useLocation(); // Use React Router's reactive location

  // Reactively check if the user is on a public page
  const isPublicRoute = location.pathname === '/privacy' || location.pathname === '/terms';

  // Apply Site Zoom globally with Smooth Transition
  useEffect(() => {
    document.documentElement.style.transition = 'zoom 0.3s ease-in-out';
    document.documentElement.style.zoom = `${siteZoom / 100}`;
  }, [siteZoom]);

  // Scroll to top synchronously before paint to prevent visible flash / layout shift jump
  useLayoutEffect(() => {
    console.log("[Scroll Restoration] Route change triggered:", location.pathname);
    console.log("[Scroll Restoration] scrollRestoration setting is:", window.history.scrollRestoration);
    console.log("[Scroll Restoration] window.scrollY before reset:", window.scrollY);
    
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    console.log("[Scroll Restoration] window.scrollY after instant reset:", window.scrollY);
    
    // Safety net: scroll again after a short delay once Suspense chunk/Firestore data resolves
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      console.log("[Scroll Restoration] window.scrollY after 100ms safety-net reset:", window.scrollY);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Track daily visitor
  useEffect(() => {
    const trackDailyVisitor = async () => {
      try {
        const today = new Date().toLocaleDateString('en-CA'); 
        const lastVisit = localStorage.getItem('lastVisitDate');
        
        if (lastVisit !== today) {
          localStorage.setItem('lastVisitDate', today);
          const statRef = doc(db, 'analytics', today);
          
          // Data prepare karein
          const updateData = { visitors: increment(1) };
          
          // Agar user logged in hai, toh uski details array mein push karein
          if (user) {
            updateData.visitorDetails = arrayUnion({
              name: user.displayName || user.name || "Unknown User",
              email: user.email || "Unknown Email",
              time: new Date().toISOString()
            });
          }

          await setDoc(statRef, updateData, { merge: true });
        }
      } catch (error) {
        console.error("Analytics error:", error);
      }
    };
    
    // Sirf tabhi track karein jab user state load ho chuki ho
    if (!loading) {
      trackDailyVisitor();
    }
  }, [user, loading]);

  // Loading state
  if (loading) {
    return <AppSkeleton />;
  }

  // Show banned page if user is banned
  if (user && isBanned) {
    return (
      <Suspense fallback={<AppSkeleton />}>
        <BannedPage />
      </Suspense>
    );
  }

  // Not logged in (and not trying to view a public policy page)
  if (!user && !isPublicRoute) {
    return (
      <Suspense fallback={<AppSkeleton />}>
        <Login />
      </Suspense>
    );
  }

  // Logged in - return the router with all routes
  return (
    <>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={
          {
            style: {
              borderRadius: '8px',
              background: '#333',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#FACC15', // Yellow-400
                secondary: 'black',
              },
            },
          }
        }
      />
      <main className="bg-[#0a0a0a] text-white pb-24 relative min-h-screen">
        <Suspense fallback={<RouteSuspenseFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/semester/:semId" element={<Subjects />} />
            <Route path="/semester/:semId/:subjectId" element={<Materials />} />
            <Route path="/library" element={<Library />} />
            <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
            <Route path="/admin-upload" element={<ProtectedRoute requiredRole="admin"><AdminUpload /></ProtectedRoute>} />
            <Route path="/admin/analytics/visitors" element={<ProtectedRoute requiredRole="admin"><TodayVisitorsPage /></ProtectedRoute>} />
            <Route path="/admin/:activeTab" element={<ProtectedRoute requiredRole="admin"><Admin /></ProtectedRoute>} />
            <Route path="/admin" element={<Navigate to="/admin/analytics" replace />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>

        <Navbar />
        <GlobalUploadBlob />
        
        {/* Floating AI Assistant Button */}
        <FloatingAIButton />
      </main>
    </>
  );
}

function FloatingAIButton() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  
  // Define allowed paths
  const showAiButton = ['/', '/library', '/profile'].includes(location.pathname);
  
  const toggleModal = () => {
    setIsOpen(!isOpen);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  const handleChatGPTClick = () => {
    window.open("https://chatgpt.com/g/g-698c4ec0c6d4819190659b4dff84141e-b-n-n-assignment-bot-pro", "_blank", "noopener,noreferrer");
    closeModal();
  };

  const handleGeminiClick = () => {
    window.open("https://gemini.google.com/gem/7fafd606ec16", "_blank");
    closeModal();
  };

  return (
    <>
      {showAiButton && (
        <>
          {/* Floating Button (Now with mobile-only float animation) */}
          <button
            onClick={toggleModal}
            className="fixed bottom-24 right-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-full shadow-lg z-50 hover:scale-105 transition-transform duration-200 flex items-center gap-2 mobile-float-btn"
            aria-label="Open Assignment AI assistant"
          >
            <BrainCircuitIcon size={20} />
            <span className="hidden sm:inline font-medium text-sm">Assignment AI</span>
          </button>

          {/* Modal Backdrop */}
          {isOpen && (
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300"
              onClick={closeModal}
            >
              {/* Decorative Glow Blob */}
              <div className="absolute w-64 h-64 bg-gradient-to-r from-purple-600/30 to-blue-600/30 rounded-full blur-3xl -top-10 -right-10"></div>
              <div className="absolute w-56 h-56 bg-gradient-to-r from-emerald-600/30 to-cyan-600/30 rounded-full blur-3xl -bottom-10 -left-10"></div>
              
              {/* Modal Box */}
              <div 
                className="w-full max-w-sm bg-[#09090b] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-white tracking-wide">AI Assignment Writer</h2>
                  <button
                    onClick={closeModal}
                    className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                    aria-label="Close AI assistant modal"
                  >
                    <X size={16} className="text-white" />
                  </button>
                </div>

                {/* Content - Compact Horizontal Layout */}
                <div className="p-5 space-y-3">
                  {/* Card 1: ChatGPT Bot */}
                  <div
                    onClick={handleChatGPTClick}
                    className="flex items-center gap-4 p-4 rounded-xl border border-emerald-500/20 hover:border-emerald-400 bg-gradient-to-r from-emerald-900/40 to-zinc-900/60 hover:bg-emerald-900/50 transition-all duration-300 group cursor-pointer"
                  >
                    <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" className="w-7 h-7" fill="currentColor">
                        <style>
                          {`
                            .spin {
                              transform-origin: 160px 160px;
                              animation: rotate 4s linear infinite;
                            }
                            @keyframes rotate {
                              100% {
                                transform: rotate(360deg);
                              }
                            }
                          `}
                        </style>
                        <path className="spin" d="m297.06 130.97c7.26-21.79 4.76-45.66-6.85-65.48-17.46-30.4-52.56-46.04-86.84-38.68-15.25-17.18-37.16-26.95-60.13-26.81-35.04-.08-66.13 22.48-76.91 55.82-22.51 4.61-41.94 18.7-53.31 38.67-17.59 30.32-13.58 68.54 9.92 94.54-7.26 21.79-4.76 45.66 6.85 65.48 17.46 30.4 52.56 46.04 86.84 38.68 15.24 17.18 37.16 26.95 60.13 26.8 35.06.09 66.16-22.49 76.94-55.86 22.51-4.61 41.94-18.7 53.31-38.67 17.57-30.32 13.55-68.51-9.94-94.51zm-120.28 168.11c-14.03.02-27.62-4.89-38.39-13.88.49-.26 1.34-.73 1.89-1.07l63.72-36.8c3.26-1.85 5.26-5.32 5.24-9.07v-89.83l26.93 15.55c.29.14.48.42.52.74v74.39c-.04 33.08-26.83 59.9-59.91 59.97zm-128.84-55.03c-7.03-12.14-9.56-26.37-7.15-40.18.47.28 1.3.79 1.89 1.13l63.72 36.8c3.23 1.89 7.23 1.89 10.47 0l77.79-44.92v31.1c.02.32-.13.63-.38.83l-64.41 37.19c-28.69 16.52-65.33 6.7-81.92-21.95zm-16.77-139.09c7-12.16 18.05-21.46 31.21-26.29 0 .55-.03 1.52-.03 2.2v73.61c-.02 3.74 1.98 7.21 5.23 9.06l77.79 44.91-26.93 15.55c-.27.18-.61.21-.91.08l-64.42-37.22c-28.63-16.58-38.45-53.21-21.95-81.89zm221.26 51.49-77.79-44.92 26.93-15.54c.27-.18.61-.21.91-.08l64.42 37.19c28.68 16.57 38.51 53.26 21.94 81.94-7.01 12.14-18.05 21.44-31.2 26.28v-75.81c.03-3.74-1.96-7.2-5.2-9.06zm26.8-40.34c-.47-.29-1.3-.79-1.89-1.13l-63.72-36.8c-3.23-1.89-7.23-1.89-10.47 0l-77.79 44.92v-31.1c-.02-.32.13-.63.38-.83l64.41-37.16c28.69-16.55 65.37-6.7 81.91 22 6.99 12.12 9.52 26.31 7.15 40.1zm-168.51 55.43-26.94-15.55c-.29-.14-.48-.42-.52-.74v-74.39c.02-33.12 26.89-59.96 60.01-59.94 14.01 0 27.57 4.92 38.34 13.88-.49.26-1.33.73-1.89 1.07l-63.72 36.8c-3.26 1.85-5.26 5.31-5.24 9.06l-.04 89.79zm14.63-31.54 34.65-20.01 34.65 20v40.01l-34.65 20-34.65-20z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">ChatGPT Edition</h3>
                      <p className="text-xs text-emerald-200/70">Logical & Precise.</p>
                    </div>
                  </div>

                  {/* Card 2: Gemini Bot */}
                  <div
                    onClick={handleGeminiClick}
                    className="flex items-center gap-4 p-4 rounded-xl border border-blue-500/20 hover:border-blue-400 bg-gradient-to-r from-blue-900/40 to-purple-900/40 hover:bg-blue-900/50 transition-all duration-300 group cursor-pointer"
                  >
                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 flex-shrink-0">
                      
                      {/* 🌟 Naya animated Gemini SVG 🌟 */}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-7 h-7" style={{ flex: "none", lineHeight: 1 }}>
                        <style>
                          {`
                            .spin-gemini {
                              transform-origin: 12px 12px;
                              animation: rotate-gemini 8s linear infinite;
                            }
                            @keyframes rotate-gemini {
                              100% {
                                transform: rotate(360deg);
                              }
                            }
                          `}
                        </style>
                        <g className="spin-gemini">
                          <path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="#3186FF"/>
                          <path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="url(#lobe-icons-gemini-0-_R_0_)"/>
                          <path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="url(#lobe-icons-gemini-1-_R_0_)"/>
                          <path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" fill="url(#lobe-icons-gemini-2-_R_0_)"/>
                        </g>
                        <defs>
                          <linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-gemini-0-_R_0_" x1="7" x2="11" y1="15.5" y2="12">
                            <stop stopColor="#08B962"/>
                            <stop offset="1" stopColor="#08B962" stopOpacity="0"/>
                          </linearGradient>
                          <linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-gemini-1-_R_0_" x1="8" x2="11.5" y1="5.5" y2="11">
                            <stop stopColor="#F94543"/>
                            <stop offset="1" stopColor="#F94543" stopOpacity="0"/>
                          </linearGradient>
                          <linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-gemini-2-_R_0_" x1="3.5" x2="17.5" y1="13.5" y2="12">
                            <stop stopColor="#FABC12"/>
                            <stop offset=".46" stopColor="#FABC12" stopOpacity="0"/>
                          </linearGradient>
                        </defs>
                      </svg>

                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Gemini Edition</h3>
                      <p className="text-xs text-blue-200/70">Creative & Fast.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function GlobalUploadBlob() {
  const { globalUploadState } = useApp();
  const { uploading, current, total, realProgress } = globalUploadState;

  const [pos, setPos] = useState({ x: window.innerWidth / 2 - 90, y: window.innerHeight - 120 });
  const [isDragging, setIsDragging] = useState(false);
  const [isShrunk, setIsShrunk] = useState(false);
  const dragRef = useRef(null);
  const blobRef = useRef(null);

  if (!uploading) return null;

  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y, isClick: true };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragRef.current.isClick = false;
      if (!isShrunk) setIsShrunk(true);
    }
    requestAnimationFrame(() => {
      if (blobRef.current) {
        blobRef.current.style.left = `${dragRef.current.startPosX + dx}px`;
        blobRef.current.style.top = `${dragRef.current.startPosY + dy}px`;
      }
    });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    if (dragRef.current && dragRef.current.isClick) setIsShrunk(prev => !prev);
    if (blobRef.current) {
      setPos({
        x: parseFloat(blobRef.current.style.left) || pos.x,
        y: parseFloat(blobRef.current.style.top) || pos.y
      });
    }
    if (dragRef.current) e.target.releasePointerCapture(e.pointerId);
  };

  const radius = 16;
  const strokeDashoffset = (2 * Math.PI * radius) - (realProgress / 100) * (2 * Math.PI * radius);

  return (
    <div
      ref={blobRef}
      style={{ left: `${pos.x}px`, top: `${pos.y}px`, touchAction: 'none', willChange: 'left, top, transform' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`fixed z-[99999] flex items-center glass-card bg-black/90 border border-[#FFD700]/30 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] ${isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab scale-100'} ${isShrunk ? 'p-2' : 'p-3 pr-5'} transition-[transform,padding] duration-300 ease-out animate-in zoom-in slide-in-from-bottom-10`}
    >
      <div className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center pointer-events-none">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="20" cy="20" r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" className="text-white/10" />
          <circle cx="20" cy="20" r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray={2 * Math.PI * radius} strokeDashoffset={strokeDashoffset} className="text-[#FFD700] transition-all duration-75 ease-linear" />
        </svg>
        <span className={`absolute font-bold text-[#FFD700] transition-all duration-300 ${isShrunk ? 'text-xs' : 'text-[10px]'}`}>{current}/{total}</span>
      </div>
      <div className={`select-none pointer-events-none overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap flex flex-col justify-center ${isShrunk ? 'max-w-0 opacity-0 ml-0' : 'max-w-[120px] opacity-100 ml-3'}`}>
        <p className="text-xs font-bold text-white">Uploading: {Math.round(realProgress)}%</p>
        <p className="text-[9px] text-red-400 font-medium tracking-wide">Please don't close site</p>
      </div>
    </div>
  );
}

export default App;