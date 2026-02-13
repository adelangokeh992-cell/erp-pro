import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { Button } from './ui/button';
import { toast } from 'sonner';
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
  RefreshCw,
  Download,
  AlertCircle,
  Info,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import OnboardingTour from './OnboardingTour';

const WATERMARK_TEXT = 'ERP Pro';

const Layout = () => {
  const { t, language, toggleLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { user, logout, isFeatureEnabled, tenant, hasPermission } = useAuth();
  const { 
    operationMode, 
    isOnline, 
    syncStatus, 
    offlineEnabled,
    isOfflineFeatureEnabled,
    syncProgress,
    downloadProgress,
    fullSync,
    downloadForOffline,
    offlineStats
  } = useOffline();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Handle sync button click
  const handleSync = async () => {
    if (!isOnline) {
      toast.error(language === 'ar' ? 'لا يوجد اتصال بالإنترنت' : 'No internet connection');
      return;
    }
    
    setIsSyncing(true);
    try {
      const result = await fullSync();
      toast.success(
        language === 'ar' 
          ? `تمت المزامنة: ${result.downloaded} عنصر محمل، ${result.uploaded} عنصر مرفوع`
          : `Sync complete: ${result.downloaded} downloaded, ${result.uploaded} uploaded`
      );
    } catch (error) {
      const errMsg = error?.message || error?.response?.data?.detail;
      toast.error(
        language === 'ar' 
          ? `فشلت المزامنة: ${errMsg || 'تحقق من الاتصال وحاول مرة أخرى'}`
          : `Sync failed: ${errMsg || 'Check connection and try again'}`
      );
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle download for offline
  const handleDownloadOffline = async () => {
    if (!isOnline) {
      toast.error(language === 'ar' ? 'لا يوجد اتصال بالإنترنت' : 'No internet connection');
      return;
    }
    
    setIsSyncing(true);
    try {
      const result = await downloadForOffline();
      toast.success(
        language === 'ar' 
          ? `تم تحميل ${result.downloaded} مجموعة بيانات للاستخدام بدون إنترنت`
          : `Downloaded ${result.downloaded} collections for offline use`
      );
    } catch (error) {
      const errMsg = error?.message || error?.response?.data?.detail;
      toast.error(
        language === 'ar'
          ? `فشل التحميل: ${errMsg || 'تحقق من الاتصال وحاول مرة أخرى'}`
          : `Download failed: ${errMsg || 'Check connection and try again'}`
      );
      console.error('Download error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Menu items with feature keys and permission keys for RBAC
  const allMenuItems = [
    { path: '/', icon: LayoutDashboard, label: t('dashboard'), featureKey: 'dashboard', permission: 'dashboard' },
    { path: '/inventory', icon: Package, label: t('inventory'), featureKey: 'products', permission: 'products' },
    { path: '/product-units', icon: Tag, label: language === 'ar' ? 'الوحدات (Tags)' : 'Units (Tags)', featureKey: 'rfid', permission: 'products' },
    { path: '/inventory-count', icon: CheckSquare, label: language === 'ar' ? 'الجرد' : 'Inventory Count', featureKey: 'rfid', permission: 'inventory_count' },
    { path: '/invoices', icon: FileText, label: t('invoices'), featureKey: 'invoices', permission: 'invoices' },
    { path: '/customers', icon: Users, label: t('customers'), featureKey: 'customers', permission: 'customers' },
    { path: '/suppliers', icon: Truck, label: t('suppliers'), featureKey: 'suppliers', permission: 'suppliers' },
    { path: '/purchases', icon: ShoppingCart, label: t('purchases'), featureKey: 'purchases', permission: 'purchases' },
    { path: '/pos', icon: ShoppingBag, label: t('pos'), featureKey: 'pos', permission: 'pos' },
    { path: '/users', icon: UsersRound, label: t('users'), featureKey: 'dashboard', permission: 'users' },
    { path: '/reports', icon: BarChart3, label: t('reports'), featureKey: 'reports', permission: 'reports' },
    { path: '/accounting', icon: Wallet, label: t('accounting'), featureKey: 'accounting', permission: 'accounting' },
    { path: '/warehouses', icon: Warehouse, label: t('warehouses'), featureKey: 'warehouses', permission: 'warehouses' },
    { path: '/esl', icon: Monitor, label: t('esl'), featureKey: 'esl', permission: 'products' },
  ];

  // Filter menu items by tenant features and user permissions (RBAC)
  const menuItems = allMenuItems.filter(
    (item) => isFeatureEnabled(item.featureKey) && (!item.permission || hasPermission(item.permission))
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 overflow-hidden flex flex-col`}
      >
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            {tenant?.name || 'ERP System'}
          </h1>
          <p className="text-xs text-gray-400 mt-1">{user?.fullName || user?.username}</p>
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
          <Link to="/about">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-slate-700"
            >
              <Info className="w-5 h-5 mr-3" />
              {language === 'ar' ? 'حول البرنامج' : 'About'}
            </Button>
          </Link>
          {hasPermission('settings') && (
            <Link to="/settings">
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-300 hover:text-white hover:bg-slate-700"
              >
                <Settings className="w-5 h-5 mr-3" />
                {t('settings')}
              </Button>
            </Link>
          )}
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
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              {location.pathname === '/about'
                ? (language === 'ar' ? 'حول البرنامج' : 'About')
                : (menuItems.find((item) => item.path === location.pathname)?.label || t('dashboard'))}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Sync Button - Only show if offline feature is enabled */}
            {isOfflineFeatureEnabled && (
              <div className="flex items-center gap-2">
                {/* Download for Offline */}
                {!offlineEnabled && isOnline && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadOffline}
                    disabled={isSyncing || !isOnline}
                    className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                    data-testid="download-offline-btn"
                  >
                    <Download className={`w-4 h-4 ${downloadProgress ? 'animate-bounce' : ''}`} />
                    {downloadProgress 
                      ? `${downloadProgress.current}/${downloadProgress.total}`
                      : (language === 'ar' ? 'تحميل للأوفلاين' : 'Download Offline')
                    }
                  </Button>
                )}

                {/* Sync Button */}
                {offlineEnabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={isSyncing || syncStatus.syncInProgress || !isOnline}
                    className={`flex items-center gap-2 ${
                      syncStatus.pendingCount > 0 
                        ? 'text-orange-600 border-orange-200 hover:bg-orange-50' 
                        : 'text-green-600 border-green-200 hover:bg-green-50'
                    }`}
                    data-testid="sync-btn"
                  >
                    <RefreshCw className={`w-4 h-4 ${(isSyncing || syncStatus.syncInProgress) ? 'animate-spin' : ''}`} />
                    {syncProgress 
                      ? (syncProgress.phase === 'upload' 
                          ? (language === 'ar' ? 'رفع...' : 'Uploading...') 
                          : `${syncProgress.current}/${syncProgress.total}`)
                      : (language === 'ar' ? 'مزامنة' : 'Sync')
                    }
                    {syncStatus.pendingCount > 0 && !isSyncing && (
                      <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {syncStatus.pendingCount}
                      </span>
                    )}
                  </Button>
                )}

                {/* Offline Stats Badge */}
                {offlineEnabled && offlineStats.total > 0 && (
                  <div className="text-xs text-gray-500 hidden md:block">
                    {offlineStats.total} {language === 'ar' ? 'عنصر محفوظ' : 'items cached'}
                  </div>
                )}
              </div>
            )}

            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center gap-2"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'dark' ? (language === 'ar' ? 'فاتح' : 'Light') : (language === 'ar' ? 'داكن' : 'Dark')}
            </Button>

            {/* Language Toggle */}
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
          </div>
        </header>

        {/* Sync Progress Bar */}
        {(downloadProgress || syncProgress) && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-2">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-700">
                {downloadProgress 
                  ? `${language === 'ar' ? 'جاري التحميل:' : 'Downloading:'} ${downloadProgress.currentName}`
                  : syncProgress 
                    ? `${language === 'ar' ? 'جاري المزامنة:' : 'Syncing:'} ${syncProgress.currentName}`
                    : ''
                }
              </span>
              <div className="flex-1 h-2 bg-blue-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ 
                    width: `${((downloadProgress?.current || syncProgress?.current || 0) / (downloadProgress?.total || syncProgress?.total || 1)) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 relative">
          <Outlet />
          <OnboardingTour />
          {/* Watermark: copyright in corner */}
          <div
            className="fixed bottom-3 right-3 text-[10px] text-gray-400 select-none pointer-events-none z-0"
            aria-hidden="true"
          >
            {WATERMARK_TEXT} © {new Date().getFullYear()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
