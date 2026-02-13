import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useOffline } from '../contexts/OfflineContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { Globe, Wifi, WifiOff, Database, Save, Radio, RefreshCw, Download, Upload, CheckCircle, XCircle, Loader2, HardDrive, Trash2, LogOut, Archive, FolderDown } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { getOfflineStorage } from '../services/offlineStorage';
import { backupAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';
import rfidScanner from '../services/rfidScanner';

const Settings = () => {
  const { t, language, toggleLanguage } = useLanguage();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { 
    operationMode, 
    switchMode, 
    isOnline, 
    syncStatus, 
    downloadProgress,
    downloadForOffline, 
    syncToServer, 
    clearOfflineData,
    getOfflineStats 
  } = useOffline();
  const { toast } = useToast();
  const [rfidStatus, setRfidStatus] = useState('disconnected');
  const [offlineStats, setOfflineStats] = useState({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isRestoreLoading, setIsRestoreLoading] = useState(false);
  const [serialPorts, setSerialPorts] = useState([]);
  const [selectedComPort, setSelectedComPort] = useState('');
  const [comBaudRate, setComBaudRate] = useState(9600);
  const [comReading, setComReading] = useState(false);
  const [lastComTag, setLastComTag] = useState('');
  const [loadingPorts, setLoadingPorts] = useState(false);
  const [clearDataConfirmOpen, setClearDataConfirmOpen] = useState(false);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState(null);

  const isAr = language === 'ar';
  const isDesktop = typeof window !== 'undefined' && window.erpDesktop;

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast({
      title: isAr ? 'تم تسجيل الخروج' : 'Logged Out',
      description: isAr ? 'تم تسجيل خروجك بنجاح' : 'You have been logged out successfully',
    });
  };

  useEffect(() => {
    loadOfflineStats();
  }, []);

  // COM RFID: subscribe to tag events when reading and forward to rfidScanner for other pages
  useEffect(() => {
    if (!comReading || !isDesktop || !window.erpDesktop?.onRfidTag) return;
    const unsubscribe = window.erpDesktop.onRfidTag((data) => {
      const tag = data?.tag || '';
      if (tag) {
        setLastComTag(tag);
        rfidScanner.notifyListeners('scan', {
          tag,
          timestamp: new Date().toISOString(),
          scanNumber: 0,
        });
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [comReading, isDesktop]);

  const loadOfflineStats = async () => {
    try {
      const stats = await getOfflineStats();
      setOfflineStats(stats);
    } catch (e) {
      console.error('Failed to load offline stats:', e);
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('operationMode', operationMode);
    toast({
      title: isAr ? 'تم الحفظ' : 'Saved',
      description: isAr ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully',
    });
  };

  const handleSwitchMode = (mode) => {
    switchMode(mode);
    toast({
      title: isAr ? 'تم تغيير الوضع' : 'Mode Changed',
      description: isAr 
        ? (mode === 'offline' ? '🔴 الوضع: غير متصل (Offline)' : '🟢 الوضع: متصل (Online)') 
        : `Mode: ${mode}`,
    });
  };

  const handleDownloadData = async () => {
    if (!isOnline) {
      toast({ 
        title: isAr ? 'خطأ' : 'Error', 
        description: isAr ? 'يجب أن تكون متصلاً بالإنترنت للتحميل' : 'Must be online to download', 
        variant: 'destructive' 
      });
      return;
    }
    
    setIsDownloading(true);
    try {
      const result = await downloadForOffline();
      await loadOfflineStats();
      toast({ 
        title: isAr ? 'تم التحميل' : 'Downloaded', 
        description: isAr 
          ? `تم تحميل ${result.downloaded} مجموعات بيانات للعمل بدون إنترنت` 
          : `Downloaded ${result.downloaded} data collections for offline use`
      });
    } catch (e) {
      toast({ 
        title: isAr ? 'خطأ' : 'Error', 
        description: e.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSync = async () => {
    if (!isOnline) {
      toast({ 
        title: isAr ? 'خطأ' : 'Error', 
        description: isAr ? 'يجب أن تكون متصلاً بالإنترنت للمزامنة' : 'Must be online to sync', 
        variant: 'destructive' 
      });
      return;
    }
    
    setIsSyncing(true);
    try {
      const result = await syncToServer();
      await loadOfflineStats();
      toast({ 
        title: isAr ? 'تم المزامنة' : 'Synced', 
        description: isAr 
          ? `تمت مزامنة ${result.synced} عناصر بنجاح${result.failed > 0 ? ` (فشل ${result.failed})` : ''}`
          : `Synced ${result.synced} items successfully${result.failed > 0 ? ` (${result.failed} failed)` : ''}`
      });
    } catch (e) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearData = async () => {
    setClearDataConfirmOpen(true);
  };

  const doClearData = async () => {
    try {
      await clearOfflineData();
      await loadOfflineStats();
      toast({ 
        title: isAr ? 'تم الحذف' : 'Cleared', 
        description: isAr ? 'تم حذف جميع البيانات المحلية' : 'All local data cleared' 
      });
    } catch (e) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const doRestoreBackup = async () => {
    if (!pendingRestoreFile) return;
    setIsRestoreLoading(true);
    try {
      const text = await pendingRestoreFile.text();
      const payload = JSON.parse(text);
      const { data } = await backupAPI.restoreBackup(payload);
      if (data?.errors?.length) {
        toast({ title: isAr ? 'استعادة جزئية' : 'Partial restore', description: data.errors.join('; '), variant: 'destructive' });
      } else {
        toast({ title: isAr ? 'تمت الاستعادة بنجاح' : 'Restore successful' });
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      toast({ title: isAr ? 'فشل الاستعادة' : 'Restore failed', description: Array.isArray(msg) ? msg.join(', ') : msg, variant: 'destructive' });
    } finally {
      setIsRestoreLoading(false);
      setPendingRestoreFile(null);
      setRestoreConfirmOpen(false);
    }
  };

  const connectRFID = async () => {
    try {
      setRfidStatus('connecting');
      rfidScanner.startListening();
      setRfidStatus('connected');
      toast({ title: isAr ? 'متصل' : 'Connected', description: isAr ? 'تم تفعيل قارئ RFID' : 'RFID reader activated' });
    } catch (e) {
      setRfidStatus('disconnected');
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'فشل تفعيل قارئ RFID' : 'Failed to activate RFID reader', variant: 'destructive' });
    }
  };

  const disconnectRFID = () => {
    rfidScanner.stopListening();
    setRfidStatus('disconnected');
  };

  const totalLocalItems = Object.values(offlineStats).reduce((sum, count) => sum + (count || 0), 0);

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-3xl font-bold">{t('settings')}</h1>
        <p className="text-gray-600 mt-1">{isAr ? 'إعدادات النظام والتطبيق' : 'System Settings'}</p>
      </div>

      <Tabs defaultValue="connection" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connection">{isAr ? 'الاتصال' : 'Connection'}</TabsTrigger>
          <TabsTrigger value="sync">{isAr ? 'المزامنة' : 'Sync'}</TabsTrigger>
          <TabsTrigger value="rfid">{isAr ? 'RFID' : 'RFID'}</TabsTrigger>
          <TabsTrigger value="general">{isAr ? 'عام' : 'General'}</TabsTrigger>
        </TabsList>

        {/* Connection Settings - Main Tab */}
        <TabsContent value="connection" className="space-y-4">
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {operationMode === 'offline' ? <WifiOff className="w-5 h-5 text-orange-500" /> : <Wifi className="w-5 h-5 text-green-500" />}
                {isAr ? 'وضع التشغيل' : 'Operation Mode'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Status */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{isAr ? 'الوضع الحالي:' : 'Current Mode:'}</p>
                    <p className="text-2xl font-bold">
                      {operationMode === 'offline' 
                        ? (isAr ? '🔴 غير متصل (Offline)' : '🔴 Offline') 
                        : (isAr ? '🟢 متصل (Online)' : '🟢 Online')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{isAr ? 'حالة الشبكة:' : 'Network:'}</p>
                    <p className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                      {isOnline ? (isAr ? '✓ متصل' : '✓ Connected') : (isAr ? '✗ غير متصل' : '✗ Disconnected')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mode Selection Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card 
                  className={`cursor-pointer transition-all hover:shadow-md ${operationMode === 'online' ? 'border-2 border-green-500 bg-green-50 shadow-green-100' : 'hover:border-gray-400'}`} 
                  onClick={() => handleSwitchMode('online')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Wifi className="w-8 h-8 text-green-600" />
                      <h3 className="font-bold text-lg">{isAr ? 'أونلاين' : 'Online'}</h3>
                      {operationMode === 'online' && <CheckCircle className="w-5 h-5 text-green-600 mr-auto" />}
                    </div>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {isAr ? 'اتصال مباشر بالخادم' : 'Direct server connection'}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {isAr ? 'بيانات محدثة دائماً' : 'Always updated data'}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {isAr ? 'مزامنة فورية' : 'Instant sync'}
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all hover:shadow-md ${operationMode === 'offline' ? 'border-2 border-orange-500 bg-orange-50 shadow-orange-100' : 'hover:border-gray-400'}`} 
                  onClick={() => handleSwitchMode('offline')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <WifiOff className="w-8 h-8 text-orange-600" />
                      <h3 className="font-bold text-lg">{isAr ? 'أوفلاين' : 'Offline'}</h3>
                      {operationMode === 'offline' && <CheckCircle className="w-5 h-5 text-orange-600 mr-auto" />}
                    </div>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-orange-500" />
                        {isAr ? 'يعمل بدون إنترنت' : 'Works without internet'}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-orange-500" />
                        {isAr ? 'تخزين محلي كامل' : 'Full local storage'}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-orange-500" />
                        {isAr ? 'مزامنة عند الاتصال' : 'Sync when connected'}
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Info Box */}
              {operationMode === 'offline' && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-3">
                    <Database className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">{isAr ? 'وضع العمل بدون إنترنت' : 'Offline Mode Active'}</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        {isAr 
                          ? 'جميع البيانات تُحفظ محلياً في المتصفح وستُزامن تلقائياً عند الاتصال بالإنترنت.'
                          : 'All data is saved locally in the browser and will automatically sync when connected.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Settings */}
        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                {isAr ? 'المزامنة والنسخ الاحتياطي' : 'Sync & Backup'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p className="text-sm text-gray-600">{isAr ? 'حالة الاتصال' : 'Connection'}</p>
                  <p className="text-lg font-bold flex items-center gap-2 mt-1">
                    {isOnline ? (
                      <><CheckCircle className="w-5 h-5 text-green-500" />{isAr ? 'متصل' : 'Online'}</>
                    ) : (
                      <><XCircle className="w-5 h-5 text-red-500" />{isAr ? 'غير متصل' : 'Offline'}</>
                    )}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p className="text-sm text-gray-600">{isAr ? 'معاملات معلقة' : 'Pending Sync'}</p>
                  <p className="text-lg font-bold text-orange-600">{syncStatus.pendingCount || 0}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p className="text-sm text-gray-600">{isAr ? 'آخر تحميل' : 'Last Download'}</p>
                  <p className="text-sm font-medium">
                    {syncStatus.lastDownload 
                      ? new Date(syncStatus.lastDownload).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')
                      : (isAr ? 'لم يتم' : 'Never')}
                  </p>
                </div>
              </div>

              {/* Local Data Stats */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <HardDrive className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-blue-800">{isAr ? 'البيانات المحلية' : 'Local Data'}</h4>
                  <span className="mr-auto bg-blue-200 px-2 py-0.5 rounded text-sm">{totalLocalItems} {isAr ? 'عنصر' : 'items'}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div className="bg-white p-2 rounded">
                    <p className="text-gray-500">{isAr ? 'منتجات' : 'Products'}</p>
                    <p className="font-bold">{offlineStats.products || 0}</p>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <p className="text-gray-500">{isAr ? 'عملاء' : 'Customers'}</p>
                    <p className="font-bold">{offlineStats.customers || 0}</p>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <p className="text-gray-500">{isAr ? 'فواتير' : 'Invoices'}</p>
                    <p className="font-bold">{offlineStats.invoices || 0}</p>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <p className="text-gray-500">{isAr ? 'مشتريات' : 'Purchases'}</p>
                    <p className="font-bold">{offlineStats.purchases || 0}</p>
                  </div>
                </div>
              </div>

              {/* Download Progress */}
              {downloadProgress && (
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{isAr ? 'جاري التحميل:' : 'Downloading:'} {downloadProgress.currentName}</span>
                    <span className="text-sm">{downloadProgress.current}/{downloadProgress.total}</span>
                  </div>
                  <Progress value={(downloadProgress.current / downloadProgress.total) * 100} className="h-2" />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={handleDownloadData}
                  disabled={!isOnline || isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {isAr ? 'تحميل للعمل أوفلاين' : 'Download for Offline'}
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleSync} 
                  disabled={!isOnline || syncStatus.pendingCount === 0 || isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {isAr ? 'مزامنة الآن' : 'Sync Now'} ({syncStatus.pendingCount || 0})
                </Button>
              </div>

              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={handleClearData}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isAr ? 'حذف جميع البيانات المحلية' : 'Clear All Local Data'}
              </Button>

              <ConfirmDialog
                open={clearDataConfirmOpen}
                onOpenChange={setClearDataConfirmOpen}
                title={isAr ? 'تأكيد الحذف' : 'Confirm Delete'}
                description={isAr ? 'هل أنت متأكد من حذف جميع البيانات المحلية؟' : 'Are you sure you want to delete all local data?'}
                confirmLabel={isAr ? 'حذف' : 'Delete'}
                cancelLabel={isAr ? 'إلغاء' : 'Cancel'}
                onConfirm={doClearData}
                variant="destructive"
              />

              {/* Backup from server (web + desktop) */}
              <Card className="border-2 border-emerald-200 bg-emerald-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-800">
                    <Database className="w-5 h-5" />
                    {isAr ? 'نسخ احتياطي من الخادم' : 'Backup from Server'}
                  </CardTitle>
                  <p className="text-sm text-emerald-700">
                    {isAr ? 'تحميل أو استعادة بيانات شركتك من خادم MongoDB.' : 'Download or restore your company data from the server.'}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3 items-center">
                    <Button
                      variant="outline"
                      className="border-emerald-300"
                      disabled={!isOnline || isBackupLoading}
                      onClick={async () => {
                        if (!isOnline) {
                          toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'يجب الاتصال بالإنترنت' : 'Must be online', variant: 'destructive' });
                          return;
                        }
                        setIsBackupLoading(true);
                        try {
                          const { data } = await backupAPI.exportBackup();
                          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          const date = new Date().toISOString().slice(0, 10);
                          a.download = `backup_${data.tenantId || 'company'}_${date}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                          toast({ title: isAr ? 'تم تحميل النسخة الاحتياطية' : 'Backup downloaded', description: isAr ? 'تم حفظ الملف محلياً' : 'File saved locally' });
                        } catch (e) {
                          toast({ title: isAr ? 'فشل التصدير' : 'Export failed', description: e.response?.data?.detail || e.message, variant: 'destructive' });
                        } finally {
                          setIsBackupLoading(false);
                        }
                      }}
                    >
                      {isBackupLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                      {isAr ? 'تحميل نسخة احتياطية' : 'Download backup'}
                    </Button>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".json"
                        className="max-w-[200px]"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setPendingRestoreFile(file);
                          setRestoreConfirmOpen(true);
                          e.target.value = '';
                        }}
                        disabled={!isOnline || isRestoreLoading}
                      />
                      <span className="text-sm text-gray-600">{isAr ? 'استعادة من ملف' : 'Restore from file'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pending Warning */}
              {syncStatus.pendingCount > 0 && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    ⚠️ {isAr 
                      ? `لديك ${syncStatus.pendingCount} معاملات تحتاج مزامنة مع الخادم`
                      : `You have ${syncStatus.pendingCount} pending transactions to sync`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RFID Settings */}
        <TabsContent value="rfid" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="w-5 h-5" />
                {isAr ? 'إعدادات قارئ RFID' : 'RFID Reader Settings'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium">{isAr ? 'حالة الاتصال' : 'Connection Status'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {rfidStatus === 'connected' ? (
                        <><CheckCircle className="w-5 h-5 text-green-500" /><span className="text-green-600">{isAr ? 'متصل' : 'Connected'}</span></>
                      ) : rfidStatus === 'connecting' ? (
                        <><Loader2 className="w-5 h-5 text-blue-500 animate-spin" /><span className="text-blue-600">{isAr ? 'جاري الاتصال...' : 'Connecting...'}</span></>
                      ) : (
                        <><XCircle className="w-5 h-5 text-red-500" /><span className="text-red-600">{isAr ? 'غير متصل' : 'Disconnected'}</span></>
                      )}
                    </div>
                  </div>
                  {rfidStatus === 'connected' ? (
                    <Button variant="destructive" onClick={disconnectRFID}>{isAr ? 'قطع الاتصال' : 'Disconnect'}</Button>
                  ) : (
                    <Button onClick={connectRFID} disabled={rfidStatus === 'connecting'}>{isAr ? 'اتصال' : 'Connect'}</Button>
                  )}
                </div>
              </div>

              {isDesktop && window.erpDesktop?.listSerialPorts && (
                <Card className="border-2 border-blue-200 bg-blue-50/50">
                  <CardHeader>
                    <CardTitle className="text-blue-800 text-base">
                      {isAr ? 'قارئ عبر منفذ تسلسلي (COM)' : 'Serial Port (COM) Reader'}
                    </CardTitle>
                    <p className="text-sm text-blue-700">
                      {isAr ? 'اختر المنفذ ثم ابدأ القراءة. القراءات تظهر أيضاً في الجرد والوحدات.' : 'Select port then start reading. Tags also appear in Inventory Count and Units.'}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">{isAr ? 'المنفذ' : 'Port'}</Label>
                        <select
                          className="p-2 border rounded-lg min-w-[180px]"
                          value={selectedComPort}
                          onChange={(e) => setSelectedComPort(e.target.value)}
                          disabled={comReading}
                        >
                          <option value="">—</option>
                          {Array.isArray(serialPorts) && !serialPorts.error
                            ? serialPorts.map((p) => (
                                <option key={p.path} value={p.path}>
                                  {p.path} {p.manufacturer ? `(${p.manufacturer})` : ''}
                                </option>
                              ))
                            : null}
                        </select>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loadingPorts}
                        onClick={async () => {
                          setLoadingPorts(true);
                          try {
                            const list = await window.erpDesktop.listSerialPorts();
                            if (list && list.error) {
                              setSerialPorts([]);
                              toast({ title: isAr ? 'خطأ' : 'Error', description: list.error, variant: 'destructive' });
                            } else {
                              setSerialPorts(Array.isArray(list) ? list : []);
                              if (!selectedComPort && Array.isArray(list) && list[0]) setSelectedComPort(list[0].path);
                            }
                          } finally {
                            setLoadingPorts(false);
                          }
                        }}
                      >
                        {loadingPorts ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                        {isAr ? 'تحديث المنافذ' : 'Refresh ports'}
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">{isAr ? 'السرعة (Baud)' : 'Baud rate'}</Label>
                        <Input
                          type="number"
                          className="w-24"
                          value={comBaudRate}
                          onChange={(e) => setComBaudRate(Number(e.target.value) || 9600)}
                          disabled={comReading}
                          min={9600}
                          max={115200}
                        />
                      </div>
                      {!comReading ? (
                        <Button
                          size="sm"
                          disabled={!selectedComPort}
                          onClick={async () => {
                            const res = await window.erpDesktop.startRfid({ path: selectedComPort, baudRate: comBaudRate });
                            if (res && res.ok) {
                              setComReading(true);
                              setLastComTag('');
                              toast({ title: isAr ? 'بدء القراءة' : 'Reading started' });
                            } else {
                              toast({ title: isAr ? 'خطأ' : 'Error', description: res?.error || (isAr ? 'فشل فتح المنفذ' : 'Failed to open port'), variant: 'destructive' });
                            }
                          }}
                        >
                          {isAr ? 'بدء القراءة' : 'Start reading'}
                        </Button>
                      ) : (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            await window.erpDesktop.stopRfid();
                            setComReading(false);
                            toast({ title: isAr ? 'إيقاف القراءة' : 'Reading stopped' });
                          }}
                        >
                          {isAr ? 'إيقاف القراءة' : 'Stop reading'}
                        </Button>
                      )}
                    </div>
                    {lastComTag && (
                      <p className="text-sm text-gray-700">
                        {isAr ? 'آخر علامة:' : 'Last tag:'} <span className="font-mono bg-white px-2 py-1 rounded border">{lastComTag}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="border border-amber-200 bg-amber-50/50">
                <CardHeader>
                  <CardTitle className="text-amber-900 text-base">
                    {isAr ? 'جهاز BX6100 (UHF RFID)' : 'BX6100 device (UHF RFID)'}
                  </CardTitle>
                  <div className="text-sm text-amber-800 space-y-2">
                    <p>
                      {isAr
                        ? 'لتشغيل قارئ BX6100 مع البرنامج:'
                        : 'To use the BX6100 scanner with this app:'}
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>{isAr ? 'اتصل بالكمبيوتر عبر كابل USB (Type-C) أو زوّد البلوتوث ثم زوّج الجهاز في Windows.' : 'Connect to PC via USB (Type-C) cable or enable Bluetooth and pair the device in Windows.'}</li>
                      <li>{isAr ? 'في إدارة الأجهزة تحقق من ظهور منفذ COM للجهاز (قد تحتاج تعريف من الشركة المصنعة).' : 'In Device Manager check that a COM port appears for the device (driver may be required).'}</li>
                      <li>{isAr ? 'في تطبيق Desktop: الإعدادات ← RFID ← قارئ عبر منفذ تسلسلي: حدّث المنافذ، اختر المنفذ، جرّب السرعة 115200 أو 9600، ثم ابدأ القراءة.' : 'In Desktop app: Settings → RFID → Serial Port: refresh ports, select the port, try baud 115200 or 9600, then start reading.'}</li>
                    </ul>
                    <p className="text-xs text-amber-700">
                      {isAr ? 'الجهاز يدعم أيضاً وضع لوحة المفاتيح (Keyboard Wedge): إن كان مفعّلاً، القراءات تظهر تلقائياً دون اختيار COM.' : 'The device may also support Keyboard Wedge mode: if enabled, scans appear automatically without selecting COM.'}
                    </p>
                  </div>
                </CardHeader>
              </Card>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>{isAr ? 'نوع الجهاز' : 'Device Type'}</Label>
                  <select className="w-full p-2 border rounded-lg">
                    <option value="bx6100">BX6100 UHF RFID Handheld</option>
                    <option value="c6100">C6100 UHF RFID Handheld</option>
                    <option value="other">{isAr ? 'جهاز آخر' : 'Other Device'}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{isAr ? 'قوة الإشارة (dBm)' : 'Signal Power (dBm)'}</Label>
                  <Input type="number" defaultValue={30} min={0} max={33} />
                </div>
                <div className="space-y-2">
                  <Label>{isAr ? 'مهلة المسح (ثانية)' : 'Scan Timeout (seconds)'}</Label>
                  <Input type="number" defaultValue={3} min={1} max={30} />
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>C6100</strong>: {isAr ? 'يدعم بروتوكول EPC Class 1 Gen 2 / ISO 18000-6C' : 'Supports EPC Class 1 Gen 2 / ISO 18000-6C protocol'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{isAr ? 'الإعدادات العامة' : 'General Settings'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 pb-4 border-b">
                <Label>{isAr ? 'حول البرنامج' : 'About'}</Label>
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
                  <p className="font-semibold">ERP Desktop</p>
                  <p>{isAr ? 'الإصدار' : 'Version'}: {process.env.REACT_APP_VERSION || '0.1.0'}</p>
                  <p className="mt-2 text-gray-500">Copyright © 2025. {isAr ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'اللغة' : 'Language'}</Label>
                <div className="flex gap-2">
                  <Button variant={language === 'ar' ? 'default' : 'outline'} onClick={toggleLanguage} className="flex-1">
                    <Globe className="w-4 h-4 mr-2" />العربية
                  </Button>
                  <Button variant={language === 'en' ? 'default' : 'outline'} onClick={toggleLanguage} className="flex-1">
                    <Globe className="w-4 h-4 mr-2" />English
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'اسم الشركة' : 'Company Name'}</Label>
                <Input defaultValue={isAr ? 'شركتي' : 'My Company'} />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'العملة' : 'Currency'}</Label>
                <select className="w-full p-2 border rounded-lg">
                  <option value="USD">USD ($)</option>
                  <option value="SYP">SYP (ل.س)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="SAR">SAR (ر.س)</option>
                </select>
              </div>

              {isDesktop && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>{isAr ? 'نسخ احتياطي من التخزين المحلي (Desktop)' : 'Backup from local storage (Desktop)'}</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isBackupLoading}
                      onClick={async () => {
                        setIsBackupLoading(true);
                        try {
                          const storage = await getOfflineStorage();
                          const data = await storage.exportForBackup();
                          await window.erpDesktop.backupSave(data);
                          toast({ title: isAr ? 'تم إنشاء النسخة الاحتياطية' : 'Backup created' });
                        } catch (e) {
                          toast({ title: isAr ? 'فشل النسخ الاحتياطي' : 'Backup failed', variant: 'destructive' });
                        } finally {
                          setIsBackupLoading(false);
                        }
                      }}
                    >
                      {isBackupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4 mr-2" />}
                      {isAr ? 'نسخ احتياطي الآن' : 'Backup now'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isRestoreLoading}
                      onClick={async () => {
                        const filepath = await window.erpDesktop.backupChooseFile();
                        if (!filepath) return;
                        setIsRestoreLoading(true);
                        try {
                          const data = await window.erpDesktop.backupRestore(filepath);
                          const storage = await getOfflineStorage();
                          await storage.importFromBackup(data);
                          toast({ title: isAr ? 'تم استرجاع النسخة الاحتياطية' : 'Backup restored' });
                          loadOfflineStats();
                        } catch (e) {
                          toast({ title: isAr ? 'فشل الاسترجاع' : 'Restore failed', variant: 'destructive' });
                        } finally {
                          setIsRestoreLoading(false);
                        }
                      }}
                    >
                      {isRestoreLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderDown className="w-4 h-4 mr-2" />}
                      {isAr ? 'استرجاع من ملف' : 'Restore from file'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Logout Button */}
              <div className="pt-4 border-t mt-4">
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleLogout}
                  className="w-full"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {isAr ? 'تسجيل الخروج' : 'Logout'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} size="lg">
          <Save className="w-5 h-5 mr-2" />{isAr ? 'حفظ الإعدادات' : 'Save Settings'}
        </Button>
      </div>

      <ConfirmDialog
        open={restoreConfirmOpen}
        onOpenChange={(open) => { setRestoreConfirmOpen(open); if (!open) setPendingRestoreFile(null); }}
        title={isAr ? 'تأكيد الاستعادة' : 'Confirm Restore'}
        description={isAr ? 'استعادة البيانات ستستبدل البيانات الحالية للشركة. هل أنت متأكد؟' : 'Restoring will replace current company data. Are you sure?'}
        confirmLabel={isAr ? 'استعادة' : 'Restore'}
        cancelLabel={isAr ? 'إلغاء' : 'Cancel'}
        onConfirm={doRestoreBackup}
        variant="destructive"
      />
    </div>
  );
};

export default Settings;
