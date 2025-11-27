import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Shield } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary p-3 animate-pulse">
            <Shield className="w-full h-full text-primary-foreground" />
          </div>
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to appropriate login if not authenticated
  if (!user) {
    // Save the attempted URL for redirecting after login
    const returnUrl = location.pathname + location.search;
    
    if (requireAdmin) {
      return <Navigate to="/admin" state={{ from: returnUrl }} replace />;
    }
    return <Navigate to="/student" state={{ from: returnUrl }} replace />;
  }

  // Check if admin access is required
  if (requireAdmin) {
    // Check if user email contains 'admin' or is in admin list
    const isAdmin = user.email?.includes('admin') || user.email === 'admin@certisign.com';
    
    if (!isAdmin) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-xl bg-destructive/20 p-3 mx-auto">
              <Shield className="w-full h-full text-destructive" />
            </div>
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
