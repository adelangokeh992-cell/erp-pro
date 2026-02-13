import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from './Layout';
import Landing from '../pages/Landing';
import SplashScreen from './SplashScreen';

/**
 * Root route: shows Landing for unauthenticated users, Layout+Outlet for authenticated.
 */
export default function RootOrLanding() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
