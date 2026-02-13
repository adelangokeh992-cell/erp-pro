import axios from 'axios';
import { getOfflineStorage, STORES } from './offlineStorage';

// في التطوير: عنوان نسبي حتى تمر الطلبات عبر الـ proxy (بدون اتصال مباشر من المتصفح إلى 8001)
const isDev = process.env.NODE_ENV === 'development';
const BACKEND_URL = isDev ? '' : (process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8002');
const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

// Add token to all requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Store name mapping
const API_STORE_MAP = {
  products: STORES.PRODUCTS,
  customers: STORES.CUSTOMERS,
  suppliers: STORES.SUPPLIERS,
  invoices: STORES.INVOICES,
  purchases: STORES.PURCHASES,
  users: STORES.USERS,
  warehouses: STORES.WAREHOUSES,
  expenses: STORES.EXPENSES,
  accounts: STORES.ACCOUNTS,
  'journal-entries': STORES.JOURNAL_ENTRIES,
  'esl-devices': STORES.ESL_DEVICES
};

// Check if offline mode is active
const isOfflineMode = () => {
  return localStorage.getItem('operationMode') === 'offline' || !navigator.onLine;
};

// Create offline-aware API method
const createOfflineMethod = (storeName, method, endpoint) => {
  return async (...args) => {
    const store = API_STORE_MAP[storeName];
    
    if (isOfflineMode() && store) {
      const storage = await getOfflineStorage();
      
      switch (method) {
        case 'getAll':
          const items = await storage.getAll(store);
          return { data: items };
          
        case 'getById':
          const item = await storage.getById(store, args[0]);
          if (!item) throw new Error('Not found');
          return { data: item };
          
        case 'create':
          const newItem = await storage.save(store, args[0]);
          return { data: newItem };
          
        case 'update':
          const existingItem = await storage.getById(store, args[0]);
          if (!existingItem) throw new Error('Not found');
          const updatedItem = await storage.save(store, { ...existingItem, ...args[1], _id: args[0] });
          return { data: updatedItem };
          
        case 'delete':
          await storage.delete(store, args[0]);
          return { data: null };
          
        default:
          throw new Error('Operation not supported offline');
      }
    }
    
    // Online mode - use axios
    switch (method) {
      case 'getAll':
        return axios.get(endpoint);
      case 'getById':
        return axios.get(`${endpoint}/${args[0]}`);
      case 'create':
        return axios.post(endpoint, args[0]);
      case 'update':
        return axios.put(`${endpoint}/${args[0]}`, args[1]);
      case 'delete':
        return axios.delete(`${endpoint}/${args[0]}`);
      default:
        return axios.get(endpoint);
    }
  };
};

// Products API
export const productsAPI = {
  getAll: createOfflineMethod('products', 'getAll', `${API}/products`),
  getById: createOfflineMethod('products', 'getById', `${API}/products`),
  create: createOfflineMethod('products', 'create', `${API}/products`),
  update: createOfflineMethod('products', 'update', `${API}/products`),
  delete: createOfflineMethod('products', 'delete', `${API}/products`),
  // Special methods that only work online
  getByRFID: async (tag) => {
    if (isOfflineMode()) {
      const storage = await getOfflineStorage();
      const items = await storage.getByIndex(STORES.PRODUCTS, 'rfidTag', tag);
      return { data: items[0] || null };
    }
    return axios.get(`${API}/products/rfid/${tag}`);
  },
  getByBarcode: async (code) => {
    if (isOfflineMode()) {
      const storage = await getOfflineStorage();
      const items = await storage.getByIndex(STORES.PRODUCTS, 'barcode', code);
      return { data: items[0] || null };
    }
    return axios.get(`${API}/products/barcode/${code}`);
  },
  getLowStock: async () => {
    if (isOfflineMode()) {
      const storage = await getOfflineStorage();
      const items = await storage.getAll(STORES.PRODUCTS);
      const lowStock = items.filter(p => (p.stock || 0) < (p.minStock || 10));
      return { data: lowStock };
    }
    return axios.get(`${API}/products/search/low-stock`);
  },
};

// Customers API
export const customersAPI = {
  getAll: createOfflineMethod('customers', 'getAll', `${API}/customers`),
  getById: createOfflineMethod('customers', 'getById', `${API}/customers`),
  create: createOfflineMethod('customers', 'create', `${API}/customers`),
  update: createOfflineMethod('customers', 'update', `${API}/customers`),
  delete: createOfflineMethod('customers', 'delete', `${API}/customers`),
};

// Suppliers API
export const suppliersAPI = {
  getAll: createOfflineMethod('suppliers', 'getAll', `${API}/suppliers`),
  getById: createOfflineMethod('suppliers', 'getById', `${API}/suppliers`),
  create: createOfflineMethod('suppliers', 'create', `${API}/suppliers`),
  update: createOfflineMethod('suppliers', 'update', `${API}/suppliers`),
  delete: createOfflineMethod('suppliers', 'delete', `${API}/suppliers`),
};

// Invoices API
export const invoicesAPI = {
  getAll: createOfflineMethod('invoices', 'getAll', `${API}/invoices`),
  getById: createOfflineMethod('invoices', 'getById', `${API}/invoices`),
  create: async (data) => {
    if (isOfflineMode()) {
      const storage = await getOfflineStorage();
      // Generate invoice number locally
      const invoices = await storage.getAll(STORES.INVOICES);
      const invoiceNumber = `OFF-${String(invoices.length + 1).padStart(4, '0')}`;
      const newInvoice = {
        ...data,
        invoiceNumber,
        date: data.date || new Date().toISOString(),
        dueDate: data.dueDate || new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      const saved = await storage.save(STORES.INVOICES, newInvoice);
      
      // Update product stock locally
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          if (item.productId) {
            const product = await storage.getById(STORES.PRODUCTS, item.productId);
            if (product) {
              product.stock = (product.stock || 0) - item.quantity;
              await storage.save(STORES.PRODUCTS, product, false); // Don't add to sync queue
            }
          }
        }
      }
      
      return { data: saved };
    }
    return axios.post(`${API}/invoices`, data);
  },
  update: createOfflineMethod('invoices', 'update', `${API}/invoices`),
  delete: createOfflineMethod('invoices', 'delete', `${API}/invoices`),
};

// Purchases API
export const purchasesAPI = {
  getAll: createOfflineMethod('purchases', 'getAll', `${API}/purchases`),
  getById: createOfflineMethod('purchases', 'getById', `${API}/purchases`),
  create: async (data) => {
    if (isOfflineMode()) {
      const storage = await getOfflineStorage();
      const purchases = await storage.getAll(STORES.PURCHASES);
      const purchaseNumber = `PUR-OFF-${String(purchases.length + 1).padStart(4, '0')}`;
      const newPurchase = {
        ...data,
        purchaseNumber,
        date: data.date || new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      const saved = await storage.save(STORES.PURCHASES, newPurchase);
      
      // Update product stock locally
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          if (item.productId) {
            const product = await storage.getById(STORES.PRODUCTS, item.productId);
            if (product) {
              product.stock = (product.stock || 0) + item.quantity;
              await storage.save(STORES.PRODUCTS, product, false);
            }
          }
        }
      }
      
      return { data: saved };
    }
    return axios.post(`${API}/purchases`, data);
  },
  update: createOfflineMethod('purchases', 'update', `${API}/purchases`),
  delete: createOfflineMethod('purchases', 'delete', `${API}/purchases`),
};

// Users API (read-only in offline mode)
export const usersAPI = {
  getAll: createOfflineMethod('users', 'getAll', `${API}/users`),
  getById: createOfflineMethod('users', 'getById', `${API}/users`),
  create: (data) => axios.post(`${API}/users`, data), // Always online
  update: (id, data) => axios.put(`${API}/users/${id}`, data), // Always online
  delete: (id) => axios.delete(`${API}/users/${id}`), // Always online
};

// Warehouses API
export const warehousesAPI = {
  getAll: createOfflineMethod('warehouses', 'getAll', `${API}/warehouses`),
  getById: createOfflineMethod('warehouses', 'getById', `${API}/warehouses`),
  create: createOfflineMethod('warehouses', 'create', `${API}/warehouses`),
  update: createOfflineMethod('warehouses', 'update', `${API}/warehouses`),
  delete: createOfflineMethod('warehouses', 'delete', `${API}/warehouses`),
};

// Dashboard API (aggregated data)
export const dashboardAPI = {
  getStats: async () => {
    if (isOfflineMode()) {
      const storage = await getOfflineStorage();
      const products = await storage.getAll(STORES.PRODUCTS);
      const customers = await storage.getAll(STORES.CUSTOMERS);
      const invoices = await storage.getAll(STORES.INVOICES);
      const purchases = await storage.getAll(STORES.PURCHASES);
      
      // Calculate stats locally
      const totalSales = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const totalPurchases = purchases.reduce((sum, pur) => sum + (pur.total || 0), 0);
      const lowStockProducts = products.filter(p => (p.stock || 0) < (p.minStock || 10));
      
      return {
        data: {
          totalProducts: products.length,
          totalCustomers: customers.length,
          totalInvoices: invoices.length,
          totalSales,
          totalPurchases,
          lowStockCount: lowStockProducts.length,
          todaySales: invoices.filter(i => {
            const today = new Date().toDateString();
            return new Date(i.createdAt || i.date).toDateString() === today;
          }).reduce((sum, inv) => sum + (inv.total || 0), 0)
        }
      };
    }
    return axios.get(`${API}/dashboard/stats`);
  },
  getAlerts: async () => {
    if (isOfflineMode()) {
      const storage = await getOfflineStorage();
      const products = await storage.getAll(STORES.PRODUCTS);
      const lowStock = products.filter(p => (p.stock || 0) < (p.minStock || 10));
      
      return {
        data: {
          alerts: lowStock.map(p => ({
            type: 'low_stock',
            message: `${p.name} - المخزون منخفض (${p.stock || 0})`,
            product: p
          }))
        }
      };
    }
    return axios.get(`${API}/dashboard/alerts`);
  },
};

// Reports API (aggregated data)
export const reportsAPI = {
  getSales: async (params) => {
    if (isOfflineMode()) {
      const storage = await getOfflineStorage();
      const invoices = await storage.getAll(STORES.INVOICES);
      
      // Filter by date range if provided
      let filtered = invoices;
      if (params?.startDate) {
        filtered = filtered.filter(i => new Date(i.date || i.createdAt) >= new Date(params.startDate));
      }
      if (params?.endDate) {
        filtered = filtered.filter(i => new Date(i.date || i.createdAt) <= new Date(params.endDate));
      }
      
      const totalSales = filtered.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const totalItems = filtered.reduce((sum, inv) => sum + (inv.items?.length || 0), 0);
      
      return {
        data: {
          invoices: filtered,
          totalSales,
          totalInvoices: filtered.length,
          totalItems
        }
      };
    }
    return axios.get(`${API}/reports/sales`, { params });
  },
  getInventory: async () => {
    if (isOfflineMode()) {
      const storage = await getOfflineStorage();
      const products = await storage.getAll(STORES.PRODUCTS);
      
      const totalValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.costPrice || 0)), 0);
      const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
      
      return {
        data: {
          products,
          totalProducts: products.length,
          totalStock,
          totalValue,
          lowStock: products.filter(p => (p.stock || 0) < (p.minStock || 10))
        }
      };
    }
    return axios.get(`${API}/reports/inventory`);
  },
  getPurchases: async (params) => {
    if (isOfflineMode()) {
      const storage = await getOfflineStorage();
      const purchases = await storage.getAll(STORES.PURCHASES);
      
      let filtered = purchases;
      if (params?.startDate) {
        filtered = filtered.filter(p => new Date(p.date || p.createdAt) >= new Date(params.startDate));
      }
      if (params?.endDate) {
        filtered = filtered.filter(p => new Date(p.date || p.createdAt) <= new Date(params.endDate));
      }
      
      return {
        data: {
          purchases: filtered,
          totalPurchases: filtered.reduce((sum, p) => sum + (p.total || 0), 0),
          totalCount: filtered.length
        }
      };
    }
    return axios.get(`${API}/reports/purchases`, { params });
  },
  getProfit: async (params) => {
    if (isOfflineMode()) {
      const storage = await getOfflineStorage();
      const invoices = await storage.getAll(STORES.INVOICES);
      const purchases = await storage.getAll(STORES.PURCHASES);
      const expenses = await storage.getAll(STORES.EXPENSES);
      
      const totalSales = invoices.reduce((sum, i) => sum + (i.total || 0), 0);
      const totalPurchases = purchases.reduce((sum, p) => sum + (p.total || 0), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      
      return {
        data: {
          totalSales,
          totalPurchases,
          totalExpenses,
          grossProfit: totalSales - totalPurchases,
          netProfit: totalSales - totalPurchases - totalExpenses
        }
      };
    }
    return axios.get(`${API}/reports/profit`, { params });
  },
  getAnalytics: async (params) => axios.get(`${API}/reports/analytics`, { params }),
  getCustomers: async (params) => axios.get(`${API}/reports/customers`, { params }),
};

// Accounting API
export const accountingAPI = {
  getExpenses: createOfflineMethod('expenses', 'getAll', `${API}/accounting/expenses`),
  createExpense: createOfflineMethod('expenses', 'create', `${API}/accounting/expenses`),
  updateExpense: (id, data) => {
    if (isOfflineMode()) {
      return createOfflineMethod('expenses', 'update', `${API}/accounting/expenses`)(id, data);
    }
    return axios.put(`${API}/accounting/expenses/${id}`, data);
  },
  deleteExpense: (id) => {
    if (isOfflineMode()) {
      return createOfflineMethod('expenses', 'delete', `${API}/accounting/expenses`)(id);
    }
    return axios.delete(`${API}/accounting/expenses/${id}`);
  },
  getAccounts: createOfflineMethod('accounts', 'getAll', `${API}/accounting/accounts`),
  createAccount: createOfflineMethod('accounts', 'create', `${API}/accounting/accounts`),
  updateAccount: (id, data) => {
    if (isOfflineMode()) {
      return createOfflineMethod('accounts', 'update', `${API}/accounting/accounts`)(id, data);
    }
    return axios.put(`${API}/accounting/accounts/${id}`, data);
  },
  getJournalEntries: createOfflineMethod('journal-entries', 'getAll', `${API}/accounting/journal-entries`),
  createJournalEntry: createOfflineMethod('journal-entries', 'create', `${API}/accounting/journal-entries`),
  getSummary: async () => {
    if (isOfflineMode()) {
      const storage = await getOfflineStorage();
      const expenses = await storage.getAll(STORES.EXPENSES);
      const accounts = await storage.getAll(STORES.ACCOUNTS);
      const invoices = await storage.getAll(STORES.INVOICES);
      
      return {
        data: {
          totalExpenses: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
          totalRevenue: invoices.reduce((sum, i) => sum + (i.total || 0), 0),
          accountsCount: accounts.length,
          expensesByCategory: expenses.reduce((acc, e) => {
            acc[e.category || 'other'] = (acc[e.category || 'other'] || 0) + (e.amount || 0);
            return acc;
          }, {})
        }
      };
    }
    return axios.get(`${API}/accounting/summary`);
  },
  seedAccounts: () => axios.post(`${API}/accounting/seed-accounts`), // Always online
};

// ESL API (read-only in offline mode)
export const eslAPI = {
  getDevices: () => axios.get(`${API}/esl/devices`),
  getDevice: (deviceId) => axios.get(`${API}/esl/devices/${deviceId}`),
  createDevice: (data) => axios.post(`${API}/esl/devices`, data),
  updateDevice: (deviceId, data) => axios.put(`${API}/esl/devices/${deviceId}`, data),
  updatePrice: (deviceId) => axios.post(`${API}/esl/devices/${deviceId}/update-price`),
  updateAllPrices: () => axios.post(`${API}/esl/update-all`),
  getSettings: () => axios.get(`${API}/esl/settings`),
  getSetting: (key) => axios.get(`${API}/esl/settings/${key}`),
  updateSetting: (key, value) => axios.put(`${API}/esl/settings/${key}`, { value }),
};

// License API (always online - desktop/mobile use)
export const licenseAPI = {
  activate: (data) => axios.post(`${API}/licenses/activate`, data),
  check: (data) => axios.post(`${API}/licenses/check`, data),
};

// Backup from server (export/restore tenant data)
export const backupAPI = {
  exportBackup: (tenantId = null) => {
    const params = tenantId ? { tenant_id: tenantId } : {};
    return axios.get(`${API}/backup/export`, { params, responseType: 'json' });
  },
  restoreBackup: (payload) =>
    axios.post(`${API}/backup/restore`, payload, { headers: { 'Content-Type': 'application/json' } }),
};

// Auth API (always online - required for authentication)
export const authAPI = {
  login: (data) => axios.post(`${API}/auth/login`, data),
  register: (data, password) => axios.post(`${API}/auth/register?password=${password}`, data),
  logout: (token) => axios.post(`${API}/auth/logout?token=${token}`),
  getMe: (token) => axios.get(`${API}/auth/me?token=${token}`),
  changePassword: (token, oldPassword, newPassword) => 
    axios.post(`${API}/auth/change-password?token=${token}&old_password=${oldPassword}&new_password=${newPassword}`),
};

export default {
  products: productsAPI,
  customers: customersAPI,
  invoices: invoicesAPI,
  esl: eslAPI,
  suppliers: suppliersAPI,
  purchases: purchasesAPI,
  users: usersAPI,
  warehouses: warehousesAPI,
  dashboard: dashboardAPI,
  reports: reportsAPI,
  accounting: accountingAPI,
  auth: authAPI,
  license: licenseAPI,
  backup: backupAPI,
};
