import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { productsAPI, eslAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Monitor, DollarSign, RefreshCw, Settings, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const ESLManagement = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [exchangeRate, setExchangeRate] = useState(15000);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [eslDevices, setEslDevices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [devicesRes, productsRes, settingsRes] = await Promise.all([
        eslAPI.getDevices(),
        productsAPI.getAll(),
        eslAPI.getSettings(),
      ]);
      
      setEslDevices(devicesRes.data);
      setProducts(productsRes.data);
      
      const exchangeRateSetting = settingsRes.data.find(s => s.key === 'exchangeRate');
      if (exchangeRateSetting) {
        setExchangeRate(Number(exchangeRateSetting.value));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateLocalPrice = (usdPrice) => {
    return (usdPrice * exchangeRate).toFixed(0);
  };

  const updateAllPrices = async () => {
    toast({
      title: language === 'ar' ? 'جاري التحديث...' : 'Updating...',
      description: language === 'ar' 
        ? 'يتم تحديث جميع شاشات الأسعار الإلكترونية'
        : 'Updating all ESL devices',
    });

    try {
      await eslAPI.updateAllPrices();
      await fetchData();
      
      toast({
        title: language === 'ar' ? 'تم التحديث بنجاح' : 'Update Complete',
        description: language === 'ar'
          ? `تم تحديث ${eslDevices.filter(d => d.status === 'online').length} شاشة`
          : `Updated ${eslDevices.filter(d => d.status === 'online').length} devices`,
      });
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل التحديث' : 'Update failed',
        variant: 'destructive',
      });
    }
  };

  const updateSingleESL = async (eslId) => {
    try {
      await eslAPI.updatePrice(eslId);
      toast({
        title: language === 'ar' ? 'تم تحديث الشاشة' : 'Device Updated',
        description: `ESL ${eslId}`,
      });
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل التحديث' : 'Update failed',
        variant: 'destructive',
      });
    }
  };

  const onlineDevices = eslDevices.filter(d => d.status === 'online').length;
  const offlineDevices = eslDevices.filter(d => d.status === 'offline').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xl">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {language === 'ar' ? 'إدارة شاشات الأسعار الإلكترونية (ESL)' : 'ESL Management'}
          </h1>
          <p className="text-gray-600 mt-1">
            {language === 'ar'
              ? `${eslDevices.length} جهاز متصل | ${onlineDevices} متصل | ${offlineDevices} غير متصل`
              : `${eslDevices.length} devices | ${onlineDevices} online | ${offlineDevices} offline`}
          </p>
        </div>
        <Button onClick={updateAllPrices} className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          {language === 'ar' ? 'تحديث جميع الشاشات' : 'Update All Devices'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {language === 'ar' ? 'الأجهزة المتصلة' : 'Online Devices'}
                </p>
                <p className="text-3xl font-bold text-green-600 mt-1">{onlineDevices}</p>
              </div>
              <div className="bg-green-100 text-green-600 p-4 rounded-lg">
                <Wifi className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {language === 'ar' ? 'الأجهزة غير المتصلة' : 'Offline Devices'}
                </p>
                <p className="text-3xl font-bold text-red-600 mt-1">{offlineDevices}</p>
              </div>
              <div className="bg-red-100 text-red-600 p-4 rounded-lg">
                <WifiOff className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {language === 'ar' ? 'سعر الصرف' : 'Exchange Rate'}
                </p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {exchangeRate.toLocaleString()} {language === 'ar' ? 'ل.س' : 'SYP'}
                </p>
              </div>
              <div className="bg-blue-100 text-blue-600 p-4 rounded-lg">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="devices" className="space-y-6">
        <TabsList>
          <TabsTrigger value="devices">
            {language === 'ar' ? 'الأجهزة' : 'Devices'}
          </TabsTrigger>
          <TabsTrigger value="pricing">
            {language === 'ar' ? 'إدارة الأسعار' : 'Price Management'}
          </TabsTrigger>
          <TabsTrigger value="settings">
            {language === 'ar' ? 'الإعدادات' : 'Settings'}
          </TabsTrigger>
        </TabsList>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eslDevices.map((device) => {
              const product = products.find(p => p._id === device.productId || p.eslDeviceId === device.deviceId);
              return (
                <Card key={device._id} className={`border-2 ${device.status === 'online' ? 'border-green-300' : 'border-red-300'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Monitor className="w-5 h-5" />
                        {device.deviceId}
                      </CardTitle>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        device.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {device.status === 'online' 
                          ? (language === 'ar' ? 'متصل' : 'Online')
                          : (language === 'ar' ? 'غير متصل' : 'Offline')}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {product && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-semibold text-sm mb-1">
                          {language === 'ar' ? product.name : product.nameEn}
                        </p>
                        <p className="text-xs text-gray-600">{product.sku}</p>
                        <div className="mt-2 pt-2 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">USD:</span>
                            <span className="font-bold text-blue-600">${product.salePrice}</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-600">SYP:</span>
                            <span className="font-bold text-green-600">
                              {calculateLocalPrice(product.salePrice)} {language === 'ar' ? 'ل.س' : 'SYP'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {language === 'ar' ? 'البطارية:' : 'Battery:'}
                        </span>
                        <span className={`font-semibold ${
                          device.battery > 50 ? 'text-green-600' : device.battery > 20 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {device.battery}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {language === 'ar' ? 'آخر تحديث:' : 'Last Update:'}
                        </span>
                        <span className="text-xs">{device.lastUpdate}</span>
                      </div>
                    </div>

                    <Button 
                      size="sm" 
                      className="w-full mt-2"
                      disabled={device.status === 'offline'}
                      onClick={() => updateSingleESL(device.deviceId)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {language === 'ar' ? 'تحديث السعر' : 'Update Price'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {language === 'ar' ? 'إدارة الأسعار والتحويل' : 'Price & Currency Management'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'سعر الصرف (1 USD = ? SYP)' : 'Exchange Rate (1 USD = ? SYP)'}</Label>
                  <Input
                    type="number"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(Number(e.target.value))}
                    className="text-lg font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'التحديث التلقائي' : 'Auto Update'}</Label>
                  <div className="flex items-center gap-4 h-10">
                    <input
                      type="checkbox"
                      checked={autoUpdate}
                      onChange={(e) => setAutoUpdate(e.target.checked)}
                      className="w-5 h-5"
                    />
                    <span className="text-sm text-gray-600">
                      {language === 'ar' 
                        ? 'تحديث الأسعار تلقائياً عند تغيير سعر الصرف'
                        : 'Auto-update prices when exchange rate changes'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">
                  {language === 'ar' ? 'مثال على التحويل:' : 'Conversion Example:'}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>$100 USD</span>
                    <span className="font-bold">{calculateLocalPrice(100)} SYP</span>
                  </div>
                  <div className="flex justify-between">
                    <span>$500 USD</span>
                    <span className="font-bold">{calculateLocalPrice(500)} SYP</span>
                  </div>
                  <div className="flex justify-between">
                    <span>$1,000 USD</span>
                    <span className="font-bold">{calculateLocalPrice(1000)} SYP</span>
                  </div>
                </div>
              </div>

              <Button onClick={updateAllPrices} size="lg" className="w-full">
                <RefreshCw className="w-5 h-5 mr-2" />
                {language === 'ar' ? 'تطبيق التغييرات على جميع الشاشات' : 'Apply Changes to All Devices'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {language === 'ar' ? 'إعدادات ESL' : 'ESL Settings'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold">
                      {language === 'ar' ? 'التحديث التلقائي' : 'Auto Update'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {language === 'ar' 
                        ? 'تحديث الشاشات تلقائياً عند تغيير الأسعار'
                        : 'Update displays automatically when prices change'}
                    </p>
                  </div>
                  <input type="checkbox" checked={autoUpdate} onChange={(e) => setAutoUpdate(e.target.checked)} className="w-5 h-5" />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold">
                      {language === 'ar' ? 'عرض العملتين' : 'Show Both Currencies'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {language === 'ar' 
                        ? 'عرض السعر بالدولار والعملة المحلية'
                        : 'Display price in USD and local currency'}
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5" />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold">
                      {language === 'ar' ? 'تنبيهات البطارية المنخفضة' : 'Low Battery Alerts'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {language === 'ar' 
                        ? 'إرسال تنبيه عندما تنخفض البطارية عن 20%'
                        : 'Send alert when battery drops below 20%'}
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ESLManagement;