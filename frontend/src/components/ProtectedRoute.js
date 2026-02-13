import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SplashScreen from './SplashScreen';

const ProtectedRoute = ({ children, allowedRoles = [], loginPath = '/login' }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    if (user?.role === 'super_admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
