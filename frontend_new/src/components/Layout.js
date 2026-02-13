import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { Button } from './ui/button';
import {
  LayoutDashboard,
  Package,
  FileText,
  Users,
  Truck,
  ShoppingCart,
  UsersRound,
  ShoppingBag,
  BarChart3,
  Wallet,
  Warehouse,
  Settings,
  LogOut,
  Menu,
  X,
  Globe,
  Monitor,
  CheckSquare,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  Tag,
} from 'lucide-react';

const Layout = () => {
  const { t, language, toggleLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const { operationMode, isOnline, syncStatus } = useOffline();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: t('dashboard') },
    { path: '/inventory', icon: Package, label: t('inventory') },
    { path: '/product-units', icon: Tag, label: language === 'ar' ? 'الوحدات (Tags)' : 'Units (Tags)' },
    { path: '/inventory-count', icon: CheckSquare, label: language === 'ar' ? 'الجرد' : 'Inventory Count' },
    { path: '/invoices', icon: FileText, label: t('invoices') },
    { path: '/customers', icon: Users, label: t('customers') },
    { path: '/suppliers', icon: Truck, label: t('suppliers') },
    { path: '/purchases', icon: ShoppingCart, label: t('purchases') },
    { path: '/pos', icon: ShoppingBag, label: t('pos') },
    { path: '/users', icon: UsersRound, label: t('users') },
    { path: '/reports', icon: BarChart3, label: t('reports') },
    { path: '/accounting', icon: Wallet, label: t('accounting') },
    { path: '/warehouses', icon: Warehouse, label: t('warehouses') },
    { path: '/esl', icon: Monitor, label: t('esl') },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 overflow-hidden flex flex-col`}
      >
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            ERP System
          </h1>
          <p className="text-xs text-gray-400 mt-1">{user?.name}</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                    : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-2">
          <Link to="/settings">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-slate-700"
            >
              <Settings className="w-5 h-5 mr-3" />
              {t('settings')}
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-slate-700"
            onClick={logout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            {t('logout')}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <h2 className="text-xl font-semibold text-gray-800">
              {menuItems.find((item) => item.path === location.pathname)?.label || t('dashboard')}
            </h2>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="flex items-center gap-2"
          >
            <Globe className="w-4 h-4" />
            {language === 'en' ? 'العربية' : 'English'}
          </Button>

          {/* Connection Status Indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            operationMode === 'offline' 
              ? 'bg-orange-100 text-orange-700 border border-orange-200' 
              : isOnline 
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {operationMode === 'offline' ? (
              <>
                <CloudOff className="w-4 h-4" />
                <span>{language === 'ar' ? 'أوفلاين' : 'Offline'}</span>
                {syncStatus.pendingCount > 0 && (
                  <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {syncStatus.pendingCount}
                  </span>
                )}
              </>
            ) : isOnline ? (
              <>
                <Cloud className="w-4 h-4" />
                <span>{language === 'ar' ? 'متصل' : 'Online'}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span>{language === 'ar' ? 'لا اتصال' : 'No Connection'}</span>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
