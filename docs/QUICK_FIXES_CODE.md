# FYCS Study Hub - Quick Fixes (Copy-Paste Ready)

## FIX #1: Auth Bypass - Implement Auth-First Routing

**File:** `src/App.jsx` (Replace the entire App component)

```jsx
function App() {
  const { user, loading, isBanned, siteZoom } = useApp();
  const { isGlass } = useTheme();
  const location = useLocation();

  // 🛡️ FIX: Block ALL rendering until auth is confirmed
  if (loading) {
    return <AppSkeleton />;
  }

  const isPublicRoute = location.pathname === '/privacy' || location.pathname === '/terms';

  // ❌ NOT logged in → Show login (safe path, auth is known)
  if (!user && !isPublicRoute) {
    return (
      <Suspense fallback={<AppSkeleton />}>
        <Login />
      </Suspense>
    );
  }

  // ❌ Banned user → Show banned page
  if (user && isBanned) {
    return (
      <Suspense fallback={<AppSkeleton />}>
        <BannedPage />
      </Suspense>
    );
  }

  // ✅ ONLY render routes if:
  // - User IS logged in, OR
  // - User is NOT logged in AND viewing public route
  // At this point, auth state is 100% confirmed!

  return (
    <>
      <Toaster {...toasterConfig} />
      <main className="bg-app text-white pb-24 relative min-h-screen">
        <GlassBackdrop />
        <ThemeToggle />
        <Suspense fallback={<RouteSuspenseFallback />}>
          <Routes>
            {/* Public routes - anyone can access */}
            <Route path="/" element={<Home />} />
            <Route path="/library" element={<Library />} />
            <Route path="/semester/:semId" element={<Subjects />} />
            <Route path="/semester/:semId/:subjectId" element={<Materials />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />

            {/* Protected routes - only logged-in users */}
            {user && (
              <>
                <Route path="/profile" element={<Profile />} />
                <Route path="/upload" element={<Upload />} />
              </>
            )}

            {/* Admin routes - only admins */}
            {user && isAdmin && (
              <>
                <Route path="/admin-upload" element={<AdminUpload />} />
                <Route path="/admin/analytics/visitors" element={<TodayVisitorsPage />} />
                <Route path="/admin/:activeTab" element={<Admin />} />
                <Route path="/admin" element={<Navigate to="/admin/analytics" replace />} />
              </>
            )}

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>

        <Navbar />
        <GlobalUploadBlob />
        <FloatingAIButton />
      </main>
    </>
  );
}
```

---

## FIX #2: Firestore Security Rules

**File:** `firestore.rules` (Replace entire file)

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 🛡️ Helper function to get user role
    function getUserRole() {
      let userPath = /databases/$(database)/documents/users/$(request.auth.uid);
      return exists(userPath) ? get(userPath).data.role : 'student';
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // 📚 MATERIALS: Only authenticated users can read
    match /materials/{document} {
      allow read: if request.auth != null;
      
      allow create: if request.auth != null && 
        (request.resource.data.status == 'Pending' || getUserRole() == 'admin' || getUserRole() == 'superadmin');
      
      allow update: if request.auth != null && 
        (getUserRole() == 'admin' || 
         getUserRole() == 'superadmin' ||
         request.resource.data.diff(resource.data).affectedKeys().hasOnly(['views', 'viewedBy', 'downloads']));
        
      allow delete: if request.auth != null && getUserRole() == 'superadmin';
    }

    // 📖 SUBJECTS: Only authenticated users can read
    match /subjects/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (getUserRole() == 'admin' || getUserRole() == 'superadmin');
    }

    // 👤 USERS: Only read own data + admins can read all
    match /users/{userId} {
      allow read: if request.auth != null && 
        (isOwner(userId) || getUserRole() == 'admin' || getUserRole() == 'superadmin');
      
      allow create: if request.auth != null && isOwner(userId) &&
        request.resource.data.role == 'student' &&
        request.resource.data.isBanned == false;
      
      allow update: if request.auth != null && 
        (
          (isOwner(userId) && 
           request.resource.data.role == resource.data.role && 
           request.resource.data.isBanned == resource.data.isBanned) || 
          getUserRole() == 'admin' || 
          getUserRole() == 'superadmin'
        );
        
      allow delete: if request.auth != null && getUserRole() == 'superadmin';
    }

    // 🔔 NOTIFICATIONS: Only read own notifications
    match /notifications/{docId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      
      allow update: if request.auth != null && 
        (resource.data.userId == request.auth.uid && 
         request.resource.data.diff(resource.data).affectedKeys().hasOnly(['readBy', 'deletedBy']));
         
      allow create, delete: if request.auth != null && 
        (getUserRole() == 'admin' || getUserRole() == 'superadmin');
    }

    // 💬 FEEDBACKS: Only authenticated users can create, admins can read
    match /feedbacks/{docId} {
      allow create: if request.auth != null;
      allow read, update, delete: if request.auth != null && 
        (getUserRole() == 'admin' || getUserRole() == 'superadmin');
    }

    // 📊 ANALYTICS: Only admins can read
    match /analytics/{docId} {
      allow read: if request.auth != null && 
        (getUserRole() == 'admin' || getUserRole() == 'superadmin');
      allow write: if request.auth != null && 
        (getUserRole() == 'admin' || getUserRole() == 'superadmin');
    }

    // 🔒 DEFAULT FALLBACK: Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## FIX #3: Input Validation Module

**File:** `src/lib/validation.js` (Create new file)

```javascript
/**
 * Validate material form data
 * @param {Object} formData - Material data to validate
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validateMaterial = (formData) => {
  const errors = [];

  // Title validation
  if (!formData.title || formData.title.trim().length === 0) {
    errors.push("Title is required");
  } else if (formData.title.trim().length > 200) {
    errors.push("Title must be less than 200 characters");
  } else if (/<[^>]*>/g.test(formData.title)) {
    errors.push("HTML tags not allowed in title");
  }

  // Subject validation
  if (!formData.subjectId || formData.subjectId.trim().length === 0) {
    errors.push("Subject is required");
  }

  // Type validation
  const validTypes = ["Notes", "Practicals", "PYQ", "Assignment"];
  if (!validTypes.includes(formData.type)) {
    errors.push("Invalid material type");
  }

  // Semester validation
  if (!formData.semester) {
    errors.push("Semester is required");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validateFile = (file) => {
  const errors = [];
  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
  const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ];

  if (!file) {
    errors.push("File is required");
    return { isValid: false, errors };
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size must be less than 500MB (got ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
  }

  if (file.size === 0) {
    errors.push("File is empty");
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    errors.push(`File type not allowed. Allowed: PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP, RAR`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize filename
 * @param {string} filename - Original filename
 * @returns {string} Safe filename
 */
export const sanitizeFilename = (filename) => {
  return filename
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
```

---

## FIX #4: Add Rate Limiting

**File:** `src/lib/rateLimit.js` (Create new file)

```javascript
/**
 * Simple client-side rate limiter
 */
class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  /**
   * Check if action is allowed
   * @param {string} key - Unique key (user ID, IP, etc)
   * @returns {boolean} true if allowed
   */
  isAllowed(key) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = userAttempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false; // Rate limit exceeded
    }

    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }

  /**
   * Get remaining attempts
   * @param {string} key - Unique key
   * @returns {number} Remaining attempts
   */
  getRemaining(key) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];
    const recentAttempts = userAttempts.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxAttempts - recentAttempts.length);
  }

  /**
   * Reset limits for a key
   * @param {string} key - Unique key
   */
  reset(key) {
    this.attempts.delete(key);
  }

  /**
   * Reset all limits
   */
  resetAll() {
    this.attempts.clear();
  }
}

// Export instances for different operations
export const loginLimiter = new RateLimiter(5, 60000); // 5 attempts per minute
export const uploadLimiter = new RateLimiter(3, 60000); // 3 uploads per minute
export const adminLimiter = new RateLimiter(10, 60000); // 10 admin actions per minute
export const apiBulkLimiter = new RateLimiter(1, 10000); // 1 bulk operation per 10 seconds

export default RateLimiter;
```

---

## FIX #5: Add Email Verification

**File:** `src/context/AppContext.jsx` (Update the user creation section)

```javascript
// In the onAuthStateChanged callback, replace user creation code with:

if (!querySnapshot.empty) {
  // Duplicate found - migrate data
  const oldDoc = querySnapshot.docs[0];
  const oldData = oldDoc.data();
  await setDoc(userDocRef, {
    ...oldData,
    uid: firebaseUser.uid
  });
  await deleteDoc(doc(db, "users", oldDoc.id));
  
} else {
  // Fresh user - create with emailVerified: false
  const newUser = {
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName,
    email: firebaseUser.email,
    photoURL: firebaseUser.photoURL,
    role: "student",
    isBanned: false,
    emailVerified: firebaseUser.emailVerified || false, // ← NEW
    verificationSentAt: serverTimestamp(), // ← NEW
    favorites: [],
    createdAt: serverTimestamp()
  };

  await setDoc(userDocRef, newUser);

  // If email not verified, send verification email
  if (!firebaseUser.emailVerified) {
    try {
      await sendEmailVerification(firebaseUser);
      toast.info("Verification email sent. Please check your inbox.");
      console.log("Verification email sent to:", firebaseUser.email);
    } catch (emailErr) {
      console.warn("Failed to send verification email:", emailErr);
      // Don't block login, but inform user
    }
  }

  // Send welcome email
  sendWelcomeEmail(firebaseUser.email, firebaseUser.displayName || "Student");
}
```

---

## FIX #6: Update ProtectedRoute with Email Verification

**File:** `src/components/ProtectedRoute.jsx` (Replace entire file)

```jsx
import { Navigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { toast } from "react-hot-toast";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "../firebase";
import { useState } from "react";

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, isAdmin, loading } = useApp();
  const [resendLoading, setResendLoading] = useState(false);

  // Show loading state
  if (loading) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!user) {
    console.warn('ProtectedRoute: User not authenticated');
    return <Navigate to="/" replace />;
  }

  // If email not verified, show verification prompt
  if (!user.emailVerified) {
    const handleResendVerification = async () => {
      setResendLoading(true);
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await sendEmailVerification(currentUser);
          toast.success("Verification email resent. Check your inbox!");
        }
      } catch (err) {
        toast.error("Failed to resend verification email");
        console.error(err);
      } finally {
        setResendLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-app text-white flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-6 text-center">
          <div className="text-yellow-400 text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Email Verification Required</h2>
          <p className="text-zinc-400 mb-6">
            Please verify your email address to access this page.
          </p>
          <p className="text-zinc-500 text-sm mb-6">
            We sent a verification link to <strong>{user.email}</strong>
          </p>
          <button
            onClick={handleResendVerification}
            disabled={resendLoading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold disabled:opacity-50 mb-4"
          >
            {resendLoading ? "Sending..." : "Resend Verification Email"}
          </button>
          <p className="text-xs text-zinc-500">
            Check your spam folder if you don't see the email
          </p>
        </div>
      </div>
    );
  }

  // If specific role is required and user doesn't have it
  if (requiredRole === "admin" && !isAdmin) {
    console.warn('ProtectedRoute: User is not admin');
    return <Navigate to="/" replace />;
  }

  // All checks passed - render the component
  return children;
};

export default ProtectedRoute;
```

---

## FIX #7: Fix Async Error Handling in Upload

**File:** `src/context/AppContext.jsx` (Update startGlobalUpload function)

```javascript
const startGlobalUpload = async (filesToUpload, metadata, userName, userEmail) => {
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwMLyR-WYFHla9UlkmW_739DcMCSlNHDytuwGSRzmgk6S43Trv6lCgjqecC19HfSqA3xQ/exec";
  
  const results = {
    succeeded: [],
    failed: []
  };

  try {
    setGlobalUploadState({ uploading: true, current: 0, total: filesToUpload.length, realProgress: 0 });

    const semName = semesters.find(s => String(s.id) === String(metadata.semester))?.name || `Sem-${metadata.semester}`;
    const subName = subjects.find(s => String(s.id) === String(metadata.subject))?.name || `Sub-${metadata.subject}`;

    const cleanPart = (value) => (value || "")
      .toString().trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ");

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const preUploaded = metadata.preUploadedLinks?.[i];

      try {
        setGlobalUploadState(prev => ({
          ...prev,
          current: i + 1
        }));

        const extension = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
        let customFileName = `${cleanPart(userName)}-${cleanPart(semName)}-${cleanPart(subName)}-${cleanPart(metadata.title)}`;
        if (filesToUpload.length > 1) customFileName += `-(Part ${i + 1})`;
        customFileName += extension;

        let fileUrl = "";
        let fileId = "";

        if (preUploaded?.fileUrl) {
          fileUrl = preUploaded.fileUrl;
          fileId = preUploaded.fileId;
          setGlobalUploadState(prev => ({
            ...prev,
            realProgress: ((i + 1) * 100) / filesToUpload.length
          }));
        } else {
          try {
            const result = await uploadSingleFile(
              file,
              userName,
              customFileName,
              (percent) => {
                setGlobalUploadState(prev => {
                  const fileStart = (i * 100) / filesToUpload.length;
                  const fileShare = 100 / filesToUpload.length;
                  return { ...prev, realProgress: fileStart + (percent / 100) * fileShare };
                });
              }
            );
            fileUrl = result.fileUrl;
            fileId = result.fileId;
          } catch (uploadErr) {
            throw new Error(`Failed to upload ${file.name}: ${uploadErr.message}`);
          }
        }

        if (fileUrl) {
          try {
            await addDoc(collection(db, "materials"), {
              title: metadata.title,
              semId: metadata.semester,
              subjectId: metadata.subject,
              type: metadata.type,
              link: fileUrl,
              fileId: fileId,
              fileName: customFileName,
              status: "Pending",
              uploadedBy: userName,
              uploadedByUid: user?.uid || null,
              uploadedByEmail: userEmail,
              date: new Date().toISOString(),
              createdAt: serverTimestamp()
            });

            results.succeeded.push({
              file: file.name,
              fileId: fileId
            });
          } catch (dbErr) {
            throw new Error(`Database save failed for ${file.name}: ${dbErr.message}`);
          }
        }
      } catch (fileError) {
        console.error(`Error with file ${file.name}:`, fileError);
        results.failed.push({
          file: file.name,
          error: fileError.message
        });
        // Continue with next file instead of stopping
      }
    }

  } catch (globalError) {
    console.error("Upload batch error:", globalError);
    results.failed.push({
      file: "Batch operation",
      error: globalError.message
    });
  } finally {
    // ✅ ALWAYS reset upload state, even if errors
    setGlobalUploadState({ uploading: false, current: 0, total: 0, realProgress: 0 });

    // Show results to user
    if (results.succeeded.length > 0) {
      toast.success(`✅ ${results.succeeded.length} file(s) uploaded successfully`);
    }
    if (results.failed.length > 0) {
      toast.error(`❌ ${results.failed.length} file(s) failed to upload`);
      results.failed.forEach(f => {
        console.error(`Failed: ${f.file} - ${f.error}`);
      });
    }

    return results;
  }
};
```

---

## FIX #8: Environment-Aware Logging

**File:** `src/lib/logger.js` (Create new file)

```javascript
/**
 * Environment-aware logging utility
 * Logs to console in dev, sends to Sentry in production
 */
const isDev = import.meta.env.DEV;

export const logger = {
  info: (message, data = null) => {
    if (isDev) {
      console.log(`[INFO] ${message}`, data || '');
    }
    // In production, optionally send to logging service
  },

  warn: (message, data = null) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, data || '');
    }
    // In production, optionally send to logging service
  },

  error: (message, error = null) => {
    if (isDev) {
      console.error(`[ERROR] ${message}`, error || '');
    } else {
      // In production: send to Sentry/error tracking service
      // Example:
      // Sentry.captureException(error, { tags: { message } });
      console.error(`[ERROR] ${message}`); // Still log message, but not full error
    }
  },

  debug: (message, data = null) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  }
};

export default logger;
```

**Usage:**
```javascript
// Replace all console.log, console.error, etc with:
import { logger } from '../lib/logger';

logger.info("Welcome email triggered");
logger.error("Auth persistence setup failed", err);
logger.warn("Token expiring soon", { timeLeft: 300 });
```

---

## FIX #9: Add Error Boundary

**File:** `src/components/ErrorBoundary.jsx` (Create new file)

```jsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Send to error tracking service in production
    // Sentry.captureException(error, { contexts: { errorInfo } });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-app text-white flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="w-16 h-16 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Oops! Something Went Wrong</h1>
            <p className="text-zinc-400 mb-4">
              We've encountered an unexpected error. Please try reloading the page.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-left text-xs text-red-300 max-h-40 overflow-y-auto">
                <strong>Error Details (Dev Only):</strong>
                <pre className="mt-2 whitespace-pre-wrap">{this.state.error.toString()}</pre>
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors"
            >
              Reload Page
            </button>
            <p className="text-xs text-zinc-500 mt-4">
              If this problem persists, please contact support
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

**Usage in App.jsx:**
```jsx
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  // ... existing code ...
  
  return (
    <ErrorBoundary>
      <Toaster />
      <main className="...">
        <Suspense fallback={<RouteSuspenseFallback />}>
          <Routes>
            {/* ... routes ... */}
          </Routes>
        </Suspense>
      </main>
    </ErrorBoundary>
  );
}
```

---

## FIX #10: Add Offline Detection

**File:** `src/hooks/useOfflineDetection.js` (Create new file)

```javascript
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

/**
 * Hook to detect online/offline status and show notifications
 */
export const useOfflineDetection = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        toast.success('You are back online!');
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      toast.error('You are offline. Some features may not work.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return isOnline;
};

export default useOfflineDetection;
```

**Usage in App.jsx:**
```jsx
import { useOfflineDetection } from './hooks/useOfflineDetection';

function App() {
  const isOnline = useOfflineDetection();
  
  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-500/10 border-b border-red-500/30 p-2 text-red-400 text-center text-sm z-50">
          ⚠️ You are currently offline. Some features may not work properly.
        </div>
      )}
      {/* ... rest of app ... */}
    </>
  );
}
```

---

## IMPLEMENTATION ORDER

1. **First:** FIX #1 (Auth-first routing) - 1-2 hours
2. **Second:** FIX #2 (Firestore rules) - 30 minutes
3. **Third:** FIX #3 (Input validation) - 2-3 hours
4. **Fourth:** FIX #4 (Rate limiting) + FIX #9 (Error boundary) - 1 hour
5. **Fifth:** FIX #5 + #6 (Email verification) - 2 hours
6. **Sixth:** FIX #7 (Async error handling) - 1-2 hours
7. **Seventh:** FIX #8 (Logging) + FIX #10 (Offline) - 1 hour

**Total Time:** ~10-12 hours for all critical fixes

---

## TESTING AFTER FIXES

```bash
# Clear all data
rm -rf node_modules package-lock.json

# Fresh install
npm install

# Run dev server
npm run dev

# Test scenarios:
# 1. Direct URL navigation to /upload without login
# 2. Page refresh while on /admin
# 3. Try accessing database from browser console
# 4. Upload file with <script> tag in title
# 5. Spam upload button 100 times
# 6. Go offline, try to upload
# 7. Check console for sensitive data leaks
```

---

**Good luck! Yeh sab fixes implement karne ke baad, app production-ready ho jayega! 🚀**

