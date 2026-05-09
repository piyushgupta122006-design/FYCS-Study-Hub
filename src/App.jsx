import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect, useState, lazy, Suspense } from "react";
import { doc, getDoc, setDoc, increment } from "firebase/firestore";
import { db } from "./firebase";
import { Sparkles, Bot, X, Loader2 } from "lucide-react";

import { useApp } from "./context/AppContext";
import { DataProvider } from "./context/DataContext";
import LoadingSpinner from "./components/LoadingSpinner";

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
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const Navbar = lazy(() => import('./components/Navbar'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));


// Global App Skeleton Component
function AppSkeleton() {
  return (
    <div className="h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Navbar Skeleton */}
      <div className="h-16 w-full bg-zinc-950 border-b border-zinc-800 flex items-center px-4 space-x-4">
        <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse"></div>
        <div className="h-4 bg-zinc-800 rounded w-24 animate-pulse"></div>
        <div className="flex-1"></div>
        <div className="h-6 w-6 bg-zinc-800 rounded-full animate-pulse"></div>
      </div>
      
      {/* Main Content Area */}
      <div className="p-5 pt-6 max-w-md mx-auto">
        {/* Hero Section Skeleton */}
        <div className="h-48 w-full bg-zinc-900/50 rounded-3xl animate-pulse mb-6"></div>
        
        {/* Quick Section Title Skeleton */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 bg-zinc-800 rounded animate-pulse"></div>
          <div className="h-3 bg-zinc-800 rounded w-24 animate-pulse"></div>
        </div>
        
        {/* Grid Skeleton */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-zinc-900/30 rounded-xl animate-pulse"></div>
          ))}
        </div>
        
        {/* Materials Section Skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-zinc-800 rounded animate-pulse"></div>
            <div className="h-3 bg-zinc-800 rounded w-20 animate-pulse"></div>
          </div>
          <div className="h-4 bg-zinc-800 rounded w-16 animate-pulse"></div>
        </div>
        
        {/* Materials List Skeleton */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-zinc-900/20 border border-zinc-800/50 rounded-2xl p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-zinc-800 rounded-lg flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-zinc-800 rounded w-1/2 mb-1"></div>
                  <div className="h-3 bg-zinc-800 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  const { user, loading, siteZoom } = useApp();
  const location = useLocation(); // Use React Router's reactive location
  const [isUserBanned, setIsUserBanned] = useState(false);
  const [userDataLoading, setUserDataLoading] = useState(true);

  // Reactively check if the user is on a public page
  const isPublicRoute = location.pathname === '/privacy' || location.pathname === '/terms';

  // No background prefetching needed - React.lazy handles code splitting automatically

  // Apply Site Zoom globally with Smooth Transition
  useEffect(() => {
    // Smooth animation ke liye CSS transition add kiya
    document.documentElement.style.transition = 'zoom 0.3s ease-in-out';
    document.documentElement.style.zoom = `${siteZoom / 100}`;
  }, [siteZoom]);

  // Check if user is banned
  useEffect(() => {
    if (!user?.uid) {
      setUserDataLoading(false);
      setIsUserBanned(false);
      return;
    }
    
    const checkBanStatus = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setIsUserBanned(userData.isBanned || false);
        } else {
          setIsUserBanned(false);
        }
      } catch (error) {
        console.error("Error checking ban status:", error);
        setIsUserBanned(false);
      } finally {
        setUserDataLoading(false);
      }
    };
    
    checkBanStatus();
  }, [user?.uid]);

  // Track daily visitor
  useEffect(() => {
    const trackDailyVisitor = async () => {
      try {
        const today = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD' format based on local time
        const lastVisit = localStorage.getItem('lastVisitDate');
        
        if (lastVisit !== today) {
          localStorage.setItem('lastVisitDate', today);
          const statRef = doc(db, 'analytics', today);
          await setDoc(statRef, { visitors: increment(1) }, { merge: true });
        }
      } catch (error) {
        console.error("Analytics error:", error);
      }
    };
    trackDailyVisitor();
  }, []);

  // Loading state
  if (loading || userDataLoading) {
    return <AppSkeleton />;
  }

  // Show banned page if user is banned
  if (user && isUserBanned) {
    return (
      <Suspense fallback={<LoadingSpinner />}
      >
        <BannedPage />
      </Suspense>
    );
  }

  // Not logged in (and not trying to view a public policy page)
  if (!user && !isPublicRoute) {
    return (
      <Suspense fallback={<LoadingSpinner />}
      >
        <Login />
      </Suspense>
    );
  }

  // Logged in - return the router with all routes
  return (
    <DataProvider>
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
      <Suspense fallback={<LoadingSpinner />}>
        <main className="bg-[#0a0a0a] text-white pb-24 relative">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/semester/:semId" element={<Subjects />} />
            <Route path="/semester/:semId/:subjectId" element={<Materials />} />
            <Route path="/library" element={<Library />} />
            <Route path="/upload" element={<ProtectedRoute requiredRole="admin"><Upload /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Admin /></ProtectedRoute>} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <Navbar />
          
          {/* Floating AI Assistant Button */}
          <FloatingAIButton />
        </main>
      </Suspense>
    </DataProvider>
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
          {/* Floating Button */}
          <button
            onClick={toggleModal}
            className="fixed bottom-24 right-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-full shadow-lg z-50 hover:scale-105 transition-transform duration-200 flex items-center gap-2"
            aria-label="Open Assignment AI assistant"
          >
            <Sparkles size={20} />
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

export default App;