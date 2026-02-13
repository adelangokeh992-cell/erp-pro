import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Building2, User, Mail, Phone, MapPin, Lock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || '';

const CreateTenant = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    email: '',
    phone: '',
    address: '',
    addressEn: '',
    country: 'SA',
    adminUsername: '',
    adminPassword: '',
    adminEmail: '',
    plan: 'free'
  });

  const isAr = language === 'ar';

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(`${API}/api/tenants`, {
        ...formData,
        settings: {
          language: 'ar',
          currency: 'USD',
          currencySymbol: '$'
        },
        subscription: {
          plan: formData.plan,
          subscriptionType: 'monthly',
          maxUsers: formData.plan === 'enterprise' ? 100 : formData.plan === 'professional' ? 25 : formData.plan === 'basic' ? 10 : 5,
          maxProducts: formData.plan === 'enterprise' ? 100000 : formData.plan === 'professional' ? 10000 : formData.plan === 'basic' ? 5000 : 1000
        }
      });

      toast.success(
        <div>
          <p className="font-bold">{isAr ? 'تم إنشاء الشركة بنجاح!' : 'Tenant created successfully!'}</p>
          <p className="text-sm mt-1">{isAr ? 'رمز الشركة:' : 'Tenant Code:'} <strong>{res.data.code}</strong></p>
        </div>
      );

      navigate('/admin/tenants');
    } catch (error) {
      toast.error(error.response?.data?.detail || (isAr ? 'فشل إنشاء الشركة' : 'Failed to create tenant'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/tenants">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {isAr ? 'إنشاء شركة جديدة' : 'Create New Tenant'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isAr ? 'أضف شركة جديدة للنظام' : 'Add a new company to the system'}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > s ? <CheckCircle className="w-5 h-5" /> : s}
            </div>
            {s < 3 && <div className={`w-16 h-1 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Company Info */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                {isAr ? 'معلومات الشركة' : 'Company Information'}
              </CardTitle>
              <CardDescription>
                {isAr ? 'أدخل المعلومات الأساسية للشركة' : 'Enter basic company information'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{isAr ? 'اسم الشركة (عربي)' : 'Company Name (Arabic)'} *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder={isAr ? 'مثال: شركة النور للتجارة' : 'e.g. Al-Noor Trading Co.'}
                    required
                  />
                </div>
                <div>
                  <Label>{isAr ? 'اسم الشركة (إنجليزي)' : 'Company Name (English)'} *</Label>
                  <Input
                    value={formData.nameEn}
                    onChange={(e) => handleChange('nameEn', e.target.value)}
                    placeholder="e.g. Al-Noor Trading Co."
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {isAr ? 'البريد الإلكتروني' : 'Email'} *
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="company@example.com"
                    required
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {isAr ? 'الهاتف' : 'Phone'}
                  </Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+966 5xxxxxxxx"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {isAr ? 'العنوان (عربي)' : 'Address (Arabic)'}
                  </Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder={isAr ? 'الرياض، السعودية' : 'Riyadh, Saudi Arabia'}
                  />
                </div>
                <div>
                  <Label>{isAr ? 'العنوان (إنجليزي)' : 'Address (English)'}</Label>
                  <Input
                    value={formData.addressEn}
                    onChange={(e) => handleChange('addressEn', e.target.value)}
                    placeholder="Riyadh, Saudi Arabia"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="button" onClick={() => setStep(2)}>
                  {isAr ? 'التالي' : 'Next'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Admin Account */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                {isAr ? 'حساب المدير' : 'Admin Account'}
              </CardTitle>
              <CardDescription>
                {isAr ? 'أنشئ حساب مدير للشركة' : 'Create an admin account for this tenant'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{isAr ? 'اسم المستخدم' : 'Username'} *</Label>
                <Input
                  value={formData.adminUsername}
                  onChange={(e) => handleChange('adminUsername', e.target.value)}
                  placeholder={isAr ? 'مثال: admin' : 'e.g. admin'}
                  required
                />
              </div>

              <div>
                <Label className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {isAr ? 'بريد المدير' : 'Admin Email'} *
                </Label>
                <Input
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => handleChange('adminEmail', e.target.value)}
                  placeholder="admin@company.com"
                  required
                />
              </div>

              <div>
                <Label className="flex items-center gap-1">
                  <Lock className="w-4 h-4" />
                  {isAr ? 'كلمة المرور' : 'Password'} *
                </Label>
                <Input
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => handleChange('adminPassword', e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {isAr ? 'يجب أن تكون 6 أحرف على الأقل' : 'Must be at least 6 characters'}
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  {isAr ? 'السابق' : 'Back'}
                </Button>
                <Button type="button" onClick={() => setStep(3)}>
                  {isAr ? 'التالي' : 'Next'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Plan Selection */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>{isAr ? 'اختر الباقة' : 'Select Plan'}</CardTitle>
              <CardDescription>
                {isAr ? 'اختر باقة الاشتراك المناسبة' : 'Choose the appropriate subscription plan'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'free', name: isAr ? 'مجاني' : 'Free', users: 5, products: 1000, price: '$0' },
                  { id: 'basic', name: isAr ? 'أساسي' : 'Basic', users: 10, products: 5000, price: '$29' },
                  { id: 'professional', name: isAr ? 'احترافي' : 'Professional', users: 25, products: 10000, price: '$79' },
                  { id: 'enterprise', name: isAr ? 'مؤسسي' : 'Enterprise', users: 100, products: 100000, price: '$199' }
                ].map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => handleChange('plan', plan.id)}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.plan === plan.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg">{plan.name}</h3>
                      <span className="text-xl font-bold text-blue-600">{plan.price}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {plan.users} {isAr ? 'مستخدم' : 'users'} • {plan.products.toLocaleString()} {isAr ? 'منتج' : 'products'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  {isAr ? 'السابق' : 'Back'}
                </Button>
                <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {isAr ? 'جاري الإنشاء...' : 'Creating...'}
                    </span>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {isAr ? 'إنشاء الشركة' : 'Create Tenant'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
};

export default CreateTenant;
