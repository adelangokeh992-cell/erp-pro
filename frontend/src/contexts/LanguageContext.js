import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const translations = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    inventory: 'Inventory',
    invoices: 'Invoices',
    customers: 'Customers',
    suppliers: 'Suppliers',
    purchases: 'Purchases',
    users: 'Users',
    pos: 'Point of Sale',
    reports: 'Reports',
    accounting: 'Accounting',
    warehouses: 'Warehouses',
    settings: 'Settings',
    logout: 'Logout',
    
    // Common
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search',
    actions: 'Actions',
    name: 'Name',
    description: 'Description',
    quantity: 'Quantity',
    price: 'Price',
    total: 'Total',
    date: 'Date',
    status: 'Status',
    details: 'Details',
    print: 'Print',
    export: 'Export',
    filter: 'Filter',
    
    // Dashboard
    totalSales: 'Total Sales',
    totalPurchases: 'Total Purchases',
    totalProducts: 'Total Products',
    lowStock: 'Low Stock Items',
    recentInvoices: 'Recent Invoices',
    topProducts: 'Top Products',
    salesChart: 'Sales Overview',
    
    // Inventory
    products: 'Products',
    addProduct: 'Add Product',
    productName: 'Product Name',
    sku: 'SKU',
    barcode: 'Barcode',
    rfidTag: 'RFID Tag',
    category: 'Category',
    stock: 'Stock',
    costPrice: 'Cost Price',
    salePrice: 'Sale Price',
    reorderLevel: 'Reorder Level',
    scanRFID: 'Scan RFID',
    scanBarcode: 'Scan Barcode',
    
    // Invoices
    createInvoice: 'Create Invoice',
    invoiceNumber: 'Invoice Number',
    customer: 'Customer',
    invoiceDate: 'Invoice Date',
    dueDate: 'Due Date',
    items: 'Items',
    subtotal: 'Subtotal',
    tax: 'Tax',
    discount: 'Discount',
    grandTotal: 'Grand Total',
    paid: 'Paid',
    unpaid: 'Unpaid',
    partial: 'Partial',
    
    // Customers
    addCustomer: 'Add Customer',
    customerName: 'Customer Name',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    balance: 'Balance',
    
    // Suppliers
    addSupplier: 'Add Supplier',
    supplierName: 'Supplier Name',
    
    // Purchases
    createPurchase: 'Create Purchase',
    purchaseOrder: 'Purchase Order',
    supplier: 'Supplier',
    
    // Users
    addUser: 'Add User',
    username: 'Username',
    role: 'Role',
    password: 'Password',
    admin: 'Admin',
    manager: 'Manager',
    staff: 'Staff',
    accountant: 'Accountant',
    
    // POS
    pointOfSale: 'Point of Sale',
    addToCart: 'Add to Cart',
    cart: 'Cart',
    checkout: 'Checkout',
    cash: 'Cash',
    card: 'Card',
    paymentMethod: 'Payment Method',
    
    // Reports
    salesReport: 'Sales Report',
    purchaseReport: 'Purchase Report',
    inventoryReport: 'Inventory Report',
    profitLoss: 'Profit & Loss',
    
    // Warehouses
    addWarehouse: 'Add Warehouse',
    warehouseName: 'Warehouse Name',
    location: 'Location',
    
    // ESL
    esl: 'ESL Management',
    
    // Login
    tenantCode: 'Company Code',
    loginButton: 'Login',
  },
  ar: {
    // Navigation
    dashboard: 'لوحة التحكم',
    inventory: 'المخزون',
    invoices: 'الفواتير',
    customers: 'العملاء',
    suppliers: 'الموردين',
    purchases: 'المشتريات',
    users: 'المستخدمين',
    pos: 'نقطة البيع',
    reports: 'التقارير',
    accounting: 'المحاسبة',
    warehouses: 'المستودعات',
    settings: 'الإعدادات',
    logout: 'تسجيل الخروج',
    
    // Common
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    save: 'حفظ',
    cancel: 'إلغاء',
    search: 'بحث',
    actions: 'إجراءات',
    name: 'الاسم',
    description: 'الوصف',
    quantity: 'الكمية',
    price: 'السعر',
    total: 'الإجمالي',
    date: 'التاريخ',
    status: 'الحالة',
    details: 'التفاصيل',
    print: 'طباعة',
    export: 'تصدير',
    filter: 'تصفية',
    
    // Dashboard
    totalSales: 'إجمالي المبيعات',
    totalPurchases: 'إجمالي المشتريات',
    totalProducts: 'إجمالي المنتجات',
    lowStock: 'منتجات منخفضة المخزون',
    recentInvoices: 'الفواتير الأخيرة',
    topProducts: 'المنتجات الأكثر مبيعاً',
    salesChart: 'نظرة عامة على المبيعات',
    
    // Inventory
    products: 'المنتجات',
    addProduct: 'إضافة منتج',
    productName: 'اسم المنتج',
    sku: 'رمز المنتج',
    barcode: 'الباركود',
    rfidTag: 'علامة RFID',
    category: 'الفئة',
    stock: 'المخزون',
    costPrice: 'سعر التكلفة',
    salePrice: 'سعر البيع',
    reorderLevel: 'مستوى إعادة الطلب',
    scanRFID: 'مسح RFID',
    scanBarcode: 'مسح الباركود',
    
    // Invoices
    createInvoice: 'إنشاء فاتورة',
    invoiceNumber: 'رقم الفاتورة',
    customer: 'العميل',
    invoiceDate: 'تاريخ الفاتورة',
    dueDate: 'تاريخ الاستحقاق',
    items: 'الأصناف',
    subtotal: 'المجموع الفرعي',
    tax: 'الضريبة',
    discount: 'الخصم',
    grandTotal: 'الإجمالي الكلي',
    paid: 'مدفوعة',
    unpaid: 'غير مدفوعة',
    partial: 'جزئية',
    
    // Customers
    addCustomer: 'إضافة عميل',
    customerName: 'اسم العميل',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    address: 'العنوان',
    balance: 'الرصيد',
    
    // Suppliers
    addSupplier: 'إضافة مورد',
    supplierName: 'اسم المورد',
    
    // Purchases
    createPurchase: 'إنشاء طلب شراء',
    purchaseOrder: 'طلب شراء',
    supplier: 'المورد',
    
    // Users
    addUser: 'إضافة مستخدم',
    username: 'اسم المستخدم',
    role: 'الدور',
    password: 'كلمة المرور',
    admin: 'مدير',
    manager: 'مدير',
    staff: 'موظف',
    accountant: 'محاسب',
    
    // POS
    pointOfSale: 'نقطة البيع',
    addToCart: 'إضافة للسلة',
    cart: 'السلة',
    checkout: 'الدفع',
    cash: 'نقدي',
    card: 'بطاقة',
    paymentMethod: 'طريقة الدفع',
    
    // Reports
    salesReport: 'تقرير المبيعات',
    purchaseReport: 'تقرير المشتريات',
    inventoryReport: 'تقرير المخزون',
    profitLoss: 'الأرباح والخسائر',
    
    // Warehouses
    addWarehouse: 'إضافة مستودع',
    warehouseName: 'اسم المستودع',
    location: 'الموقع',
    
    // ESL
    esl: 'إدارة شاشات الأسعار',
    
    // Login
    tenantCode: 'رمز الشركة',
    loginButton: 'تسجيل الدخول',
  },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('ar');
  const [direction, setDirection] = useState('rtl');

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
  }, [direction, language]);

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'ar' : 'en';
    const newDir = newLang === 'ar' ? 'rtl' : 'ltr';
    setLanguage(newLang);
    setDirection(newDir);
  };

  const t = (key) => translations[language][key] || key;

  return (
    <LanguageContext.Provider value={{ language, direction, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
