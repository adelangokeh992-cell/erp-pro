/**
 * Offline Storage Service - Multi-Tenant Implementation
 * 
 * Uses IndexedDB for complete offline data storage
 * Full multi-tenant data isolation and sync support
 * 
 * Key Features:
 * - Tenant-specific data partitioning
 * - Conflict resolution with server priority
 * - Background sync when online
 * - Storage cleanup for old tenants
 */

const DB_NAME = 'erp_offline_db';
const DB_VERSION = 4;

// Get current tenant from localStorage
const getCurrentTenantId = () => {
  try {
    const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
    return tenant.id || null;
  } catch {
    return null;
  }
};

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Store names for all data types
const STORES = {
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  SUPPLIERS: 'suppliers',
  INVOICES: 'invoices',
  PURCHASES: 'purchases',
  USERS: 'users',
  WAREHOUSES: 'warehouses',
  EXPENSES: 'expenses',
  ACCOUNTS: 'accounts',
  JOURNAL_ENTRIES: 'journal_entries',
  ESL_DEVICES: 'esl_devices',
  SYNC_QUEUE: 'sync_queue',
  SETTINGS: 'settings',
  CACHE: 'cache',
  TENANT_META: 'tenant_meta' // Metadata per tenant
};

// API endpoint mapping
const STORE_ENDPOINTS = {
  [STORES.PRODUCTS]: '/products',
  [STORES.CUSTOMERS]: '/customers',
  [STORES.SUPPLIERS]: '/suppliers',
  [STORES.INVOICES]: '/invoices',
  [STORES.PURCHASES]: '/purchases',
  [STORES.USERS]: '/users',
  [STORES.WAREHOUSES]: '/warehouses',
  [STORES.EXPENSES]: '/accounting/expenses',
  [STORES.ACCOUNTS]: '/accounting/accounts',
  [STORES.JOURNAL_ENTRIES]: '/accounting/journal-entries',
  [STORES.ESL_DEVICES]: '/esl/devices'
};

// Collections to sync for offline mode
const OFFLINE_COLLECTIONS = [
  { store: STORES.PRODUCTS, endpoint: '/products', name: 'المنتجات', nameEn: 'Products' },
  { store: STORES.CUSTOMERS, endpoint: '/customers', name: 'العملاء', nameEn: 'Customers' },
  { store: STORES.SUPPLIERS, endpoint: '/suppliers', name: 'الموردين', nameEn: 'Suppliers' },
  { store: STORES.INVOICES, endpoint: '/invoices', name: 'الفواتير', nameEn: 'Invoices' },
  { store: STORES.PURCHASES, endpoint: '/purchases', name: 'المشتريات', nameEn: 'Purchases' },
  { store: STORES.WAREHOUSES, endpoint: '/warehouses', name: 'المستودعات', nameEn: 'Warehouses' },
  { store: STORES.USERS, endpoint: '/users', name: 'المستخدمين', nameEn: 'Users' }
];

class OfflineStorage {
  constructor() {
    this.db = null;
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.listeners = new Set();
    this.initialized = false;
    this.currentTenantId = null;

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  // Initialize database
  async init() {
    if (this.initialized && this.db) return this.db;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create all object stores
        Object.values(STORES).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: '_id', autoIncrement: false });
            
            // Add indexes based on store type
            switch(storeName) {
              case STORES.PRODUCTS:
                store.createIndex('sku', 'sku', { unique: false });
                store.createIndex('rfidTag', 'rfidTag', { unique: false });
                store.createIndex('barcode', 'barcode', { unique: false });
                store.createIndex('name', 'name', { unique: false });
                store.createIndex('tenantId', 'tenantId', { unique: false });
                break;
              case STORES.CUSTOMERS:
              case STORES.SUPPLIERS:
                store.createIndex('phone', 'phone', { unique: false });
                store.createIndex('name', 'name', { unique: false });
                store.createIndex('tenantId', 'tenantId', { unique: false });
                break;
              case STORES.INVOICES:
                store.createIndex('invoiceNumber', 'invoiceNumber', { unique: false });
                store.createIndex('customerId', 'customerId', { unique: false });
                store.createIndex('status', 'status', { unique: false });
                store.createIndex('tenantId', 'tenantId', { unique: false });
                break;
              case STORES.PURCHASES:
                store.createIndex('purchaseNumber', 'purchaseNumber', { unique: false });
                store.createIndex('supplierId', 'supplierId', { unique: false });
                store.createIndex('tenantId', 'tenantId', { unique: false });
                break;
              case STORES.USERS:
                store.createIndex('username', 'username', { unique: false });
                store.createIndex('role', 'role', { unique: false });
                store.createIndex('tenantId', 'tenantId', { unique: false });
                break;
              case STORES.WAREHOUSES:
                store.createIndex('code', 'code', { unique: false });
                store.createIndex('tenantId', 'tenantId', { unique: false });
                break;
              case STORES.SYNC_QUEUE:
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('synced', 'synced', { unique: false });
                store.createIndex('storeName', 'storeName', { unique: false });
                store.createIndex('tenantId', 'tenantId', { unique: false });
                break;
              case STORES.TENANT_META:
                store.createIndex('tenantId', 'tenantId', { unique: true });
                break;
              case STORES.CACHE:
                store.createIndex('key', 'key', { unique: false });
                store.createIndex('expiry', 'expiry', { unique: false });
                break;
              default:
                break;
            }
          }
        });
      };
    });
  }

  // Ensure DB is initialized
  async ensureInit() {
    if (!this.db) {
      await this.init();
    }
    return this.db;
  }

  // Add listener for events
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(cb => {
      try {
        cb({ event, data });
      } catch(e) {
        console.error('Listener error:', e);
      }
    });
  }

  handleOnline() {
    this.isOnline = true;
    this.notifyListeners('online', { status: 'online' });
    // Auto-sync when coming online
    this.syncToServer();
  }

  handleOffline() {
    this.isOnline = false;
    this.notifyListeners('offline', { status: 'offline' });
  }

  // ==================== CRUD Operations ====================

  // Get all items from a store
  async getAll(storeName) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  // Get item by ID
  async getById(storeName, id) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // Search by index
  async getByIndex(storeName, indexName, value) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  // Add or update item (for offline operations)
  async save(storeName, item, addToQueue = true) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Generate local ID if not exists
      if (!item._id) {
        item._id = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        item._isNew = true;
      }
      
      item._updatedAt = new Date().toISOString();
      item._synced = false;

      const request = store.put(item);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        // Add to sync queue
        if (addToQueue) {
          this.addToSyncQueue(storeName, item._isNew ? 'create' : 'update', item);
        }
        resolve(item);
      };
    });
  }

  // Delete item
  async delete(storeName, id, addToQueue = true) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        // Add to sync queue only if it's a server item
        if (addToQueue && !id.toString().startsWith('local_')) {
          this.addToSyncQueue(storeName, 'delete', { _id: id });
        }
        resolve(true);
      };
    });
  }

  // ==================== Sync Queue ====================

  async addToSyncQueue(storeName, action, data) {
    await this.ensureInit();
    const queueItem = {
      _id: 'queue_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      storeName,
      action,
      data: JSON.parse(JSON.stringify(data)), // Deep copy
      timestamp: new Date().toISOString(),
      synced: false,
      retries: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.add(queueItem);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.notifyListeners('queue_updated', { pending: 1 });
        resolve(queueItem);
      };
    });
  }

  async getPendingSyncItems() {
    const all = await this.getAll(STORES.SYNC_QUEUE);
    return all.filter(item => !item.synced && item.retries < 5);
  }

  // ==================== Sync Operations ====================

  async syncToServer() {
    if (!this.isOnline || this.syncInProgress) return { synced: 0, failed: 0 };

    this.syncInProgress = true;
    this.notifyListeners('sync_started', { status: 'syncing' });

    const API = process.env.REACT_APP_BACKEND_URL + '/api';
    let synced = 0;
    let failed = 0;

    try {
      const pendingItems = await this.getPendingSyncItems();
      
      // Sort by timestamp to maintain order
      pendingItems.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      for (const item of pendingItems) {
        try {
          const endpoint = STORE_ENDPOINTS[item.storeName];
          if (!endpoint) continue;

          const data = { ...item.data };
          delete data._synced;
          delete data._updatedAt;
          delete data._isNew;

          let response;
          
          if (item.action === 'create') {
            const isLocalId = data._id && data._id.toString().startsWith('local_');
            if (isLocalId) delete data._id;
            
            response = await fetch(`${API}${endpoint}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            
            if (response.ok) {
              const serverData = await response.json();
              // Update local record with server ID
              if (isLocalId && serverData._id) {
                await this.delete(item.storeName, item.data._id, false);
                serverData._synced = true;
                await this.save(item.storeName, serverData, false);
              }
            }
          } else if (item.action === 'update') {
            response = await fetch(`${API}${endpoint}/${data._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
          } else if (item.action === 'delete') {
            response = await fetch(`${API}${endpoint}/${data._id}`, {
              method: 'DELETE'
            });
          }

          if (response && response.ok) {
            await this.markAsSynced(item._id);
            synced++;
          } else {
            throw new Error(`HTTP ${response?.status || 'unknown'}`);
          }
        } catch (error) {
          console.error('Sync item error:', error);
          await this.incrementRetry(item._id);
          failed++;
        }
      }

      this.notifyListeners('sync_completed', { synced, failed });
    } catch (error) {
      this.notifyListeners('sync_error', { error: error.message });
    } finally {
      this.syncInProgress = false;
    }

    return { synced, failed };
  }

  async markAsSynced(id) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.get(id);

      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          item.synced = true;
          item.syncedAt = new Date().toISOString();
          store.put(item);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async incrementRetry(id) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.get(id);

      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          item.retries = (item.retries || 0) + 1;
          item.lastRetry = new Date().toISOString();
          store.put(item);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== Download from Server ====================

  async downloadFromServer(progressCallback) {
    if (!this.isOnline) {
      throw new Error('Cannot download while offline');
    }

    const API = process.env.REACT_APP_BACKEND_URL + '/api';
    this.notifyListeners('download_started', { status: 'downloading' });

    const collections = [
      { store: STORES.PRODUCTS, endpoint: '/products', name: 'Products' },
      { store: STORES.CUSTOMERS, endpoint: '/customers', name: 'Customers' },
      { store: STORES.SUPPLIERS, endpoint: '/suppliers', name: 'Suppliers' },
      { store: STORES.INVOICES, endpoint: '/invoices', name: 'Invoices' },
      { store: STORES.PURCHASES, endpoint: '/purchases', name: 'Purchases' },
      { store: STORES.WAREHOUSES, endpoint: '/warehouses', name: 'Warehouses' },
      { store: STORES.EXPENSES, endpoint: '/accounting/expenses', name: 'Expenses' },
      { store: STORES.ACCOUNTS, endpoint: '/accounting/accounts', name: 'Accounts' }
    ];

    let downloaded = 0;
    const total = collections.length;

    try {
      for (const { store, endpoint, name } of collections) {
        try {
          if (progressCallback) {
            progressCallback({ current: downloaded, total, currentName: name });
          }
          
          const response = await fetch(`${API}${endpoint}`);
          if (response.ok) {
            const data = await response.json();
            await this.bulkSave(store, Array.isArray(data) ? data : []);
            downloaded++;
          }
        } catch (e) {
          console.error(`Failed to download ${name}:`, e);
        }
      }

      // Save download timestamp
      await this.saveSetting('lastDownload', new Date().toISOString());
      
      this.notifyListeners('download_completed', { 
        status: 'completed', 
        downloaded,
        total 
      });
      
      return { downloaded, total };
    } catch (error) {
      this.notifyListeners('download_error', { error: error.message });
      throw error;
    }
  }

  // Bulk save items (replaces existing data)
  async bulkSave(storeName, items) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      // Clear existing
      store.clear();

      // Add all items
      items.forEach(item => {
        if (item._id) {
          item._synced = true;
          store.add(item);
        }
      });

      transaction.oncomplete = () => resolve(items.length);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ==================== Status & Settings ====================

  async getSyncStatus() {
    const pending = await this.getPendingSyncItems();
    const lastDownload = await this.getSetting('lastDownload');
    
    return {
      isOnline: this.isOnline,
      pendingCount: pending.length,
      syncInProgress: this.syncInProgress,
      lastDownload: lastDownload
    };
  }

  async saveSetting(key, value) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORES.SETTINGS, 'readwrite');
      const store = transaction.objectStore(STORES.SETTINGS);
      const request = store.put({ _id: key, value, updatedAt: new Date().toISOString() });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getSetting(key) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORES.SETTINGS, 'readonly');
      const store = transaction.objectStore(STORES.SETTINGS);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.value || null);
    });
  }

  // Clear all offline data
  async clearAll() {
    await this.ensureInit();
    const stores = Object.values(STORES);
    
    for (const storeName of stores) {
      await new Promise((resolve, reject) => {
        const transaction = this.db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }
    
    this.notifyListeners('data_cleared', { status: 'cleared' });
  }

  // Get store statistics
  async getStats(tenantId = null) {
    await this.ensureInit();
    const stats = { total: 0 };
    
    for (const [key, storeName] of Object.entries(STORES)) {
      if (storeName !== STORES.SYNC_QUEUE && storeName !== STORES.SETTINGS && storeName !== STORES.CACHE) {
        let items = await this.getAll(storeName);
        
        // Filter by tenant if provided
        if (tenantId && this.currentTenantId) {
          items = items.filter(item => 
            item.tenantId === tenantId || 
            item.tenantId === this.currentTenantId ||
            !item.tenantId
          );
        }
        
        stats[key.toLowerCase()] = items.length;
        stats.total += items.length;
      }
    }
    
    return stats;
  }

  // Set current tenant ID for data isolation
  setTenantId(tenantId) {
    this.currentTenantId = tenantId;
  }

  // Get all items filtered by tenant
  async getAllForTenant(storeName, tenantId = null) {
    const all = await this.getAll(storeName);
    const filterTenantId = tenantId || this.currentTenantId;
    
    if (!filterTenantId) return all;
    
    return all.filter(item => 
      item.tenantId === filterTenantId || 
      !item.tenantId
    );
  }

  // Clear data for a specific tenant
  async clearTenantData(tenantId) {
    await this.ensureInit();
    const stores = Object.values(STORES);
    
    for (const storeName of stores) {
      if (storeName === STORES.SETTINGS || storeName === STORES.CACHE) continue;
      
      const items = await this.getAll(storeName);
      const toDelete = items.filter(item => item.tenantId === tenantId);
      
      for (const item of toDelete) {
        await this.delete(storeName, item._id, false);
      }
    }
    
    this.notifyListeners('tenant_data_cleared', { tenantId });
  }

  // Download data with tenant filter
  async downloadFromServerForTenant(progressCallback, tenantId) {
    if (!this.isOnline) {
      throw new Error('Cannot download while offline');
    }

    const API = process.env.REACT_APP_BACKEND_URL + '/api';
    const token = localStorage.getItem('token');
    
    this.notifyListeners('download_started', { status: 'downloading', tenantId });

    const collections = [
      { store: STORES.PRODUCTS, endpoint: '/products', name: 'المنتجات' },
      { store: STORES.CUSTOMERS, endpoint: '/customers', name: 'العملاء' },
      { store: STORES.SUPPLIERS, endpoint: '/suppliers', name: 'الموردين' },
      { store: STORES.INVOICES, endpoint: '/invoices', name: 'الفواتير' },
      { store: STORES.PURCHASES, endpoint: '/purchases', name: 'المشتريات' },
      { store: STORES.WAREHOUSES, endpoint: '/warehouses', name: 'المستودعات' },
      { store: STORES.USERS, endpoint: '/users', name: 'المستخدمين' }
    ];

    let downloaded = 0;
    const total = collections.length;

    try {
      for (const { store, endpoint, name } of collections) {
        try {
          if (progressCallback) {
            progressCallback({ current: downloaded, total, currentName: name });
          }
          
          const headers = { 'Content-Type': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await fetch(`${API}${endpoint}`, { headers });
          if (response.ok) {
            let data = await response.json();
            
            // Add tenant ID to items if not present
            if (Array.isArray(data)) {
              data = data.map(item => ({
                ...item,
                tenantId: item.tenantId || tenantId
              }));
            }
            
            await this.bulkSaveForTenant(store, Array.isArray(data) ? data : [], tenantId);
            downloaded++;
          }
        } catch (e) {
          console.error(`Failed to download ${name}:`, e);
        }
      }

      // Save download timestamp for tenant
      await this.saveSetting(`lastDownload_${tenantId}`, new Date().toISOString());
      
      // Report sync to server (for Super Admin visibility)
      await this.reportSyncToServer(tenantId);
      
      this.notifyListeners('download_completed', { 
        status: 'completed', 
        downloaded,
        total,
        tenantId 
      });
      
      return { downloaded, total };
    } catch (error) {
      this.notifyListeners('download_error', { error: error.message, tenantId });
      throw error;
    }
  }

  // Bulk save with tenant isolation
  async bulkSaveForTenant(storeName, items, tenantId) {
    await this.ensureInit();
    
    // First, get existing items for this tenant (before starting new transaction)
    const existing = await this.getAll(storeName);
    const toDeleteIds = existing
      .filter(item => item.tenantId === tenantId)
      .map(item => item._id);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      // Delete existing items for this tenant
      for (const id of toDeleteIds) {
        try {
          store.delete(id);
        } catch (e) {
          console.warn('Failed to delete item:', id, e);
        }
      }

      // Add all new items
      items.forEach(item => {
        if (item._id) {
          const itemToSave = {
            ...item,
            _synced: true,
            tenantId: item.tenantId || tenantId
          };
          try {
            store.put(itemToSave);
          } catch (e) {
            console.warn('Failed to save item:', item._id, e);
          }
        }
      });

      transaction.oncomplete = () => resolve(items.length);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Sync with tenant context
  async syncToServerForTenant(tenantId) {
    if (!this.isOnline || this.syncInProgress) return { synced: 0, failed: 0 };

    this.syncInProgress = true;
    this.notifyListeners('sync_started', { status: 'syncing', tenantId });

    const API = process.env.REACT_APP_BACKEND_URL + '/api';
    const token = localStorage.getItem('token');
    let synced = 0;
    let failed = 0;

    try {
      let pendingItems = await this.getPendingSyncItems();
      
      // Filter by tenant if provided
      if (tenantId) {
        pendingItems = pendingItems.filter(item => 
          item.data.tenantId === tenantId || !item.data.tenantId
        );
      }
      
      // Sort by timestamp to maintain order
      pendingItems.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      for (const item of pendingItems) {
        try {
          const endpoint = STORE_ENDPOINTS[item.storeName];
          if (!endpoint) continue;

          const data = { ...item.data };
          delete data._synced;
          delete data._updatedAt;
          delete data._isNew;

          const headers = { 'Content-Type': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          let response;
          
          if (item.action === 'create') {
            const isLocalId = data._id && data._id.toString().startsWith('local_');
            if (isLocalId) delete data._id;
            
            response = await fetch(`${API}${endpoint}`, {
              method: 'POST',
              headers,
              body: JSON.stringify(data)
            });
            
            if (response.ok) {
              const serverData = await response.json();
              if (isLocalId && serverData._id) {
                await this.delete(item.storeName, item.data._id, false);
                serverData._synced = true;
                await this.save(item.storeName, serverData, false);
              }
            }
          } else if (item.action === 'update') {
            response = await fetch(`${API}${endpoint}/${data._id}`, {
              method: 'PUT',
              headers,
              body: JSON.stringify(data)
            });
          } else if (item.action === 'delete') {
            response = await fetch(`${API}${endpoint}/${data._id}`, {
              method: 'DELETE',
              headers
            });
          }

          if (response && response.ok) {
            await this.markAsSynced(item._id);
            synced++;
          } else {
            throw new Error(`HTTP ${response?.status || 'unknown'}`);
          }
        } catch (error) {
          console.error('Sync item error:', error);
          await this.incrementRetry(item._id);
          failed++;
        }
      }

      // Save sync timestamp for tenant
      await this.saveSetting(`lastSync_${tenantId}`, new Date().toISOString());
      
      this.notifyListeners('sync_completed', { synced, failed, tenantId });
    } catch (error) {
      this.notifyListeners('sync_error', { error: error.message, tenantId });
    } finally {
      this.syncInProgress = false;
    }

    return { synced, failed };
  }

  // ==================== Enhanced Multi-Tenant Methods ====================

  // Save tenant metadata
  async saveTenantMeta(tenantId, meta) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORES.TENANT_META, 'readwrite');
      const store = transaction.objectStore(STORES.TENANT_META);
      const request = store.put({
        _id: `meta_${tenantId}`,
        tenantId,
        ...meta,
        updatedAt: new Date().toISOString()
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Get tenant metadata
  async getTenantMeta(tenantId) {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORES.TENANT_META, 'readonly');
      const store = transaction.objectStore(STORES.TENANT_META);
      const request = store.get(`meta_${tenantId}`);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  // Check if tenant has offline data
  async hasTenantData(tenantId) {
    const stats = await this.getStatsForTenant(tenantId);
    return stats.total > 0;
  }

  // Get statistics for specific tenant
  async getStatsForTenant(tenantId) {
    await this.ensureInit();
    const stats = { total: 0 };
    const targetTenantId = tenantId || this.currentTenantId;
    
    for (const [key, storeName] of Object.entries(STORES)) {
      if ([STORES.SYNC_QUEUE, STORES.SETTINGS, STORES.CACHE, STORES.TENANT_META].includes(storeName)) {
        continue;
      }
      
      const items = await this.getAll(storeName);
      const tenantItems = items.filter(item => item.tenantId === targetTenantId);
      
      stats[key.toLowerCase()] = tenantItems.length;
      stats.total += tenantItems.length;
    }
    
    return stats;
  }

  // Get pending sync count for tenant
  async getPendingSyncCountForTenant(tenantId) {
    const all = await this.getAll(STORES.SYNC_QUEUE);
    const pending = all.filter(item => 
      !item.synced && 
      item.retries < 5 &&
      (item.tenantId === tenantId || item.data?.tenantId === tenantId)
    );
    return pending.length;
  }

  // Full sync operation: Download from server + Push local changes
  async fullSyncForTenant(tenantId, progressCallback) {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    const targetTenantId = tenantId || this.currentTenantId;
    if (!targetTenantId) {
      throw new Error('No tenant ID provided');
    }

    this.syncInProgress = true;
    this.notifyListeners('sync_started', { status: 'syncing', tenantId: targetTenantId });

    try {
      // Step 1: Push local changes to server
      if (progressCallback) {
        progressCallback({ phase: 'upload', current: 0, total: 1, currentName: 'رفع التغييرات المحلية' });
      }
      
      const uploadResult = await this.syncToServerForTenant(targetTenantId);
      
      // Step 2: Download fresh data from server
      const downloadResult = await this.downloadFromServerForTenant(
        (progress) => {
          if (progressCallback) {
            progressCallback({ 
              phase: 'download', 
              current: progress.current, 
              total: progress.total, 
              currentName: progress.currentName 
            });
          }
        },
        targetTenantId
      );

      // Step 3: Save metadata locally
      await this.saveTenantMeta(targetTenantId, {
        lastFullSync: new Date().toISOString(),
        itemsDownloaded: downloadResult.downloaded,
        itemsUploaded: uploadResult.synced
      });

      // Step 4: Report sync to server (for Super Admin visibility)
      await this.reportSyncToServer(targetTenantId);

      this.notifyListeners('sync_completed', {
        status: 'completed',
        tenantId: targetTenantId,
        uploaded: uploadResult.synced,
        downloaded: downloadResult.downloaded
      });

      return {
        success: true,
        uploaded: uploadResult.synced,
        uploadFailed: uploadResult.failed,
        downloaded: downloadResult.downloaded
      };

    } catch (error) {
      this.notifyListeners('sync_error', { error: error.message, tenantId: targetTenantId });
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Get last sync info for tenant
  async getLastSyncInfo(tenantId) {
    const targetTenantId = tenantId || this.currentTenantId;
    const meta = await this.getTenantMeta(targetTenantId);
    const lastDownload = await this.getSetting(`lastDownload_${targetTenantId}`);
    const lastSync = await this.getSetting(`lastSync_${targetTenantId}`);
    
    return {
      lastFullSync: meta?.lastFullSync || null,
      lastDownload,
      lastSync,
      itemsDownloaded: meta?.itemsDownloaded || 0,
      itemsUploaded: meta?.itemsUploaded || 0
    };
  }

  // Report sync time to server (for Super Admin visibility)
  async reportSyncToServer(tenantId) {
    const API = process.env.REACT_APP_BACKEND_URL + '/api';
    const token = getAuthToken();
    
    if (!token) return;
    
    try {
      await fetch(`${API}/tenants/${tenantId}/sync-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lastSync: new Date().toISOString(),
          deviceInfo: navigator.userAgent
        })
      });
    } catch (error) {
      // Silent fail - this is not critical
      console.log('[Sync Report] Failed to report sync to server:', error.message);
    }
  }

  // Check if data is stale (older than specified hours)
  async isDataStale(tenantId, maxAgeHours = 24) {
    const syncInfo = await this.getLastSyncInfo(tenantId);
    if (!syncInfo.lastFullSync && !syncInfo.lastDownload) {
      return true;
    }
    
    const lastUpdate = new Date(syncInfo.lastFullSync || syncInfo.lastDownload);
    const now = new Date();
    const hoursDiff = (now - lastUpdate) / (1000 * 60 * 60);
    
    return hoursDiff > maxAgeHours;
  }

  /** Export all stores for backup (JSON-serializable). */
  async exportForBackup() {
    if (!this.db) await this.init();
    const stores = {};
    for (const storeName of Object.values(STORES)) {
      try {
        stores[storeName] = await this.getAll(storeName);
      } catch {
        stores[storeName] = [];
      }
    }
    return {
      version: 1,
      exportDate: new Date().toISOString(),
      tenantId: this.currentTenantId,
      stores,
    };
  }

  /** Import from backup data (replaces current data per store). */
  async importFromBackup(data) {
    if (!data || !data.stores || !this.db) return;
    for (const [storeName, items] of Object.entries(data.stores)) {
      if (!this.db.objectStoreNames.contains(storeName) || !Array.isArray(items)) continue;
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();
      for (const item of items) {
        if (item && item._id != null) store.put(item);
      }
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  }
}

// Singleton instance
let storageInstance = null;

export const getOfflineStorage = async () => {
  if (!storageInstance) {
    storageInstance = new OfflineStorage();
    await storageInstance.init();
  }
  return storageInstance;
};

export { STORES, STORE_ENDPOINTS, OFFLINE_COLLECTIONS };
export default OfflineStorage;
