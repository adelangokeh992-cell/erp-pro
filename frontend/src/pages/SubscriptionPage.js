import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { 
  ArrowLeft, CreditCard, Check, Crown, Zap, Building2, 
  Users, Package, Warehouse, FileText, HardDrive, Loader2,
  CheckCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || '';

const SubscriptionPage = () => {
  const { id: tenantId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    fetchPlans();
    fetchTenant();
  }, [tenantId]);

  const fetchPlans = async () => {
    try {
      const res = await axios.get(`${API}/api/subscriptions/plans`);
      setPlans(res.data);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error(isAr ? 'فشل تحميل الباقات' : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchTenant = async () => {
    try {
      const res = await axios.get(`${API}/api/tenants/${tenantId}`);
      setTenant(res.data);
    } catch (error) {
      console.error('Error fetching tenant:', error);
    }
  };

  const handleSubscribe = async (planId) => {
    setProcessing(planId);
    try {
      const res = await axios.post(`${API}/api/subscriptions/checkout`, {
        plan_id: planId,
        tenant_id: tenantId,
        origin_url: window.location.origin
      });
      
      // Redirect to Stripe checkout
      window.location.href = res.data.checkout_url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error(isAr ? 'فشل إنشاء جلسة الدفع' : 'Failed to create checkout session');
      setProcessing(null);
    }
  };

  const getPlanIcon = (planId) => {
    if (planId.includes('enterprise')) return Building2;
    if (planId.includes('professional')) return Crown;
    return Zap;
  };

  const getPlanColor = (planId) => {
    if (planId.includes('enterprise')) return 'bg-purple-600';
    if (planId.includes('professional')) return 'bg-blue-600';
    return 'bg-green-600';
  };

  const formatFeature = (key, value) => {
    const labels = {
      maxUsers: { ar: 'المستخدمين', en: 'Users' },
      maxProducts: { ar: 'المنتجات', en: 'Products' },
      maxWarehouses: { ar: 'المستودعات', en: 'Warehouses' },
      maxInvoicesPerMonth: { ar: 'الفواتير شهرياً', en: 'Invoices/Month' },
      storageLimit: { ar: 'التخزين', en: 'Storage' }
    };

    const label = labels[key]?.[isAr ? 'ar' : 'en'] || key;
    let displayValue = value;
    
    if (value === -1) {
      displayValue = isAr ? 'غير محدود' : 'Unlimited';
    } else if (key === 'storageLimit') {
      displayValue = value >= 1024 ? `${(value / 1024).toFixed(0)} GB` : `${value} MB`;
    }

    return { label, value: displayValue };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Group plans by type (monthly vs yearly)
  const monthlyPlans = plans.filter(p => !p.id.includes('yearly'));
  const yearlyPlans = plans.filter(p => p.id.includes('yearly'));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/tenants/${tenantId}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isAr ? 'اشتراك الشركة' : 'Company Subscription'}
          </h1>
          <p className="text-gray-500">{tenant?.name || tenant?.nameEn}</p>
        </div>
      </div>

      {/* Current Subscription */}
      {tenant?.subscription && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">
                  {isAr ? 'الاشتراك الحالي' : 'Current Subscription'}
                </h3>
                <p className="text-gray-600">
                  {isAr ? 'الباقة:' : 'Plan:'} {tenant.subscription.plan || 'Trial'}
                </p>
                <p className="text-gray-600">
                  {isAr ? 'ينتهي في:' : 'Expires:'} {new Date(tenant.subscription.expiryDate).toLocaleDateString()}
                </p>
              </div>
              <CreditCard className="w-12 h-12 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Plans */}
      <div>
        <h2 className="text-xl font-bold mb-4">{isAr ? 'الباقات الشهرية' : 'Monthly Plans'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {monthlyPlans.map((plan) => {
            const Icon = getPlanIcon(plan.id);
            const colorClass = getPlanColor(plan.id);
            
            return (
              <Card key={plan.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                <div className={`absolute top-0 left-0 right-0 h-2 ${colorClass}`} />
                <CardHeader className="pt-6">
                  <div className={`w-12 h-12 rounded-xl ${colorClass} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle>{isAr ? plan.name : plan.nameEn}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-500">/{isAr ? 'شهر' : 'month'}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {Object.entries(plan.features).map(([key, value]) => {
                      const feature = formatFeature(key, value);
                      return (
                        <li key={key} className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-green-600" />
                          <span className="text-gray-600">
                            {feature.value} {feature.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <Button 
                    className={`w-full ${colorClass} hover:opacity-90`}
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={processing === plan.id}
                  >
                    {processing === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CreditCard className="w-4 h-4 mr-2" />
                    )}
                    {isAr ? 'اشترك الآن' : 'Subscribe Now'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Yearly Plans */}
      <div>
        <h2 className="text-xl font-bold mb-4">
          {isAr ? 'الباقات السنوية' : 'Yearly Plans'}
          <span className="text-sm font-normal text-green-600 ml-2">
            {isAr ? '(شهرين مجاناً)' : '(2 months free)'}
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {yearlyPlans.map((plan) => {
            const Icon = getPlanIcon(plan.id);
            const colorClass = getPlanColor(plan.id);
            
            return (
              <Card key={plan.id} className="relative overflow-hidden hover:shadow-lg transition-shadow border-2 border-green-200">
                <div className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  {isAr ? 'توفير 17%' : 'Save 17%'}
                </div>
                <div className={`absolute top-0 left-0 right-0 h-2 ${colorClass}`} />
                <CardHeader className="pt-6">
                  <div className={`w-12 h-12 rounded-xl ${colorClass} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle>{isAr ? plan.name : plan.nameEn}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-500">/{isAr ? 'سنة' : 'year'}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {Object.entries(plan.features).map(([key, value]) => {
                      const feature = formatFeature(key, value);
                      return (
                        <li key={key} className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-green-600" />
                          <span className="text-gray-600">
                            {feature.value} {feature.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <Button 
                    className={`w-full ${colorClass} hover:opacity-90`}
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={processing === plan.id}
                  >
                    {processing === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CreditCard className="w-4 h-4 mr-2" />
                    )}
                    {isAr ? 'اشترك الآن' : 'Subscribe Now'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Success Page Component
export const SubscriptionSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  
  const [status, setStatus] = useState('checking');
  const [paymentInfo, setPaymentInfo] = useState(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus();
    }
  }, [sessionId]);

  const pollPaymentStatus = async (attempts = 0) => {
    const maxAttempts = 10;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      setStatus('timeout');
      return;
    }

    try {
      const res = await axios.get(`${API}/api/subscriptions/checkout/status/${sessionId}`);
      
      if (res.data.payment_status === 'paid') {
        setStatus('success');
        setPaymentInfo(res.data);
        return;
      } else if (res.data.status === 'expired') {
        setStatus('expired');
        return;
      }

      // Continue polling
      setTimeout(() => pollPaymentStatus(attempts + 1), pollInterval);
    } catch (error) {
      console.error('Error checking status:', error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          {status === 'checking' && (
            <>
              <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">
                {isAr ? 'جاري التحقق من الدفع...' : 'Verifying payment...'}
              </h2>
              <p className="text-gray-500">
                {isAr ? 'يرجى الانتظار' : 'Please wait'}
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2 text-green-600">
                {isAr ? 'تم الدفع بنجاح!' : 'Payment Successful!'}
              </h2>
              <p className="text-gray-500 mb-4">
                {isAr ? 'تم تفعيل اشتراكك بنجاح' : 'Your subscription has been activated'}
              </p>
              <p className="text-sm text-gray-400 mb-6">
                {isAr ? 'الباقة:' : 'Plan:'} {paymentInfo?.plan_id}
              </p>
              <Button onClick={() => navigate(`/admin/tenants/${paymentInfo?.tenant_id}`)}>
                {isAr ? 'العودة للشركة' : 'Back to Tenant'}
              </Button>
            </>
          )}

          {(status === 'error' || status === 'expired' || status === 'timeout') && (
            <>
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2 text-red-600">
                {isAr ? 'حدث خطأ' : 'Something went wrong'}
              </h2>
              <p className="text-gray-500 mb-6">
                {isAr ? 'يرجى المحاولة مرة أخرى أو التواصل مع الدعم' : 'Please try again or contact support'}
              </p>
              <Button variant="outline" onClick={() => navigate('/admin/tenants')}>
                {isAr ? 'العودة للشركات' : 'Back to Tenants'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionPage;
