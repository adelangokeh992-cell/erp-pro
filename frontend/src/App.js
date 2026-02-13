import React from 'react';
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from 'next-themes';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { OfflineProvider } from './contexts/OfflineContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import SuperAdminLayout from './components/SuperAdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import RootOrLanding from './components/RootOrLanding';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Invoices from './pages/Invoices';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Purchases from './pages/Purchases';
import POS from './pages/POS';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Accounting from './pages/Accounting';
import Warehouses from './pages/Warehouses';
import ESLManagement from './pages/ESLManagement';
import Settings from './pages/Settings';
import About from './pages/About';
import InventoryCount from './pages/InventoryCount';
import ProductUnits from './pages/ProductUnits';
import CreateInvoice from './pages/CreateInvoice';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import TenantManagement from './pages/TenantManagement';
import TenantDetails from './pages/TenantDetails';
import TenantSettings from './pages/TenantSettings';
import CreateTenant from './pages/CreateTenant';
import SubscriptionPage, { SubscriptionSuccessPage } from './pages/SubscriptionPage';
import Landing from './pages/Landing';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Support from './pages/Support';
import Pricing from './pages/Pricing';
import Features from './pages/Features';
import FAQ from './pages/FAQ';
import UserGuide from './pages/UserGuide';
import { Toaster } from './components/ui/sonner';

function AppRoutesWithErrorBoundary() {
  const { language } = useLanguage();
  return (
    <ErrorBoundary language={language}>
      <AppRoutes />
    </ErrorBoundary>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/support" element={<Support />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/features" element={<Features />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/guide" element={<UserGuide />} />

      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['super_admin']} loginPath="/login">
          <SuperAdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<SuperAdminDashboard />} />
        <Route path="tenants" element={<TenantManagement />} />
        <Route path="tenants/new" element={<CreateTenant />} />
        <Route path="tenants/:id" element={<TenantDetails />} />
        <Route path="tenants/:id/settings" element={<TenantSettings />} />
        <Route path="tenants/:id/subscription" element={<SubscriptionPage />} />
        <Route path="subscription/success" element={<SubscriptionSuccessPage />} />
      </Route>

      <Route path="/" element={<RootOrLanding />}>
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="customers" element={<Customers />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="pos" element={<POS />} />
        <Route path="users" element={<Users />} />
        <Route path="reports" element={<Reports />} />
        <Route path="accounting" element={<Accounting />} />
        <Route path="warehouses" element={<Warehouses />} />
        <Route path="esl" element={<ESLManagement />} />
        <Route path="inventory-count" element={<InventoryCount />} />
        <Route path="product-units" element={<ProductUnits />} />
        <Route path="invoices/create" element={<CreateInvoice />} />
        <Route path="settings" element={<Settings />} />
        <Route path="about" element={<About />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <LanguageProvider>
        <AuthProvider>
          <OnboardingProvider>
          <OfflineProvider>
            <BrowserRouter>
              <AppRoutesWithErrorBoundary />
              <Toaster />
            </BrowserRouter>
          </OfflineProvider>
          </OnboardingProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
