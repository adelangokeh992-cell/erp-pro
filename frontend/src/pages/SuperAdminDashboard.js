import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Building2, CheckCircle, Clock, AlertTriangle, TrendingUp, Users, Package } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || '';

const SuperAdminDashboard = () => {
  const { t, language } = useLanguage();
  const [stats, setStats] = useState(null);
  const [recentTenants, setRecentTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAr = language === 'ar';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, tenantsRes] = await Promise.all([
        axios.get(`${API}/api/tenants/stats`),
        axios.get(`${API}/api/tenants?limit=5`)
      ]);
      setStats(statsRes.data);
      setRecentTenants(tenantsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, color, subValue }) => (
    <Card className={`bg-gradient-to-br ${color} text-white shadow-lg hover:shadow-xl transition-shadow`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">{title}</p>
            <p className="text-4xl font-bold mt-2">{value}</p>
            {subValue && <p className="text-white/70 text-xs mt-1">{subValue}</p>}
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
            <Icon className="w-7 h-7" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      active: isAr ? 'نشط' : 'Active',
      trial: isAr ? 'تجريبي' : 'Trial',
      expired: isAr ? 'منتهي' : 'Expired',
      suspended: isAr ? 'موقوف' : 'Suspended'
    };
    return statusMap[status] || status;
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
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          {isAr ? 'لوحة التحكم الرئيسية' : 'Main Dashboard'}
        </h1>
        <p className="text-gray-500 mt-1">
          {isAr ? 'نظرة عامة على جميع الشركات والإحصائيات' : 'Overview of all tenants and statistics'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Building2}
          title={t('totalTenants')}
          value={stats?.total || 0}
          color="from-blue-600 to-blue-700"
        />
        <StatCard
          icon={CheckCircle}
          title={t('activeTenants')}
          value={stats?.byStatus?.active || 0}
          color="from-green-600 to-green-700"
        />
        <StatCard
          icon={Clock}
          title={t('trialTenants')}
          value={stats?.byStatus?.trial || 0}
          color="from-amber-500 to-amber-600"
        />
        <StatCard
          icon={AlertTriangle}
          title={t('expiringSoon')}
          value={stats?.expiringSoon || 0}
          color="from-red-500 to-red-600"
          subValue={isAr ? 'خلال 7 أيام' : 'Within 7 days'}
        />
      </div>

      {/* Plans Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              {isAr ? 'توزيع الباقات' : 'Plans Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { key: 'free', label: t('free'), color: 'bg-gray-500' },
                { key: 'basic', label: t('basic'), color: 'bg-blue-500' },
                { key: 'professional', label: t('professional'), color: 'bg-purple-500' },
                { key: 'enterprise', label: t('enterprise'), color: 'bg-amber-500' }
              ].map(plan => {
                const count = stats?.byPlan?.[plan.key] || 0;
                const total = stats?.total || 1;
                const percentage = Math.round((count / total) * 100);
                
                return (
                  <div key={plan.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{plan.label}</span>
                      <span className="text-gray-500">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${plan.color} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Tenants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              {isAr ? 'آخر الشركات المضافة' : 'Recent Tenants'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTenants.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  {isAr ? 'لا توجد شركات بعد' : 'No tenants yet'}
                </p>
              ) : (
                recentTenants.map(tenant => (
                  <div 
                    key={tenant._id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">
                        {(tenant.name || tenant.nameEn || '?')[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          {isAr ? tenant.name : tenant.nameEn || tenant.name}
                        </p>
                        <p className="text-xs text-gray-500">{tenant.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {tenant.userCount || 0}
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {tenant.productCount || 0}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tenant.status)}`}>
                        {getStatusText(tenant.status)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
