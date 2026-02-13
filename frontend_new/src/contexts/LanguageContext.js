import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

const translations = {
  ar: {
    // Common
    dashboard: 'لوحة التحكم',
    tenants: 'الشركات',
    settings: 'الإعدادات',
    logout: 'تسجيل الخروج',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',
    search: 'بحث',
    loading: 'جاري التحميل...',
    
    // Auth
    login: 'تسجيل الدخول',
    username: 'اسم المستخدم',
    password: 'كلمة المرور',
    tenantCode: 'رمز الشركة',
    loginButton: 'دخول',
    
    // Super Admin
    superAdminPanel: 'لوحة مدير النظام',
    totalTenants: 'إجمالي الشركات',
    activeTenants: 'الشركات النشطة',
    trialTenants: 'فترة تجريبية',
    expiredTenants: 'منتهية الصلاحية',
    expiringSoon: 'تنتهي قريباً',
    
    // Tenant Management
    createTenant: 'إنشاء شركة جديدة',
    companyName: 'اسم الشركة',
    companyNameEn: 'اسم الشركة (إنجليزي)',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    address: 'العنوان',
    status: 'الحالة',
    subscription: 'الاشتراك',
    expiryDate: 'تاريخ الانتهاء',
    adminUsername: 'اسم مستخدم المدير',
    adminPassword: 'كلمة مرور المدير',
    adminEmail: 'بريد المدير',
    
    // Status
    active: 'نشط',
    trial: 'تجريبي',
    expired: 'منتهي',
    suspended: 'موقوف',
    
    // Plans
    free: 'مجاني',
    basic: 'أساسي',
    professional: 'احترافي',
    enterprise: 'مؤسسي',
  },
  en: {
    // Common
    dashboard: 'Dashboard',
    tenants: 'Tenants',
    settings: 'Settings',
    logout: 'Logout',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    loading: 'Loading...',
    
    // Auth
    login: 'Login',
    username: 'Username',
    password: 'Password',
    tenantCode: 'Tenant Code',
    loginButton: 'Login',
    
    // Super Admin
    superAdminPanel: 'Super Admin Panel',
    totalTenants: 'Total Tenants',
    activeTenants: 'Active Tenants',
    trialTenants: 'Trial',
    expiredTenants: 'Expired',
    expiringSoon: 'Expiring Soon',
    
    // Tenant Management
    createTenant: 'Create New Tenant',
    companyName: 'Company Name',
    companyNameEn: 'Company Name (English)',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    status: 'Status',
    subscription: 'Subscription',
    expiryDate: 'Expiry Date',
    adminUsername: 'Admin Username',
    adminPassword: 'Admin Password',
    adminEmail: 'Admin Email',
    
    // Status
    active: 'Active',
    trial: 'Trial',
    expired: 'Expired',
    suspended: 'Suspended',
    
    // Plans
    free: 'Free',
    basic: 'Basic',
    professional: 'Professional',
    enterprise: 'Enterprise',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ar');

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key) => translations[language]?.[key] || key;
  
  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
