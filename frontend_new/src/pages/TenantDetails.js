import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Building2, Users, Package, FileText, Calendar, Mail, Phone, MapPin, Save, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || '';

const TenantDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extendDays, setExtendDays] = useState(30);

  const isAr = language === 'ar';

  useEffect(() => {
    fetchTenant();
  }, [id]);

  const fetchTenant = async () => {
    try {
      const res = await axios.get(`${API}/api/tenants/${id}`);
      setTenant(res.data);
    } catch (error) {
      console.error('Error fetching tenant:', error);
      toast.error(isAr ? 'فشل تحميل بيانات الشركة' : 'Failed to load tenant data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await axios.put(`${API}/api/tenants/${id}`, { status: newStatus });
      setTenant(prev => ({ ...prev, status: newStatus }));
      toast.success(isAr ? 'تم تحديث الحالة' : 'Status updated');
    } catch (error) {
      toast.error(isAr ? 'فشل تحديث الحالة' : 'Failed to update status');
    }
  };

  const handleExtendSubscription = async () => {
    try {
      const res = await axios.post(`${API}/api/tenants/${id}/extend-subscription?days=${extendDays}`);
      toast.success(res.data.message);
      fetchTenant();
    } catch (error) {
      toast.error(isAr ? 'فشل تمديد الاشتراك' : 'Failed to extend subscription');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{isAr ? 'الشركة غير موجودة' : 'Tenant not found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/tenants">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
              {(tenant.name || '?')[0]}
            </div>
            {isAr ? tenant.name : tenant.nameEn || tenant.name}
          </h1>
          <p className="text-gray-500 mt-1 font-mono">{tenant.code}</p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(tenant.status)}`}>
          {tenant.status === 'active' && <CheckCircle className="w-4 h-4 inline mr-1" />}
          {tenant.status === 'expired' && <AlertTriangle className="w-4 h-4 inline mr-1" />}
          {isAr ? {
            active: 'نشط',
            trial: 'تجريبي',
            expired: 'منتهي',
            suspended: 'موقوف'
          }[tenant.status] : tenant.status}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tenant.stats?.users || 0}</p>
              <p className="text-sm text-gray-500">{isAr ? 'المستخدمين' : 'Users'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tenant.stats?.products || 0}</p>
              <p className="text-sm text-gray-500">{isAr ? 'المنتجات' : 'Products'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tenant.stats?.invoices || 0}</p>
              <p className="text-sm text-gray-500">{isAr ? 'الفواتير' : 'Invoices'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold">{formatDate(tenant.subscription?.expiryDate)}</p>
              <p className="text-sm text-gray-500">{isAr ? 'تاريخ الانتهاء' : 'Expiry Date'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              {isAr ? 'معلومات الشركة' : 'Company Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-500">{isAr ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                <p className="font-medium">{tenant.name || '-'}</p>
              </div>
              <div>
                <Label className="text-gray-500">{isAr ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                <p className="font-medium">{tenant.nameEn || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-4 h-4" />
              <span>{tenant.email || '-'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{tenant.phone || '-'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{isAr ? tenant.address : tenant.addressEn || tenant.address || '-'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              {isAr ? 'الاشتراك' : 'Subscription'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-500">{isAr ? 'الباقة' : 'Plan'}</Label>
                <p className="font-medium capitalize">{tenant.subscription?.plan || 'free'}</p>
              </div>
              <div>
                <Label className="text-gray-500">{isAr ? 'النوع' : 'Type'}</Label>
                <p className="font-medium capitalize">{tenant.subscription?.subscriptionType || 'monthly'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-500">{isAr ? 'أقصى عدد مستخدمين' : 'Max Users'}</Label>
                <p className="font-medium">{tenant.subscription?.maxUsers || 5}</p>
              </div>
              <div>
                <Label className="text-gray-500">{isAr ? 'أقصى عدد منتجات' : 'Max Products'}</Label>
                <p className="font-medium">{tenant.subscription?.maxProducts || 1000}</p>
              </div>
            </div>

            {/* Extend Subscription */}
            <div className="pt-4 border-t">
              <Label className="text-gray-700 font-medium mb-2 block">
                {isAr ? 'تمديد الاشتراك' : 'Extend Subscription'}
              </Label>
              <div className="flex gap-2">
                <Select value={extendDays.toString()} onValueChange={(v) => setExtendDays(parseInt(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 {isAr ? 'أيام' : 'days'}</SelectItem>
                    <SelectItem value="14">14 {isAr ? 'يوم' : 'days'}</SelectItem>
                    <SelectItem value="30">30 {isAr ? 'يوم' : 'days'}</SelectItem>
                    <SelectItem value="90">90 {isAr ? 'يوم' : 'days'}</SelectItem>
                    <SelectItem value="365">{isAr ? 'سنة' : '1 year'}</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleExtendSubscription} className="flex-1">
                  <Clock className="w-4 h-4 mr-2" />
                  {isAr ? 'تمديد' : 'Extend'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Management */}
        <Card>
          <CardHeader>
            <CardTitle>{isAr ? 'إدارة الحالة' : 'Status Management'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={tenant.status === 'active' ? 'default' : 'outline'}
                onClick={() => handleStatusChange('active')}
                className="h-12"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {isAr ? 'تفعيل' : 'Activate'}
              </Button>
              <Button
                variant={tenant.status === 'suspended' ? 'destructive' : 'outline'}
                onClick={() => handleStatusChange('suspended')}
                className="h-12"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                {isAr ? 'إيقاف' : 'Suspend'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TenantDetails;
