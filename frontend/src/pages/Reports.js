import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { reportsAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  BarChart3, Package, ShoppingCart, TrendingUp, Download,
  DollarSign, AlertTriangle, FileText, Users, LineChart as LineChartIcon
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

const Reports = () => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('sales');
  const [period, setPeriod] = useState('month');
  const [salesData, setSalesData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [purchasesData, setPurchasesData] = useState(null);
  const [profitData, setProfitData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [customersData, setCustomersData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [activeTab, period]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'sales') {
        const res = await reportsAPI.getSales({ period });
        setSalesData(res.data);
      } else if (activeTab === 'inventory') {
        const res = await reportsAPI.getInventory();
        setInventoryData(res.data);
      } else if (activeTab === 'purchases') {
        const res = await reportsAPI.getPurchases({});
        setPurchasesData(res.data);
      } else if (activeTab === 'profit') {
        const res = await reportsAPI.getProfit({});
        setProfitData(res.data);
      } else if (activeTab === 'analytics') {
        const res = await reportsAPI.getAnalytics();
        setAnalyticsData(res.data);
      } else if (activeTab === 'customers') {
        const res = await reportsAPI.getCustomers({ limit: 20 });
        setCustomersData(res.data);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => `$${(value || 0).toLocaleString()}`;

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('reports')}</h1>
          <p className="text-gray-600 mt-1">{language === 'ar' ? 'تقارير تفصيلية للنظام' : 'Detailed system reports'}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 w-full">
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            {language === 'ar' ? 'المبيعات' : 'Sales'}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <LineChartIcon className="w-4 h-4" />
            {language === 'ar' ? 'التحليلات' : 'Analytics'}
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            {language === 'ar' ? 'العملاء' : 'Customers'}
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            {language === 'ar' ? 'المخزون' : 'Inventory'}
          </TabsTrigger>
          <TabsTrigger value="purchases" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            {language === 'ar' ? 'المشتريات' : 'Purchases'}
          </TabsTrigger>
          <TabsTrigger value="profit" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            {language === 'ar' ? 'الأرباح' : 'Profit'}
          </TabsTrigger>
        </TabsList>

        {/* Sales Report */}
        <TabsContent value="sales" className="space-y-4">
          <div className="flex items-center justify-between">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">{language === 'ar' ? 'اليوم' : 'Today'}</SelectItem>
                <SelectItem value="week">{language === 'ar' ? 'الأسبوع' : 'Week'}</SelectItem>
                <SelectItem value="month">{language === 'ar' ? 'الشهر' : 'Month'}</SelectItem>
                <SelectItem value="year">{language === 'ar' ? 'السنة' : 'Year'}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => exportToCSV(salesData?.invoices, 'sales-report')}>
              <Download className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : salesData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-green-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(salesData.summary?.totalSales)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'عدد الطلبات' : 'Total Orders'}</p>
                    <p className="text-2xl font-bold text-blue-600">{salesData.summary?.totalOrders}</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'متوسط الطلب' : 'Avg Order Value'}</p>
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(salesData.summary?.averageOrderValue)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'غير مدفوع' : 'Unpaid'}</p>
                    <p className="text-2xl font-bold text-orange-600">{salesData.summary?.unpaidOrders}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>{language === 'ar' ? 'أكثر المنتجات مبيعاً' : 'Top Products'}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {salesData.topProducts?.slice(0, 10).map((product, i) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span>{product.name}</span>
                          <div className="text-right">
                            <span className="font-bold">{formatCurrency(product.revenue)}</span>
                            <span className="text-xs text-gray-500 ml-2">({product.quantity} {language === 'ar' ? 'قطعة' : 'units'})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>{language === 'ar' ? 'المبيعات اليومية' : 'Daily Breakdown'}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {salesData.dailyBreakdown?.slice(-10).map((day, i) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span>{day.date}</span>
                          <div>
                            <span className="font-bold">{formatCurrency(day.sales)}</span>
                            <span className="text-xs text-gray-500 ml-2">({day.orders} {language === 'ar' ? 'طلب' : 'orders'})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : analyticsData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-blue-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">{analyticsData.currentMonth?.label} — {language === 'ar' ? 'المبيعات' : 'Sales'}</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(analyticsData.currentMonth?.sales)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">{analyticsData.previousMonth?.label} — {language === 'ar' ? 'المبيعات' : 'Sales'}</p>
                    <p className="text-2xl font-bold text-slate-600">{formatCurrency(analyticsData.previousMonth?.sales)}</p>
                  </CardContent>
                </Card>
                <Card className={analyticsData.growth?.salesPercent >= 0 ? 'bg-green-50' : 'bg-red-50'}>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'نمو المبيعات' : 'Sales Growth'}</p>
                    <p className={`text-2xl font-bold ${analyticsData.growth?.salesPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {analyticsData.growth?.salesPercent >= 0 ? '+' : ''}{analyticsData.growth?.salesPercent}%
                    </p>
                  </CardContent>
                </Card>
                <Card className={analyticsData.growth?.ordersPercent >= 0 ? 'bg-emerald-50' : 'bg-amber-50'}>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'نمو الطلبات' : 'Orders Growth'}</p>
                    <p className={`text-2xl font-bold ${analyticsData.growth?.ordersPercent >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {analyticsData.growth?.ordersPercent >= 0 ? '+' : ''}{analyticsData.growth?.ordersPercent}%
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'اتجاه المبيعات (آخر 12 شهراً)' : 'Sales Trend (Last 12 Months)'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.monthlyTrend || []} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                        <Tooltip formatter={(v) => [formatCurrency(v), language === 'ar' ? 'المبيعات' : 'Sales']} />
                        <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} name={language === 'ar' ? 'المبيعات' : 'Sales'} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* Customers Report */}
        <TabsContent value="customers" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => exportToCSV(customersData?.topCustomers, 'customers-report')} disabled={!customersData?.topCustomers?.length}>
              <Download className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : customersData ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'أفضل العملاء حسب الإيراد' : 'Top Customers by Revenue'}</CardTitle>
                  <p className="text-sm text-gray-500">
                    {language === 'ar' ? 'آخر 12 شهراً' : 'Last 12 months'}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {customersData.topCustomers?.map((c, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium">{c.customerName}</span>
                          <span className="text-xs text-gray-500 ml-2">({c.orderCount} {language === 'ar' ? 'طلب' : 'orders'})</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-green-600">{formatCurrency(c.totalRevenue)}</span>
                          <span className="text-xs text-gray-500 block">{language === 'ar' ? 'متوسط الطلب' : 'Avg'}: {formatCurrency(c.averageOrderValue)}</span>
                        </div>
                      </div>
                    ))}
                    {(!customersData.topCustomers || customersData.topCustomers.length === 0) && (
                      <p className="text-center text-gray-500 py-8">{language === 'ar' ? 'لا توجد بيانات' : 'No data'}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* Inventory Report */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => exportToCSV(inventoryData?.allProducts, 'inventory-report')}>
              <Download className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : inventoryData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-blue-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'إجمالي المنتجات' : 'Total Products'}</p>
                    <p className="text-2xl font-bold text-blue-600">{inventoryData.summary?.totalProducts}</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'قيمة المخزون' : 'Inventory Value'}</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(inventoryData.summary?.totalValue)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-yellow-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'مخزون منخفض' : 'Low Stock'}</p>
                    <p className="text-2xl font-bold text-yellow-600">{inventoryData.stockStatus?.lowStock}</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'نفاد المخزون' : 'Out of Stock'}</p>
                    <p className="text-2xl font-bold text-red-600">{inventoryData.stockStatus?.outOfStock}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-yellow-600"><AlertTriangle className="w-5 h-5" />{language === 'ar' ? 'منتجات منخفضة المخزون' : 'Low Stock Items'}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {inventoryData.lowStockItems?.map((item, i) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                          <span>{language === 'ar' ? item.name : item.nameEn}</span>
                          <div>
                            <span className="text-yellow-600 font-bold">{item.stock}</span>
                            <span className="text-xs text-gray-500 ml-1">/ {item.reorderLevel}</span>
                          </div>
                        </div>
                      ))}
                      {(!inventoryData.lowStockItems || inventoryData.lowStockItems.length === 0) && (
                        <p className="text-center text-gray-500 py-4">{language === 'ar' ? 'لا يوجد' : 'None'}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>{language === 'ar' ? 'حسب الفئة' : 'By Category'}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {inventoryData.categoryBreakdown?.map((cat, i) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span>{cat.category}</span>
                          <div>
                            <span className="font-bold">{cat.count} {language === 'ar' ? 'منتج' : 'products'}</span>
                            <span className="text-xs text-gray-500 ml-2">({formatCurrency(cat.value)})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* Purchases Report */}
        <TabsContent value="purchases" className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : purchasesData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-indigo-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'إجمالي المشتريات' : 'Total Purchases'}</p>
                    <p className="text-2xl font-bold text-indigo-600">{formatCurrency(purchasesData.summary?.totalPurchases)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-cyan-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'عدد الطلبات' : 'Total Orders'}</p>
                    <p className="text-2xl font-bold text-cyan-600">{purchasesData.summary?.totalOrders}</p>
                  </CardContent>
                </Card>
                <Card className="bg-teal-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'متوسط الطلب' : 'Avg Order Value'}</p>
                    <p className="text-2xl font-bold text-teal-600">{formatCurrency(purchasesData.summary?.averageOrderValue)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle>{language === 'ar' ? 'المشتريات حسب المورد' : 'Purchases by Supplier'}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {purchasesData.bySupplier?.map((supplier, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span className="font-medium">{supplier.supplier}</span>
                        <div>
                          <span className="font-bold">{formatCurrency(supplier.total)}</span>
                          <span className="text-xs text-gray-500 ml-2">({supplier.orders} {language === 'ar' ? 'طلب' : 'orders'})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* Profit Report */}
        <TabsContent value="profit" className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : profitData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-green-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'الإيرادات' : 'Revenue'}</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(profitData.revenue)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'تكلفة البضاعة' : 'Cost of Goods'}</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(profitData.costOfGoods)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'الربح الإجمالي' : 'Gross Profit'}</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(profitData.grossProfit)}</p>
                  </CardContent>
                </Card>
                <Card className={profitData.netProfit >= 0 ? 'bg-emerald-50' : 'bg-orange-50'}>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">{language === 'ar' ? 'صافي الربح' : 'Net Profit'}</p>
                    <p className={`text-2xl font-bold ${profitData.netProfit >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {formatCurrency(profitData.netProfit)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle>{language === 'ar' ? 'ملخص الربحية' : 'Profitability Summary'}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 border-b">
                      <span>{language === 'ar' ? 'هامش الربح الإجمالي' : 'Gross Profit Margin'}</span>
                      <span className="font-bold text-lg">{profitData.profitMargin?.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border-b">
                      <span>{language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses'}</span>
                      <span className="font-bold text-lg text-red-600">{formatCurrency(profitData.expenses)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
