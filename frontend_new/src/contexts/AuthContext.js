import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = process.env.REACT_APP_BACKEND_URL || '';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/api/auth/me`);
      setUser(res.data.user);
      setTenant(res.data.tenant);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password, tenantCode = null) => {
    try {
      const res = await axios.post(`${API}/api/auth/login`, {
        username,
        password,
        tenantCode
      });
      
      const { access_token, user: userData, tenant: tenantData } = res.data;
      
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setToken(access_token);
      setUser(userData);
      setTenant(tenantData);
      
      return { success: true, user: userData, tenant: tenantData };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'فشل تسجيل الدخول'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setTenant(null);
  };

  const isSuperAdmin = () => user?.role === 'super_admin';
  const isTenantAdmin = () => user?.role === 'tenant_admin';
  const hasPermission = (permission) => user?.permissions?.[permission] === true;

  return (
    <AuthContext.Provider value={{
      user,
      tenant,
      token,
      loading,
      login,
      logout,
      isSuperAdmin,
      isTenantAdmin,
      hasPermission,
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
