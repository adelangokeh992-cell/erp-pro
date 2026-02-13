import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { ArrowLeft, Zap, Crown, Building2, Check, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

const Pricing = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await axios.get(`${API}/subscriptions/plans`);
        setPlans(res.data || []);
      } catch {
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const monthlyPlans = plans.filter((p) => !p.id?.includes('yearly'));
  const getIcon = (id) => {
    if (id?.includes('enterprise')) return Building2;
    if (id?.includes('professional')) return Crown;
    return Zap;
  };
  const getColor = (id) => {
    if (id?.includes('enterprise')) return 'bg-purple-600';
    if (id?.includes('professional')) return 'bg-blue-600';
    return 'bg-green-600';
  };
  const featureLabels = {
    maxUsers: { ar: 'المستخدمين', en: 'Users' },
    maxProducts: { ar: 'المنتجات', en: 'Products' },
    maxWarehouses: { ar: 'المستودعات', en: 'Warehouses' },
    maxInvoicesPerMonth: { ar: 'الفواتير شهرياً', en: 'Invoices/Month' },
    storageLimit: { ar: 'التخزين', en: 'Storage' },
  };
  const formatFeature = (key, value) => {
    const label = featureLabels[key]?.[isAr ? 'ar' : 'en'] || key;
    if (value === -1) return `${label}: ${isAr ? 'غير محدود' : 'Unlimited'}`;
    if (key === 'storageLimit') return `${label}: ${value >= 1024 ? `${(value / 1024).toFixed(0)} GB` : `${value} MB`}`;
    return `${label}: ${value}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <Link to="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {isAr ? 'العودة' : 'Back'}
            </Button>
          </Link>
          <Link to="/features">
            <Button variant="outline">{isAr ? 'مقارنة المزايا' : 'Compare Features'}</Button>
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isAr ? 'التسعير' : 'Pricing'}
        </h1>
        <p className="text-gray-600 mb-10">
          {isAr ? 'اختر الباقة المناسبة لشركتك' : 'Choose the plan that fits your company'}
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {monthlyPlans.map((plan) => {
              const Icon = getIcon(plan.id);
              return (
                <div
                  key={plan.id}
                  className="bg-white rounded-xl border shadow-sm p-6 flex flex-col"
                >
                  <div className={`w-12 h-12 rounded-lg ${getColor(plan.id)} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900">
                    {isAr ? plan.name : plan.nameEn}
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    ${plan.price}
                    <span className="text-sm font-normal text-gray-500">
                      /{isAr ? 'شهر' : 'month'}
                    </span>
                  </p>
                  <ul className="mt-4 space-y-2 flex-1">
                    {plan.features &&
                      Object.entries(plan.features).map(([key, val]) => (
                        <li key={key} className="flex items-center gap-2 text-sm text-gray-600">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          {formatFeature(key, val)}
                        </li>
                      ))}
                  </ul>
                  <Link to="/login" className="mt-6">
                    <Button className="w-full" variant={plan.id === 'professional' ? 'default' : 'outline'}>
                      {isAr ? 'اشترك' : 'Subscribe'}
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Pricing;
