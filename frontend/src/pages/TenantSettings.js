import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  ArrowLeft, Settings, Palette, FileText, Users, Package, Shield, 
  Plus, Trash2, Save, Upload, GripVertical, ToggleLeft, Building2,
  CreditCard, Smartphone, Wifi, BarChart3, ShoppingCart, Warehouse,
  Receipt, Globe, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || '';

const FEATURE_LIST = [
  { key: 'dashboard', icon: BarChart3, label: 'لوحة التحكم', labelEn: 'Dashboard' },
  { key: 'products', icon: Package, label: 'المنتجات', labelEn: 'Products' },
  { key: 'customers', icon: Users, label: 'العملاء', labelEn: 'Customers' },
  { key: 'suppliers', icon: Building2, label: 'الموردين', labelEn: 'Suppliers' },
  { key: 'invoices', icon: FileText, label: 'الفواتير', labelEn: 'Invoices' },
  { key: 'purchases', icon: Receipt, label: 'المشتريات', labelEn: 'Purchases' },
  { key: 'pos', icon: ShoppingCart, label: 'نقطة البيع', labelEn: 'POS' },
  { key: 'warehouses', icon: Warehouse, label: 'المستودعات', labelEn: 'Warehouses' },
  { key: 'reports', icon: BarChart3, label: 'التقارير', labelEn: 'Reports' },
  { key: 'accounting', icon: DollarSign, label: 'المحاسبة', labelEn: 'Accounting' },
  { key: 'rfid', icon: Smartphone, label: 'RFID Scanner', labelEn: 'RFID Scanner' },
  { key: 'esl', icon: CreditCard, label: 'شاشات الأسعار', labelEn: 'ESL Screens' },
  { key: 'offline', icon: Wifi, label: 'وضع Offline', labelEn: 'Offline Mode' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'نص', labelEn: 'Text' },
  { value: 'number', label: 'رقم', labelEn: 'Number' },
  { value: 'select', label: 'قائمة اختيار', labelEn: 'Dropdown' },
  { value: 'date', label: 'تاريخ', labelEn: 'Date' },
  { value: 'boolean', label: 'نعم/لا', labelEn: 'Yes/No' },
  { value: 'textarea', label: 'نص طويل', labelEn: 'Long Text' },
];

const ENTITY_TYPES = [
  { value: 'products', label: 'المنتجات', labelEn: 'Products' },
  { value: 'customers', label: 'العملاء', labelEn: 'Customers' },
  { value: 'suppliers', label: 'الموردين', labelEn: 'Suppliers' },
  { value: 'invoices', label: 'الفواتير', labelEn: 'Invoices' },
];

const TenantSettings = () => {
  const { id } = useParams();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('features');
  
  // Settings state
  const [features, setFeatures] = useState({});
  const [customFields, setCustomFields] = useState([]);
  const [invoiceSettings, setInvoiceSettings] = useState({
    logo: '',
    companyName: '',
    companyNameEn: '',
    address: '',
    addressEn: '',
    phone: '',
    email: '',
    taxNumber: '',
    footer: '',
    footerEn: '',
    showLogo: true,
    showTaxNumber: true,
    primaryColor: '#1a56db',
    secondaryColor: '#6b7280'
  });
  const [limits, setLimits] = useState({
    maxUsers: 5,
    maxProducts: 1000,
    maxWarehouses: 1,
    maxInvoicesPerMonth: -1, // -1 = unlimited
    storageLimit: 1024 // MB
  });

  useEffect(() => {
    fetchTenant();
  }, [id]);

  const fetchTenant = async () => {
    try {
      const res = await axios.get(`${API}/api/tenants/${id}`);
      const data = res.data;
      setTenant(data);
      
      // Initialize features from settings
      const featureState = {};
      FEATURE_LIST.forEach(f => {
        featureState[f.key] = data.settings?.enabledFeatures?.[f.key] ?? true;
      });
      setFeatures(featureState);
      
      // Initialize custom fields
      setCustomFields(data.settings?.customFields || []);
      
      // Initialize invoice settings
      if (data.settings?.invoiceTemplate) {
        setInvoiceSettings(prev => ({ ...prev, ...data.settings.invoiceTemplate }));
      }
      
      // Initialize limits
      if (data.subscription) {
        setLimits({
          maxUsers: data.subscription.maxUsers || 5,
          maxProducts: data.subscription.maxProducts || 1000,
          maxWarehouses: data.subscription.maxWarehouses || 1,
          maxInvoicesPerMonth: data.subscription.maxInvoicesPerMonth || -1,
          storageLimit: data.subscription.storageLimit || 1024
        });
      }
    } catch (error) {
      console.error('Error fetching tenant:', error);
      toast.error(isAr ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        settings: {
          ...tenant.settings,
          enabledFeatures: features,
          customFields: customFields,
          invoiceTemplate: invoiceSettings
        },
        subscription: {
          ...tenant.subscription,
          ...limits
        }
      };
      
      await axios.put(`${API}/api/tenants/${id}`, updateData);
      toast.success(isAr ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully');
      fetchTenant();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(isAr ? 'فشل حفظ الإعدادات' : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addCustomField = () => {
    const newField = {
      fieldId: `field_${Date.now()}`,
      fieldName: '',
      fieldNameEn: '',
      fieldType: 'text',
      required: false,
      options: [],
      defaultValue: '',
      order: customFields.length,
      targetEntity: 'products'
    };
    setCustomFields([...customFields, newField]);
  };

  const updateCustomField = (index, field, value) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], [field]: value };
    setCustomFields(updated);
  };

  const removeCustomField = (index) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Convert to base64 for now (in production, upload to cloud storage)
    const reader = new FileReader();
    reader.onloadend = () => {
      setInvoiceSettings(prev => ({ ...prev, logo: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/admin/tenants/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Settings className="w-6 h-6 text-blue-600" />
              {isAr ? 'إعدادات الشركة' : 'Tenant Settings'}
            </h1>
            <p className="text-gray-500">{isAr ? tenant?.name : tenant?.nameEn} ({tenant?.code})</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الإعدادات' : 'Save Settings')}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="features" className="rounded-lg data-[state=active]:bg-white">
            <ToggleLeft className="w-4 h-4 mr-2" />
            {isAr ? 'الميزات' : 'Features'}
          </TabsTrigger>
          <TabsTrigger value="fields" className="rounded-lg data-[state=active]:bg-white">
            <Package className="w-4 h-4 mr-2" />
            {isAr ? 'حقول مخصصة' : 'Custom Fields'}
          </TabsTrigger>
          <TabsTrigger value="invoice" className="rounded-lg data-[state=active]:bg-white">
            <FileText className="w-4 h-4 mr-2" />
            {isAr ? 'الفاتورة' : 'Invoice'}
          </TabsTrigger>
          <TabsTrigger value="limits" className="rounded-lg data-[state=active]:bg-white">
            <Shield className="w-4 h-4 mr-2" />
            {isAr ? 'الحدود' : 'Limits'}
          </TabsTrigger>
        </TabsList>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{isAr ? 'الميزات المتاحة' : 'Available Features'}</CardTitle>
              <CardDescription>
                {isAr ? 'تفعيل أو تعطيل الميزات لهذه الشركة' : 'Enable or disable features for this tenant'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {FEATURE_LIST.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div 
                      key={feature.key}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        features[feature.key] 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                      onClick={() => setFeatures(prev => ({ ...prev, [feature.key]: !prev[feature.key] }))}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            features[feature.key] ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="font-medium">
                            {isAr ? feature.label : feature.labelEn}
                          </span>
                        </div>
                        <Switch 
                          checked={features[feature.key]} 
                          onCheckedChange={(checked) => setFeatures(prev => ({ ...prev, [feature.key]: checked }))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Fields Tab */}
        <TabsContent value="fields" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{isAr ? 'الحقول المخصصة' : 'Custom Fields'}</CardTitle>
                <CardDescription>
                  {isAr ? 'إضافة حقول مخصصة للمنتجات والعملاء وغيرها' : 'Add custom fields to products, customers, etc.'}
                </CardDescription>
              </div>
              <Button onClick={addCustomField} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                {isAr ? 'إضافة حقل' : 'Add Field'}
              </Button>
            </CardHeader>
            <CardContent>
              {customFields.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{isAr ? 'لا توجد حقول مخصصة' : 'No custom fields'}</p>
                  <Button onClick={addCustomField} variant="link" className="mt-2">
                    {isAr ? 'إضافة حقل جديد' : 'Add new field'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {customFields.map((field, index) => (
                    <div key={field.fieldId} className="p-4 border rounded-xl bg-gray-50 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                          <span className="font-medium text-gray-700">
                            {isAr ? `حقل ${index + 1}` : `Field ${index + 1}`}
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeCustomField(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>{isAr ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                          <Input 
                            value={field.fieldName}
                            onChange={(e) => updateCustomField(index, 'fieldName', e.target.value)}
                            placeholder={isAr ? 'مثال: اللون' : 'e.g. Color'}
                          />
                        </div>
                        <div>
                          <Label>{isAr ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                          <Input 
                            value={field.fieldNameEn}
                            onChange={(e) => updateCustomField(index, 'fieldNameEn', e.target.value)}
                            placeholder="e.g. Color"
                          />
                        </div>
                        <div>
                          <Label>{isAr ? 'النوع' : 'Type'}</Label>
                          <Select 
                            value={field.fieldType}
                            onValueChange={(v) => updateCustomField(index, 'fieldType', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FIELD_TYPES.map(t => (
                                <SelectItem key={t.value} value={t.value}>
                                  {isAr ? t.label : t.labelEn}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>{isAr ? 'ينطبق على' : 'Applies to'}</Label>
                          <Select 
                            value={field.targetEntity}
                            onValueChange={(v) => updateCustomField(index, 'targetEntity', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ENTITY_TYPES.map(t => (
                                <SelectItem key={t.value} value={t.value}>
                                  {isAr ? t.label : t.labelEn}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <Switch 
                            checked={field.required}
                            onCheckedChange={(checked) => updateCustomField(index, 'required', checked)}
                          />
                          <Label>{isAr ? 'حقل مطلوب' : 'Required field'}</Label>
                        </div>
                        {field.fieldType === 'select' && (
                          <div>
                            <Label>{isAr ? 'الخيارات (مفصولة بفاصلة)' : 'Options (comma separated)'}</Label>
                            <Input 
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => updateCustomField(index, 'options', e.target.value.split(',').map(s => s.trim()))}
                              placeholder={isAr ? 'أحمر, أخضر, أزرق' : 'Red, Green, Blue'}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoice Tab */}
        <TabsContent value="invoice" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Invoice Settings */}
            <Card>
              <CardHeader>
                <CardTitle>{isAr ? 'إعدادات الفاتورة' : 'Invoice Settings'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Logo Upload */}
                <div>
                  <Label>{isAr ? 'شعار الشركة' : 'Company Logo'}</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {invoiceSettings.logo ? (
                      <img src={invoiceSettings.logo} alt="Logo" className="w-20 h-20 object-contain border rounded-lg" />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 border-2 border-dashed rounded-lg flex items-center justify-center">
                        <Upload className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <Input 
                        type="file" 
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="w-auto"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {isAr ? 'PNG, JPG حتى 2MB' : 'PNG, JPG up to 2MB'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{isAr ? 'اسم الشركة (عربي)' : 'Company Name (Arabic)'}</Label>
                    <Input 
                      value={invoiceSettings.companyName}
                      onChange={(e) => setInvoiceSettings(prev => ({ ...prev, companyName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>{isAr ? 'اسم الشركة (إنجليزي)' : 'Company Name (English)'}</Label>
                    <Input 
                      value={invoiceSettings.companyNameEn}
                      onChange={(e) => setInvoiceSettings(prev => ({ ...prev, companyNameEn: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{isAr ? 'العنوان (عربي)' : 'Address (Arabic)'}</Label>
                    <Input 
                      value={invoiceSettings.address}
                      onChange={(e) => setInvoiceSettings(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>{isAr ? 'العنوان (إنجليزي)' : 'Address (English)'}</Label>
                    <Input 
                      value={invoiceSettings.addressEn}
                      onChange={(e) => setInvoiceSettings(prev => ({ ...prev, addressEn: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{isAr ? 'الهاتف' : 'Phone'}</Label>
                    <Input 
                      value={invoiceSettings.phone}
                      onChange={(e) => setInvoiceSettings(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>{isAr ? 'البريد الإلكتروني' : 'Email'}</Label>
                    <Input 
                      value={invoiceSettings.email}
                      onChange={(e) => setInvoiceSettings(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>{isAr ? 'الرقم الضريبي' : 'Tax Number'}</Label>
                  <Input 
                    value={invoiceSettings.taxNumber}
                    onChange={(e) => setInvoiceSettings(prev => ({ ...prev, taxNumber: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{isAr ? 'اللون الرئيسي' : 'Primary Color'}</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color"
                        value={invoiceSettings.primaryColor}
                        onChange={(e) => setInvoiceSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="w-12 h-10 p-1"
                      />
                      <Input 
                        value={invoiceSettings.primaryColor}
                        onChange={(e) => setInvoiceSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>{isAr ? 'اللون الثانوي' : 'Secondary Color'}</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color"
                        value={invoiceSettings.secondaryColor}
                        onChange={(e) => setInvoiceSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="w-12 h-10 p-1"
                      />
                      <Input 
                        value={invoiceSettings.secondaryColor}
                        onChange={(e) => setInvoiceSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={invoiceSettings.showLogo}
                      onCheckedChange={(checked) => setInvoiceSettings(prev => ({ ...prev, showLogo: checked }))}
                    />
                    <Label>{isAr ? 'إظهار الشعار' : 'Show Logo'}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={invoiceSettings.showTaxNumber}
                      onCheckedChange={(checked) => setInvoiceSettings(prev => ({ ...prev, showTaxNumber: checked }))}
                    />
                    <Label>{isAr ? 'إظهار الرقم الضريبي' : 'Show Tax Number'}</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Preview */}
            <Card>
              <CardHeader>
                <CardTitle>{isAr ? 'معاينة الفاتورة' : 'Invoice Preview'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-6 bg-white shadow-sm">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b pb-4" style={{ borderColor: invoiceSettings.primaryColor }}>
                    {invoiceSettings.showLogo && invoiceSettings.logo && (
                      <img src={invoiceSettings.logo} alt="Logo" className="w-16 h-16 object-contain" />
                    )}
                    <div className="text-right">
                      <h2 className="text-xl font-bold" style={{ color: invoiceSettings.primaryColor }}>
                        {invoiceSettings.companyName || (isAr ? 'اسم الشركة' : 'Company Name')}
                      </h2>
                      <p className="text-sm text-gray-500">{invoiceSettings.companyNameEn}</p>
                      <p className="text-xs text-gray-400 mt-1">{invoiceSettings.address}</p>
                      <p className="text-xs text-gray-400">{invoiceSettings.phone}</p>
                      {invoiceSettings.showTaxNumber && invoiceSettings.taxNumber && (
                        <p className="text-xs mt-1" style={{ color: invoiceSettings.secondaryColor }}>
                          {isAr ? 'الرقم الضريبي:' : 'Tax No:'} {invoiceSettings.taxNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Invoice Title */}
                  <div className="my-4 text-center">
                    <h3 className="text-lg font-bold" style={{ color: invoiceSettings.primaryColor }}>
                      {isAr ? 'فاتورة ضريبية' : 'TAX INVOICE'}
                    </h3>
                    <p className="text-sm text-gray-500">#INV-0001</p>
                  </div>

                  {/* Sample Table */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: invoiceSettings.primaryColor, color: 'white' }}>
                        <th className="p-2 text-right">{isAr ? 'الصنف' : 'Item'}</th>
                        <th className="p-2 text-center">{isAr ? 'الكمية' : 'Qty'}</th>
                        <th className="p-2 text-left">{isAr ? 'السعر' : 'Price'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-2">{isAr ? 'منتج تجريبي' : 'Sample Product'}</td>
                        <td className="p-2 text-center">2</td>
                        <td className="p-2">$100</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Total */}
                  <div className="mt-4 text-left">
                    <p className="font-bold" style={{ color: invoiceSettings.primaryColor }}>
                      {isAr ? 'الإجمالي:' : 'Total:'} $200
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Limits Tab */}
        <TabsContent value="limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{isAr ? 'الحدود والقيود' : 'Limits & Restrictions'}</CardTitle>
              <CardDescription>
                {isAr ? 'تحديد الحد الأقصى للموارد المتاحة لهذه الشركة' : 'Set maximum resources available for this tenant'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-4 border rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <Label className="font-medium">{isAr ? 'أقصى عدد مستخدمين' : 'Max Users'}</Label>
                  </div>
                  <Input 
                    type="number"
                    value={limits.maxUsers}
                    onChange={(e) => setLimits(prev => ({ ...prev, maxUsers: parseInt(e.target.value) || 0 }))}
                    min={1}
                  />
                </div>

                <div className="p-4 border rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-green-600" />
                    </div>
                    <Label className="font-medium">{isAr ? 'أقصى عدد منتجات' : 'Max Products'}</Label>
                  </div>
                  <Input 
                    type="number"
                    value={limits.maxProducts}
                    onChange={(e) => setLimits(prev => ({ ...prev, maxProducts: parseInt(e.target.value) || 0 }))}
                    min={1}
                  />
                </div>

                <div className="p-4 border rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Warehouse className="w-5 h-5 text-purple-600" />
                    </div>
                    <Label className="font-medium">{isAr ? 'أقصى عدد مستودعات' : 'Max Warehouses'}</Label>
                  </div>
                  <Input 
                    type="number"
                    value={limits.maxWarehouses}
                    onChange={(e) => setLimits(prev => ({ ...prev, maxWarehouses: parseInt(e.target.value) || 0 }))}
                    min={1}
                  />
                </div>

                <div className="p-4 border rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                    <Label className="font-medium">{isAr ? 'أقصى فواتير شهرياً' : 'Max Invoices/Month'}</Label>
                  </div>
                  <Input 
                    type="number"
                    value={limits.maxInvoicesPerMonth}
                    onChange={(e) => setLimits(prev => ({ ...prev, maxInvoicesPerMonth: parseInt(e.target.value) || -1 }))}
                    placeholder={isAr ? '-1 = غير محدود' : '-1 = Unlimited'}
                  />
                  <p className="text-xs text-gray-500 mt-1">{isAr ? '-1 = غير محدود' : '-1 = Unlimited'}</p>
                </div>

                <div className="p-4 border rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <Globe className="w-5 h-5 text-red-600" />
                    </div>
                    <Label className="font-medium">{isAr ? 'مساحة التخزين (MB)' : 'Storage Limit (MB)'}</Label>
                  </div>
                  <Input 
                    type="number"
                    value={limits.storageLimit}
                    onChange={(e) => setLimits(prev => ({ ...prev, storageLimit: parseInt(e.target.value) || 0 }))}
                    min={100}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TenantSettings;
