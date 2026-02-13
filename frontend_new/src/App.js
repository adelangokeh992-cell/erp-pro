import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';

// Pages
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import TenantManagement from './pages/TenantManagement';
import TenantDetails from './pages/TenantDetails';
import CreateTenant from './pages/CreateTenant';

// Layouts
import SuperAdminLayout from './components/SuperAdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Super Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<SuperAdminDashboard />} />
              <Route path="tenants" element={<TenantManagement />} />
              <Route path="tenants/new" element={<CreateTenant />} />
              <Route path="tenants/:id" element={<TenantDetails />} />
            </Route>
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
        <Toaster position="top-center" />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
