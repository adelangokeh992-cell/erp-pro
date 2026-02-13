import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Building2, Plus, Search, Users, Package, Calendar, Eye, Edit, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || '';

const TenantManagement = () => {
  const { language } = useLanguage();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  const isAr = language === 'ar';

  useEffect(() => {
    fetchTenants();
  }, [statusFilter, planFilter]);

  const fetchTenants = async () => {
    try {
      let url = `${API}/api/tenants?limit=100`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (planFilter !== 'all') url += `&plan=${planFilter}`;
      
      const res = await axios.get(url);
      setTenants(res.data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'trial': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'suspended': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPlanColor = (plan) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-700';
      case 'basic': return 'bg-blue-100 text-blue-700';
      case 'professional': return 'bg-purple-100 text-purple-700';
      case 'enterprise': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status) => {
    const map = {
      active: isAr ? 'نشط' : 'Active',
      trial: isAr ? 'تجريبي' : 'Trial',
      expired: isAr ? 'منتهي' : 'Expired',
      suspended: isAr ? 'موقوف' : 'Suspended'
    };
    return map[status] || status;
  };

  const getPlanText = (plan) => {
    const map = {
      free: isAr ? 'مجاني' : 'Free',
      basic: isAr ? 'أساسي' : 'Basic',
      professional: isAr ? 'احترافي' : 'Professional',
      enterprise: isAr ? 'مؤسسي' : 'Enterprise'
    };
    return map[plan] || plan;
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString(isAr ? 'ar-SA' : 'en-US');
  };

  const formatRelativeTime = (date) => {
    if (!date) return isAr ? 'لم يتم المزامنة' : 'Never synced';
    
    const now = new Date();
    const syncDate = new Date(date);
    const diffMs = now - syncDate;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return isAr ? 'الآن' : 'Just now';
    if (diffMins < 60) return isAr ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
    if (diffHours < 24) return isAr ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    if (diffDays < 7) return isAr ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
    
    return formatDate(date);
  };

  const filteredTenants = tenants.filter(tenant => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      tenant.name?.toLowerCase().includes(search) ||
      tenant.nameEn?.toLowerCase().includes(search) ||
      tenant.code?.toLowerCase().includes(search) ||
      tenant.email?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {isAr ? 'إدارة الشركات' : 'Tenant Management'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isAr ? `${tenants.length} شركة مسجلة` : `${tenants.length} registered tenants`}
          </p>
        </div>
        <Link to="/admin/tenants/new">
          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <Plus className="w-5 h-5 mr-2" />
            {isAr ? 'إنشاء شركة جديدة' : 'Create New Tenant'}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isAr ? 'بحث بالاسم أو الكود أو البريد...' : 'Search by name, code or email...'}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={isAr ? 'الحالة' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? 'جميع الحالات' : 'All Status'}</SelectItem>
                <SelectItem value="active">{isAr ? 'نشط' : 'Active'}</SelectItem>
                <SelectItem value="trial">{isAr ? 'تجريبي' : 'Trial'}</SelectItem>
                <SelectItem value="expired">{isAr ? 'منتهي' : 'Expired'}</SelectItem>
                <SelectItem value="suspended">{isAr ? 'موقوف' : 'Suspended'}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={isAr ? 'الباقة' : 'Plan'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? 'جميع الباقات' : 'All Plans'}</SelectItem>
                <SelectItem value="free">{isAr ? 'مجاني' : 'Free'}</SelectItem>
                <SelectItem value="basic">{isAr ? 'أساسي' : 'Basic'}</SelectItem>
                <SelectItem value="professional">{isAr ? 'احترافي' : 'Professional'}</SelectItem>
                <SelectItem value="enterprise">{isAr ? 'مؤسسي' : 'Enterprise'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tenants Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : filteredTenants.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              {isAr ? 'لا توجد شركات' : 'No tenants found'}
            </h3>
            <p className="text-gray-400">
              {isAr ? 'ابدأ بإنشاء شركة جديدة' : 'Start by creating a new tenant'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTenants.map(tenant => (
            <Card 
              key={tenant._id}
              className="hover:shadow-lg transition-shadow cursor-pointer group"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg">
                      {(tenant.name || tenant.nameEn || '?')[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">
                        {isAr ? tenant.name : tenant.nameEn || tenant.name}
                      </h3>
                      <p className="text-sm text-gray-500 font-mono">{tenant.code}</p>
                      {/* Last Sync */}
                      <div className="flex items-center gap-1 mt-1">
                        <RefreshCw className={`w-3 h-3 ${tenant.lastSync ? 'text-green-500' : 'text-gray-400'}`} />
                        <span className={`text-xs ${tenant.lastSync ? 'text-green-600' : 'text-gray-400'}`}>
                          {formatRelativeTime(tenant.lastSync)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(tenant.status)}`}>
                    {getStatusText(tenant.status)}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between text-gray-600">
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {isAr ? 'المستخدمين' : 'Users'}
                    </span>
                    <span className="font-semibold">{tenant.userCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      {isAr ? 'المنتجات' : 'Products'}
                    </span>
                    <span className="font-semibold">{tenant.productCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {isAr ? 'تاريخ الانتهاء' : 'Expiry'}
                    </span>
                    <span className="font-semibold">
                      {formatDate(tenant.subscription?.expiryDate)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getPlanColor(tenant.subscription?.plan)}`}>
                    {getPlanText(tenant.subscription?.plan)}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link to={`/admin/tenants/${tenant._id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TenantManagement;
