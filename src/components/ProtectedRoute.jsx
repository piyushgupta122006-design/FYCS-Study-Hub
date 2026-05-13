import { Navigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, isAdmin, loading } = useApp();

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
    return <Navigate to="/" replace />;
  }

  // If specific role is required and user doesn't have it
  if (requiredRole === "admin" && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;