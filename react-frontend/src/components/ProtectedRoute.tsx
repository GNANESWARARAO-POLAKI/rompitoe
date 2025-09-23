import React from 'react';
import { Navigate } from 'react-router-dom';
import apiService from '../services/api';

interface ProtectedRouteProps {
  element: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  element, 
  requireAdmin = false 
}) => {
  const isAuthenticated = apiService.isAuthenticated();
  const isAdmin = apiService.isAdmin();
  
  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/" />;
  }
  
  if (requireAdmin && !isAdmin) {
    // Redirect to main page if admin access is required but user is not admin
    return <Navigate to="/" />;
  }
  
  // Render the protected component
  return <>{element}</>;
};

export default ProtectedRoute;