import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getOfflineStorage, STORES } from '../services/offlineStorage';
import { useAuth } from './AuthContext';

const OfflineContext = createContext();

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

export const OfflineProvider = ({ children }) => {
  const { tenant, isAuthenticated, tenantSettings } = useAuth();
  const [operationMode, setOperationMode] = useState(localStorage.getItem('operationMode') || 'online');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState({ 
    pendingCount: 0, 
    syncInProgress: false, 
    lastDownload: null,
    lastSync: null,
    tenantId: null 
  });
  const [storage, setStorage] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [syncProgress, setSyncProgress] = useState(null);
  const [offlineEnabled, setOfflineEnabled] = useState(false);
  const [offlineStats, setOfflineStats] = useState({ total: 0 });

  // Get current tenant ID
  const currentTenantId = tenant?.id || null;
  
  // Check if offline feature is enabled for this tenant
  const isOfflineFeatureEnabled = tenantSettings?.enabledFeatures?.offline !== false;

  // Initialize storage when tenant changes
  useEffect(() => {
    const initStorage = async () => {
      if (!currentTenantId) return;
      
      try {
        const offlineStorage = await getOfflineStorage();
        setStorage(offlineStorage);
        
        // Set tenant ID for data isolation
        offlineStorage.setTenantId(currentTenantId);
        
        // Add listener for storage events
        offlineStorage.addListener((event) => {
          if (event.event === 'online') {
            setIsOnline(true);
          } else if (event.event === 'offline') {
            setIsOnline(false);
          } else if (event.event === 'sync_started') {
            setSyncStatus(prev => ({ ...prev, syncInProgress: true }));
          } else if (event.event === 'sync_completed' || event.event === 'sync_error') {
            updateSyncStatus();
          }
        });

        // Get initial status
        await updateSyncStatus();
        
        // Check if offline data exists for this tenant
        const hasData = await offlineStorage.hasTenantData(currentTenantId);
        setOfflineEnabled(hasData);
        
        // Get stats
        const stats = await offlineStorage.getStatsForTenant(currentTenantId);
        setOfflineStats(stats);
        
      } catch (e) {
        console.error('Failed to initialize offline storage:', e);
      }
    };

    if (isAuthenticated && currentTenantId) {
      initStorage();
    }
  }, [currentTenantId, isAuthenticated]);

  // Auto-backup in Electron: once after load, then every 24h
  const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
  useEffect(() => {
    if (!storage || !currentTenantId || !window.erpDesktop?.backupSave) return;
    const run = async () => {
      try {
        const data = await storage.exportForBackup();
        await window.erpDesktop.backupSave(data);
      } catch (e) {
        console.warn('Auto-backup failed:', e);
      }
    };
    const t1 = setTimeout(run, 10000);
    const t2 = setInterval(run, AUTO_BACKUP_INTERVAL_MS);
    return () => {
      clearTimeout(t1);
      clearInterval(t2);
    };
  }, [storage, currentTenantId]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online if there are pending changes
      if (storage && syncStatus.pendingCount > 0 && isOfflineFeatureEnabled) {
        syncToServer();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [storage, syncStatus.pendingCount, isOfflineFeatureEnabled]);

  const updateSyncStatus = useCallback(async () => {
    if (!storage || !currentTenantId) return;
    
    try {
      const pendingCount = await storage.getPendingSyncCountForTenant(currentTenantId);
      const syncInfo = await storage.getLastSyncInfo(currentTenantId);
      const stats = await storage.getStatsForTenant(currentTenantId);
      
      setSyncStatus(prev => ({ 
        ...prev, 
        pendingCount,
        syncInProgress: false, 
        tenantId: currentTenantId,
        lastDownload: syncInfo.lastDownload,
        lastSync: syncInfo.lastSync,
        lastFullSync: syncInfo.lastFullSync
      }));
      
      setOfflineStats(stats);
      setOfflineEnabled(stats.total > 0);
    } catch (e) {
      console.error('Failed to update sync status:', e);
    }
  }, [storage, currentTenantId]);

  // Switch operation mode
  const switchMode = useCallback((mode) => {
    if (!isOfflineFeatureEnabled && mode === 'offline') {
      console.warn('Offline mode is not enabled for this tenant');
      return;
    }
    
    setOperationMode(mode);
    localStorage.setItem('operationMode', mode);
    
    // If switching to offline, ensure data is downloaded
    if (mode === 'offline' && !offlineEnabled && isOnline) {
      downloadForOffline();
    }
  }, [offlineEnabled, isOnline, isOfflineFeatureEnabled]);

  // Download data for offline use
  const downloadForOffline = useCallback(async () => {
    if (!storage || !isOnline || !currentTenantId) {
      return { downloaded: 0, total: 0 };
    }
    
    setDownloadProgress({ current: 0, total: 7, currentName: 'بدء التحميل...' });
    
    try {
      const result = await storage.downloadFromServerForTenant(
        (progress) => {
          setDownloadProgress(progress);
        }, 
        currentTenantId
      );
      
      setDownloadProgress(null);
      setOfflineEnabled(true);
      await updateSyncStatus();
      
      return result;
    } catch (e) {
      setDownloadProgress(null);
      throw e;
    }
  }, [storage, isOnline, updateSyncStatus, currentTenantId]);

  // Sync pending changes to server
  const syncToServer = useCallback(async () => {
    if (!storage || !isOnline || !currentTenantId) {
      return { synced: 0, failed: 0 };
    }
    
    setSyncStatus(prev => ({ ...prev, syncInProgress: true }));
    const result = await storage.syncToServerForTenant(currentTenantId);
    
    await updateSyncStatus();
    return result;
  }, [storage, isOnline, updateSyncStatus, currentTenantId]);

  // Full sync (upload + download)
  const fullSync = useCallback(async () => {
    if (!storage || !isOnline || !currentTenantId) {
      throw new Error('Cannot sync: offline or no tenant');
    }
    
    setSyncProgress({ phase: 'starting', current: 0, total: 1, currentName: 'بدء المزامنة...' });
    
    try {
      const result = await storage.fullSyncForTenant(
        currentTenantId,
        (progress) => {
          setSyncProgress(progress);
        }
      );
      
      setSyncProgress(null);
      setOfflineEnabled(true);
      await updateSyncStatus();
      
      return result;
    } catch (e) {
      setSyncProgress(null);
      throw e;
    }
  }, [storage, isOnline, updateSyncStatus, currentTenantId]);

  // Clear offline data for current tenant
  const clearOfflineData = useCallback(async () => {
    if (!storage || !currentTenantId) return;
    await storage.clearTenantData(currentTenantId);
    setOfflineEnabled(false);
    setOfflineStats({ total: 0 });
    await updateSyncStatus();
  }, [storage, updateSyncStatus, currentTenantId]);

  // Get offline statistics
  const getOfflineStats = useCallback(async () => {
    if (!storage || !currentTenantId) {
      return { products: 0, customers: 0, invoices: 0, total: 0 };
    }
    return storage.getStatsForTenant(currentTenantId);
  }, [storage, currentTenantId]);

  // Get last download/sync timestamps
  const getLastActivity = useCallback(async () => {
    if (!storage || !currentTenantId) {
      return { lastDownload: null, lastSync: null };
    }
    return storage.getLastSyncInfo(currentTenantId);
  }, [storage, currentTenantId]);

  // Check if data is stale
  const checkDataFreshness = useCallback(async (maxAgeHours = 24) => {
    if (!storage || !currentTenantId) return true;
    return storage.isDataStale(currentTenantId, maxAgeHours);
  }, [storage, currentTenantId]);

  // Auto-sync every hour when online
  useEffect(() => {
    if (!isOnline || !offlineEnabled || !isOfflineFeatureEnabled || !currentTenantId) {
      return;
    }

    const AUTO_SYNC_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

    const autoSync = async () => {
      // Only sync if online and not already syncing
      if (!navigator.onLine || syncStatus.syncInProgress) {
        return;
      }
      
      try {
        console.log('[Auto-Sync] Starting automatic sync...');
        await fullSync();
        console.log('[Auto-Sync] Completed successfully');
      } catch (error) {
        // Silent fail - don't show errors for auto-sync
        console.log('[Auto-Sync] Failed silently:', error.message);
      }
    };

    // Set up interval for auto-sync
    const intervalId = setInterval(autoSync, AUTO_SYNC_INTERVAL);

    // Cleanup on unmount or when dependencies change
    return () => {
      clearInterval(intervalId);
    };
  }, [isOnline, offlineEnabled, isOfflineFeatureEnabled, currentTenantId, syncStatus.syncInProgress]);

  // Check if should use offline mode
  const shouldUseOffline = (operationMode === 'offline' || !isOnline) && offlineEnabled && isOfflineFeatureEnabled;

  const value = {
    operationMode,
    switchMode,
    isOnline,
    shouldUseOffline,
    offlineEnabled,
    isOfflineFeatureEnabled,
    syncStatus,
    downloadProgress,
    syncProgress,
    offlineStats,
    downloadForOffline,
    syncToServer,
    fullSync,
    clearOfflineData,
    getOfflineStats,
    getLastActivity,
    checkDataFreshness,
    storage,
    currentTenantId
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export default OfflineContext;
