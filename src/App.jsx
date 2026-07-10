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
              <Sk className="h-3.5" style={{ width: `${[70, 55, 80, 60, 75][i]}%` }} />
              <Sk className="h-3" style={{ width: `${[45, 40, 50, 42, 48][i]}%` }} />
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
              <Sk className="h-3.5" style={{ width: `${[70, 55, 80, 60, 75, 50][i]}%` }} />
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
              <Sk className="h-3.5" style={{ width: `${[70, 55, 80, 60, 75][i]}%` }} />
              <Sk className="h-3" style={{ width: `${[45, 40, 50, 42, 48][i]}%` }} />
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
                <Sk className="h-3.5" style={{ width: `${[65, 75, 55][i]}%` }} />
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
              <Sk className="h-3.5" style={{ width: `${[70, 55, 80, 60][i]}%` }} />
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
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // Safety net: scroll again after a short delay once Suspense chunk/Firestore data resolves
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
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
  const showAiButton = ['/', '/library', '/profile'].includes(location.pathname);

  if (!showAiButton) return null;

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
      <style>
        {`
          .ai-option-btn {
            --black-700: hsla(0 0% 12% / 1);
            --border_radius: 20px;
            --transtion: 0.3s ease-in-out;
            --offset: 2px;
            cursor: pointer;
            position: relative;
            display: flex;
            align-items: center;
            gap: 1.25rem;
            width: 100%;
            transform-origin: center;
            padding: 1.25rem 1.5rem;
            background-color: transparent;
            border: none;
            border-radius: var(--border_radius);
            transform: scale(calc(1 + (var(--active, 0) * 0.05)));
            transition: transform var(--transtion);
          }
          .ai-option-btn::before {
            content: "";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            background-color: var(--black-700);
            border-radius: var(--border_radius);
            box-shadow: inset 0 0.5px hsl(0, 0%, 100%), inset 0 -1px 2px 0 hsl(0, 0%, 0%),
              0px 4px 10px -4px hsla(0 0% 0% / calc(1 - var(--active, 0))),
              0 0 0 calc(var(--active, 0) * 0.375rem) hsl(260 97% 50% / 0.75);
            transition: all var(--transtion);
            z-index: 0;
          }
          .ai-option-btn::after {
            content: "";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            background-color: hsla(260 97% 61% / 0.75);
            background-image: radial-gradient(
                at 51% 89%,
                hsla(266, 45%, 74%, 1) 0px,
                transparent 50%
              ),
              radial-gradient(at 100% 100%, hsla(266, 36%, 60%, 1) 0px, transparent 50%),
              radial-gradient(at 22% 91%, hsla(266, 36%, 60%, 1) 0px, transparent 50%);
            background-position: top;
            opacity: var(--active, 0);
            border-radius: var(--border_radius);
            transition: opacity var(--transtion);
            z-index: 2;
          }
          .ai-option-btn:is(:hover, :focus-visible) {
            --active: 1;
          }
          .ai-option-btn:active {
            transform: scale(1);
          }
          .ai-option-btn .ai-btn-dots-border {
            --size_border: calc(100% + 2px);
            overflow: hidden;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: var(--size_border);
            height: var(--size_border);
            background-color: transparent;
            border-radius: var(--border_radius);
            z-index: -10;
          }
          .ai-option-btn .ai-btn-dots-border::before {
            content: "";
            position: absolute;
            top: 30%;
            left: 50%;
            transform: translate(-50%, -50%);
            transform-origin: left;
            transform: rotate(0deg);
            width: 100%;
            height: 2.5rem;
            background-color: white;
            mask: linear-gradient(transparent 0%, white 120%);
            -webkit-mask: linear-gradient(transparent 0%, white 120%);
            animation: rotate-dots-border 2s linear infinite;
          }
          @keyframes rotate-dots-border {
            to {
              transform: rotate(360deg);
            }
          }
          .ai-option-btn > * {
            position: relative;
            z-index: 10;
          }
          .ai-option-btn .ai-btn-sparkle {
            position: relative;
            z-index: 10;
            width: 1.75rem;
          }
          .ai-option-btn .ai-btn-sparkle .path {
            fill: currentColor;
            stroke: currentColor;
            transform-origin: center;
            color: hsl(0, 0%, 100%);
          }
          .ai-option-btn:is(:hover, :focus) .ai-btn-sparkle .path {
            animation: path-sparkle 1.5s linear 0.5s infinite;
          }
          .ai-option-btn .ai-btn-sparkle .path:nth-child(1) {
            --scale_path_1: 1.2;
          }
          .ai-option-btn .ai-btn-sparkle .path:nth-child(2) {
            --scale_path_2: 1.2;
          }
          .ai-option-btn .ai-btn-sparkle .path:nth-child(3) {
            --scale_path_3: 1.2;
          }
          @keyframes path-sparkle {
            0%, 34%, 71%, 100% {
              transform: scale(1);
            }
            17% {
              transform: scale(var(--scale_path_1, 1));
            }
            49% {
              transform: scale(var(--scale_path_2, 1));
            }
            83% {
              transform: scale(var(--scale_path_3, 1));
            }
          }
          .ai-option-btn .ai-btn-text {
            position: relative;
            z-index: 10;
            background-image: linear-gradient(
              90deg,
              hsla(0 0% 100% / 1) 0%,
              hsla(0 0% 100% / var(--active, 0)) 120%
            );
            background-clip: text;
            -webkit-background-clip: text;
            color: #ffffff17;
          }
        `}
      </style>

      {/* ✨ NAYA SHINY CURVY BUTTON (Desktop par Pill-shape, Mobile par Circular) */}
      <div className="fixed bottom-24 right-6 z-50 group mobile-float-btn rounded-full">
        {/* Glow Layer */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 group-hover:blur-[15px] active:blur-[5px] transition-all duration-300"
          style={{
            background: 'conic-gradient(#00000000 80deg, #40baf7, #f34ad7, #5bfcc4, #00000000 280deg)'
          }}
        />

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative flex items-center justify-center gap-2 w-14 h-14 sm:w-auto sm:h-auto sm:px-5 sm:py-3 text-white rounded-full border-none cursor-pointer transition-all duration-300 active:translate-y-[3px] overflow-hidden"
          style={{
            background: 'linear-gradient(90deg, #5bfcc4, #f593e4, #71a4f0)',
            boxShadow: 'inset 0px 0px 5px rgba(255,255,255,0.66), inset 0px 35px 30px #000, 0px 5px 10px rgba(0,0,0,0.8)',
            textShadow: '1px 1px 1px #000'
          }}
        >
          <svg viewBox="0 0 24 24" height={24} width={24} xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 text-white">
            <g fill="none">
              <path d="m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z" />
              <path d="M9.107 5.448c.598-1.75 3.016-1.803 3.725-.159l.06.16l.807 2.36a4 4 0 0 0 2.276 2.411l.217.081l2.36.806c1.75.598 1.803 3.016.16 3.725l-.16.06l-2.36.807a4 4 0 0 0-2.412 2.276l-.081.216l-.806 2.361c-.598 1.75-3.016 1.803-3.724.16l-.062-.16l-.806-2.36a4 4 0 0 0-2.276-2.412l-.216-.081l-2.36-.806c-1.751-.598-1.804-3.016-.16-3.724l.16-.062l2.36-.806A4 4 0 0 0 8.22 8.025l.081-.216zM11 6.094l-.806 2.36a6 6 0 0 1-3.49 3.649l-.25.091l-2.36.806l2.36.806a6 6 0 0 1 3.649 3.49l.091.25l.806 2.36l.806-2.36a6 6 0 0 1 3.49-3.649l.25-.09l2.36-.807l-2.36-.806a6 6 0 0 1-3.649-3.49l-.09-.25zM19 2a1 1 0 0 1 .898.56l.048.117l.35 1.026l1.027.35a1 1 0 0 1 .118 1.845l-.118.048l-1.026.35l-.35 1.027a1 1 0 0 1-1.845.117l-.048-.117l-.35-1.026l-1.027-.35a1 1 0 0 1-.118-1.845l.118-.048l1.026-.35l.35-1.027A1 1 0 0 1 19 2" fill="currentColor" />
            </g>
          </svg>
          <span className="hidden sm:inline font-bold text-sm tracking-wide text-white">Assignment AI</span>
        </button>
      </div>

      {/* 🔒 PURANA WALA ANDAR KA POPUP EKDUM SAME */}
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
              <button
                onClick={handleChatGPTClick}
                className="ai-option-btn"
              >
                <div className="ai-btn-dots-border" />
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="ai-btn-sparkle">
                  <path className="path" strokeLinejoin="round" strokeLinecap="round" stroke="black" fill="black" d="M14.187 8.096L15 5.25L15.813 8.096C16.0231 8.83114 16.4171 9.50062 16.9577 10.0413C17.4984 10.5819 18.1679 10.9759 18.903 11.186L21.75 12L18.904 12.813C18.1689 13.0231 17.4994 13.4171 16.9587 13.9577C16.4181 14.4984 16.0241 15.1679 15.814 15.903L15 18.75L14.187 15.904C13.9769 15.1689 13.5829 14.4994 13.0423 13.9587C12.5016 13.4181 11.8321 13.0241 11.097 12.814L8.25 12L11.096 11.187C11.8311 10.9769 12.5006 10.5829 13.0423 10.0423C13.5819 9.50162 13.9759 8.83214 14.186 8.097L14.187 8.096Z" />
                  <path className="path" strokeLinejoin="round" strokeLinecap="round" stroke="black" fill="black" d="M6 14.25L5.741 15.285C5.59267 15.8785 5.28579 16.4206 4.85319 16.8532C4.42059 17.2858 3.87853 17.5927 3.285 17.741L2.25 18L3.285 18.259C3.87853 18.4073 4.42059 18.7142 4.85319 19.1468C5.28579 19.5794 5.59267 20.1215 5.741 20.715L6 21.75L6.259 20.715C6.40725 20.1216 6.71398 19.5796 7.14639 19.147C7.5788 18.7144 8.12065 18.4075 8.714 18.259L9.75 18L8.714 17.741C8.12065 17.5925 7.5788 17.2856 7.14639 16.853C6.71398 16.4204 6.40725 15.8784 6.259 15.285L6 14.25Z" />
                  <path className="path" strokeLinejoin="round" strokeLinecap="round" stroke="black" fill="black" d="M6.5 4L6.303 4.5915C6.24777 4.75718 6.15472 4.90774 6.03123 5.03123C5.90774 5.15472 5.75718 5.24777 5.5915 5.303L5 5.5L5.5915 5.697C5.75718 5.75223 5.90774 5.84528 6.03123 5.96877C6.15472 6.09226 6.24777 6.24282 6.303 6.4085L6.5 7L6.697 6.4085C6.75223 6.24282 6.84528 6.09226 6.96877 5.96877C7.09226 5.84528 7.24282 5.75223 7.4085 5.697L8 5.5L7.4085 5.303C7.24282 5.24777 7.09226 5.15472 6.96877 5.03123C6.84528 4.90774 6.75223 4.75718 6.697 4.5915L6.5 4Z" />
                </svg>
                <div className="flex flex-col items-start text-left">
                  <span className="ai-btn-text text-sm font-bold tracking-wide">ChatGPT Edition</span>
                  <span className="text-xs text-emerald-200/70 mt-0.5">Logical & Precise.</span>
                </div>
              </button>

              {/* Card 2: Gemini Bot */}
              <button
                onClick={handleGeminiClick}
                className="ai-option-btn"
              >
                <div className="ai-btn-dots-border" />
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="ai-btn-sparkle">
                  <path className="path" strokeLinejoin="round" strokeLinecap="round" stroke="black" fill="black" d="M14.187 8.096L15 5.25L15.813 8.096C16.0231 8.83114 16.4171 9.50062 16.9577 10.0413C17.4984 10.5819 18.1679 10.9759 18.903 11.186L21.75 12L18.904 12.813C18.1689 13.0231 17.4994 13.4171 16.9587 13.9577C16.4181 14.4984 16.0241 15.1679 15.814 15.903L15 18.75L14.187 15.904C13.9769 15.1689 13.5829 14.4994 13.0423 13.9587C12.5016 13.4181 11.8321 13.0241 11.097 12.814L8.25 12L11.096 11.187C11.8311 10.9769 12.5006 10.5829 13.0423 10.0423C13.5819 9.50162 13.9759 8.83214 14.186 8.097L14.187 8.096Z" />
                  <path className="path" strokeLinejoin="round" strokeLinecap="round" stroke="black" fill="black" d="M6 14.25L5.741 15.285C5.59267 15.8785 5.28579 16.4206 4.85319 16.8532C4.42059 17.2858 3.87853 17.5927 3.285 17.741L2.25 18L3.285 18.259C3.87853 18.4073 4.42059 18.7142 4.85319 19.1468C5.28579 19.5794 5.59267 20.1215 5.741 20.715L6 21.75L6.259 20.715C6.40725 20.1216 6.71398 19.5796 7.14639 19.147C7.5788 18.7144 8.12065 18.4075 8.714 18.259L9.75 18L8.714 17.741C8.12065 17.5925 7.5788 17.2856 7.14639 16.853C6.71398 16.4204 6.40725 15.8784 6.259 15.285L6 14.25Z" />
                  <path className="path" strokeLinejoin="round" strokeLinecap="round" stroke="black" fill="black" d="M6.5 4L6.303 4.5915C6.24777 4.75718 6.15472 4.90774 6.03123 5.03123C5.90774 5.15472 5.75718 5.24777 5.5915 5.303L5 5.5L5.5915 5.697C5.75718 5.75223 5.90774 5.84528 6.03123 5.96877C6.15472 6.09226 6.24777 6.24282 6.303 6.4085L6.5 7L6.697 6.4085C6.75223 6.24282 6.84528 6.09226 6.96877 5.96877C7.09226 5.84528 7.24282 5.75223 7.4085 5.697L8 5.5L7.4085 5.303C7.24282 5.24777 7.09226 5.15472 6.96877 5.03123C6.84528 4.90774 6.75223 4.75718 6.697 4.5915L6.5 4Z" />
                </svg>
                <div className="flex flex-col items-start text-left">
                  <span className="ai-btn-text text-sm font-bold tracking-wide">Gemini Edition</span>
                  <span className="text-xs text-blue-200/70 mt-0.5">Creative & Fast.</span>
                </div>
              </button>
            </div>
          </div>
        </div>
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