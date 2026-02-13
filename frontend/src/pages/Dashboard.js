import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Package, Users, Truck, ShoppingCart, DollarSign, TrendingUp, AlertTriangle, Warehouse, Receipt } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const Dashboard = () => {
  const { t, language } = useLanguage();
  const [data, setData] = useState(null);
  const [alertList, setAlertList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await axios.get(API + '/dashboard/stats');
        const alertsRes = await axios.get(API + '/dashboard/alerts');
        setData(statsRes.data);
        setAlertList(alertsRes.data.alerts || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fmt = (v) => '$' + (v || 0).toLocaleString();
  const isAr = language === 'ar';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-8">Error loading data</div>;
  }

  const counts = data.counts || {};
  const sales = data.sales || {};
  const inventory = data.inventory || {};
  const dailySales = data.dailySales || [];
  const topProducts = data.topProducts || [];
  const recentInvoices = data.recentInvoices || [];

  const healthyStock = (counts.products || 0) - (inventory.lowStock || 0) - (inventory.outOfStock || 0);

  const renderDailySales = () => {
    if (dailySales.length === 0) return <p className="text-center py-4">{isAr ? 'لا توجد بيانات' : 'No data'}</p>;
    
    const maxSale = Math.max(1, ...dailySales.map(function(d) { return d.sales; }));
    
    return dailySales.map(function(day, i) {
      const pct = (day.sales / maxSale) * 100;
      return (
        <div key={i} className="flex items-center gap-4">
          <span className="w-16 text-sm">{day.date.slice(5)}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-6">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: Math.max(pct, 5) + '%' }}></div>
          </div>
          <span className="w-24 text-sm font-bold">{fmt(day.sales)}</span>
        </div>
      );
    });
  };

  const renderTopProducts = () => {
    if (topProducts.length === 0) return <p className="text-center text-gray-500 py-8">{isAr ? 'لا توجد بيانات' : 'No data'}</p>;
    
    return topProducts.map(function(p, i) {
      return (
        <div key={i} className="flex justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs">{i + 1}</span>
            <span>{p.name}</span>
          </div>
          <span className="font-bold text-green-600">{fmt(p.revenue)}</span>
        </div>
      );
    });
  };

  const renderRecentInvoices = () => {
    if (recentInvoices.length === 0) return <p className="text-center text-gray-500 py-8">{isAr ? 'لا توجد فواتير' : 'No invoices'}</p>;
    
    return recentInvoices.map(function(inv, i) {
      const statusClass = inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
      const statusText = inv.status === 'paid' ? (isAr ? 'مدفوع' : 'Paid') : (isAr ? 'غير مدفوع' : 'Unpaid');
      return (
        <div key={i} className="flex justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium">{inv.invoiceNumber}</p>
            <p className="text-sm text-gray-500">{inv.customerName}</p>
          </div>
          <div className="text-right">
            <p className="font-bold">{fmt(inv.total)}</p>
            <span className={'text-xs px-2 py-1 rounded-full ' + statusClass}>{statusText}</span>
          </div>
        </div>
      );
    });
  };

  const renderAlerts = () => {
    if (alertList.length === 0) return null;
    
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="w-5 h-5" />
            {isAr ? 'تنبيهات' : 'Alerts'} ({alertList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {alertList.slice(0, 5).map(function(alert, i) {
              const bgClass = alert.type === 'critical' ? 'bg-red-100' : 'bg-yellow-100';
              return (
                <div key={i} className={'p-3 rounded-lg ' + bgClass}>
                  <p className="font-medium text-sm">{isAr ? alert.title : alert.titleEn}</p>
                  <p className="text-xs text-gray-600">{isAr ? alert.message : alert.messageEn}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div>
        <h1 className="text-3xl font-bold">{t('dashboard')}</h1>
        <p className="text-gray-600 mt-1">{isAr ? 'نظرة عامة' : 'Overview'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-green-50 border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{isAr ? 'مبيعات اليوم' : 'Today Sales'}</p>
                <p className="text-2xl font-bold text-green-600">{fmt(sales.today)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{isAr ? 'طلبات اليوم' : 'Today Orders'}</p>
                <p className="text-2xl font-bold text-blue-600">{sales.todayOrders || 0}</p>
              </div>
              <Receipt className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{isAr ? 'مبيعات الأسبوع' : 'Weekly Sales'}</p>
                <p className="text-2xl font-bold text-purple-600">{fmt(sales.weekly)}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{isAr ? 'مبيعات الشهر' : 'Monthly Sales'}</p>
                <p className="text-2xl font-bold text-orange-600">{fmt(sales.monthly)}</p>
              </div>
              <ShoppingCart className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {renderAlerts()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{isAr ? 'المبيعات (7 أيام)' : 'Sales (7 Days)'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">{renderDailySales()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isAr ? 'المخزون' : 'Inventory'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                <span>{isAr ? 'مخزون جيد' : 'Healthy'}</span>
                <span className="font-bold text-green-600">{healthyStock}</span>
              </div>
              <div className="flex justify-between p-3 bg-yellow-50 rounded-lg">
                <span>{isAr ? 'منخفض' : 'Low'}</span>
                <span className="font-bold text-yellow-600">{inventory.lowStock || 0}</span>
              </div>
              <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                <span>{isAr ? 'نفاد' : 'Out'}</span>
                <span className="font-bold text-red-600">{inventory.outOfStock || 0}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span>{isAr ? 'قيمة المخزون' : 'Value'}</span>
                  <span className="font-bold">{fmt(inventory.totalValue)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{isAr ? 'أكثر المنتجات مبيعاً' : 'Top Products'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">{renderTopProducts()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isAr ? 'آخر الفواتير' : 'Recent Invoices'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">{renderRecentInvoices()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-gray-100 rounded-lg"><Package className="w-6 h-6 text-indigo-600" /></div>
            <div><p className="text-2xl font-bold">{counts.products || 0}</p><p className="text-sm text-gray-600">{t('products')}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-gray-100 rounded-lg"><Users className="w-6 h-6 text-cyan-600" /></div>
            <div><p className="text-2xl font-bold">{counts.customers || 0}</p><p className="text-sm text-gray-600">{t('customers')}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-gray-100 rounded-lg"><Truck className="w-6 h-6 text-amber-600" /></div>
            <div><p className="text-2xl font-bold">{counts.suppliers || 0}</p><p className="text-sm text-gray-600">{t('suppliers')}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-gray-100 rounded-lg"><Warehouse className="w-6 h-6 text-rose-600" /></div>
            <div><p className="text-2xl font-bold">{counts.warehouses || 0}</p><p className="text-sm text-gray-600">{t('warehouses')}</p></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
