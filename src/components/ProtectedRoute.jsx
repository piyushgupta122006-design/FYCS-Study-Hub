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
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold disabled:opacity-50 mb-4 transition-colors"
          >
            {resendLoading ? "Sending..." : "Resend Verification Email"}
          </button>
          <p className="text-xs text-zinc-500">
            Check your spam folder if you don't see the email. You might need to refresh the page after verifying.
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