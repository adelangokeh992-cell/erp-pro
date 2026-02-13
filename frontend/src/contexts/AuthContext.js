import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { licenseAPI } from '../services/api';

const AuthContext = createContext(null);

const isDev = process.env.NODE_ENV === 'development';
const API = isDev ? '' : (process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8002');
const API_BASE = API ? `${API}/api` : '/api';

const LICENSE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [tenantSettings, setTenantSettings] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    localStorage.removeItem('tenantSettings');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setTenant(null);
    setTenantSettings(null);
  }, []);

  const fetchTenantSettings = useCallback(async (tenantId) => {
    try {
      const res = await axios.get(`${API_BASE}/tenants/${tenantId}/settings`);
      setTenantSettings(res.data);
      localStorage.setItem('tenantSettings', JSON.stringify(res.data));
    } catch (error) {
      const stored = localStorage.getItem('tenantSettings');
      if (stored) {
        setTenantSettings(JSON.parse(stored));
      }
    }
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        const storedTenant = JSON.parse(localStorage.getItem('tenant') || 'null');
        setTenant(storedTenant);
        if (storedTenant?.id) {
          fetchTenantSettings(storedTenant.id);
        }
        setLoading(false);
        return;
      }
      const res = await axios.get(`${API_BASE}/auth/me?token=${token}`);
      if (res.data.user) {
        setUser(res.data.user);
        setTenant(res.data.tenant);
      } else if (res.data._id) {
        setUser(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [token, fetchTenantSettings, logout]);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token, fetchUser]);

  const getHardwareId = async () => {
    // In Electron, use native hardware ID
    if (window.erpDesktop?.getHardwareId) {
      try {
        return await window.erpDesktop.getHardwareId();
      } catch {
        // fall back
      }
    }
    // Web/dev fallback: stable random ID per installation
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = `web_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  };

  const login = async (username, password, tenantCode = null) => {
    try {
      const res = await axios.post(
        `${API_BASE}/auth/login`,
        { username, password, tenantCode },
        { timeout: 15000 }
      );
      
      const { access_token, user: userData, tenant: tenantData } = res.data;
      
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setToken(access_token);
      
      // Handle both old and new API response formats
      if (userData) {
        // For super admin we don't enforce license
        if (tenantData) {
          // Enforce license check for tenant users (especially in desktop)
          try {
            const hardwareId = await getHardwareId();
            const licenseCheck = await licenseAPI.check({
              tenantCode: tenantData.code,
              hardwareId,
            });
            if (!licenseCheck.data?.isValid) {
              throw new Error(
                licenseCheck.data?.reason || 'الترخيص غير صالح لهذا الجهاز'
              );
            }
          } catch (e) {
            // Roll back auth state and report error
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            setToken(null);
            setUser(null);
            setTenant(null);
            return {
              success: false,
              error: e.message || 'فشل التحقق من الترخيص',
            };
          }
        }

        setUser(userData);
        setTenant(tenantData);
        // Store user data for persistence
        localStorage.setItem('user', JSON.stringify(userData));
        if (tenantData) {
          localStorage.setItem('tenant', JSON.stringify(tenantData));
          // Fetch tenant settings
          fetchTenantSettings(tenantData.id);
        }
        return { success: true, user: userData, tenant: tenantData };
      } else {
        // Old API format - create minimal user object
        const minimalUser = {
          username: username,
          role: tenantCode ? 'tenant_admin' : 'super_admin'
        };
        setUser(minimalUser);
        localStorage.setItem('user', JSON.stringify(minimalUser));
        return { success: true, user: minimalUser, tenant: null };
      }
    } catch (error) {
      console.error('Login error:', error);
      const detail = error.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map(d => d.msg || d).join(', ') : (detail?.msg || 'فشل تسجيل الدخول');
      const isNetwork = !error.response && (error.message === 'Network Error' || error.code === 'ERR_NETWORK');
      const isTimeout = error.code === 'ECONNABORTED';
      let errMsg = msg;
      if (isTimeout) errMsg = 'انتهت المهلة. تأكد أن الـ Backend يعمل ثم جرّب مرة أخرى.';
      else if (isNetwork) errMsg = 'لا يوجد اتصال بالخادم. شغّل الـ Backend أولاً (المنفذ 8002).';
      return { success: false, error: errMsg };
    }
  };

  // License verification on startup and periodically (every 4h) for tenant users in Desktop
  useEffect(() => {
    if (!token || !user || !tenant || user?.role === 'super_admin') return;
    const check = async () => {
      try {
        const hardwareId = await getHardwareId();
        const res = await licenseAPI.check({ tenantCode: tenant.code, hardwareId });
        if (res.data && !res.data.isValid) {
          logout();
        }
      } catch {
        // Keep session on network error; will retry next interval
      }
    };
    check();
    const id = setInterval(check, LICENSE_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [token, user, tenant, logout]);

  const isSuperAdmin = () => user?.role === 'super_admin';
  const isTenantAdmin = () => user?.role === 'tenant_admin';
  const hasPermission = (permission) => user?.permissions?.[permission] === true;
  
  // Check if a feature is enabled for the tenant
  const isFeatureEnabled = (featureKey) => {
    // Super admin has all features
    if (user?.role === 'super_admin') return true;
    // If no settings, default to enabled
    if (!tenantSettings?.enabledFeatures) return true;
    // Check the feature flag
    return tenantSettings.enabledFeatures[featureKey] !== false;
  };

  // Get custom fields for an entity
  const getCustomFields = (entityType) => {
    if (!tenantSettings?.customFields) return [];
    return tenantSettings.customFields.filter(f => f.targetEntity === entityType);
  };

  // Get invoice template settings
  const getInvoiceTemplate = () => {
    return tenantSettings?.invoiceTemplate || {};
  };

  // Get subscription limits
  const getLimits = () => {
    return tenantSettings?.limits || {
      maxUsers: 999999,
      maxProducts: 999999,
      maxWarehouses: 999999,
      maxInvoicesPerMonth: -1,
      storageLimit: 999999
    };
  };

  return (
    <AuthContext.Provider value={{
      user,
      tenant,
      tenantSettings,
      token,
      loading,
      login,
      logout,
      isSuperAdmin,
      isTenantAdmin,
      hasPermission,
      isFeatureEnabled,
      getCustomFields,
      getInvoiceTemplate,
      getLimits,
      isAuthenticated: !!token && !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
