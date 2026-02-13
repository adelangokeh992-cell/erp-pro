import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { ArrowLeft, Check, Zap, Crown, Building2 } from 'lucide-react';

const PLANS = [
  {
    id: 'basic',
    nameAr: 'الباقة الأساسية',
    nameEn: 'Basic Plan',
    price: 29,
    icon: Zap,
    color: 'green',
    features: {
      maxUsers: { ar: 'المستخدمين', en: 'Users', value: 5 },
      maxProducts: { ar: 'المنتجات', en: 'Products', value: '1,000' },
      maxWarehouses: { ar: 'المستودعات', en: 'Warehouses', value: 1 },
      maxInvoicesPerMonth: { ar: 'الفواتير شهرياً', en: 'Invoices/Month', value: 100 },
      storageLimit: { ar: 'التخزين', en: 'Storage', value: '1 GB' },
    },
  },
  {
    id: 'professional',
    nameAr: 'الباقة الاحترافية',
    nameEn: 'Professional Plan',
    price: 79,
    icon: Crown,
    color: 'blue',
    popular: true,
    features: {
      maxUsers: { ar: 'المستخدمين', en: 'Users', value: 25 },
      maxProducts: { ar: 'المنتجات', en: 'Products', value: '10,000' },
      maxWarehouses: { ar: 'المستودعات', en: 'Warehouses', value: 3 },
      maxInvoicesPerMonth: { ar: 'الفواتير شهرياً', en: 'Invoices/Month', value: -1 },
      storageLimit: { ar: 'التخزين', en: 'Storage', value: '5 GB' },
    },
  },
  {
    id: 'enterprise',
    nameAr: 'باقة الشركات',
    nameEn: 'Enterprise Plan',
    price: 199,
    icon: Building2,
    color: 'purple',
    features: {
      maxUsers: { ar: 'المستخدمين', en: 'Users', value: 100 },
      maxProducts: { ar: 'المنتجات', en: 'Products', value: -1 },
      maxWarehouses: { ar: 'المستودعات', en: 'Warehouses', value: 10 },
      maxInvoicesPerMonth: { ar: 'الفواتير شهرياً', en: 'Invoices/Month', value: -1 },
      storageLimit: { ar: 'التخزين', en: 'Storage', value: '20 GB' },
    },
  },
];

const Features = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const formatValue = (v) => {
    if (v === -1) return isAr ? 'غير محدود' : 'Unlimited';
    return v;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            {isAr ? 'العودة' : 'Back'}
          </Button>
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {isAr ? 'مقارنة المزايا' : 'Feature Comparison'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-10">
          {isAr ? 'قارن بين الباقات واختر الأنسب لشركتك' : 'Compare plans and choose the best for your company'}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-4 text-gray-600 dark:text-gray-400 font-medium">
                  {isAr ? 'الميزة' : 'Feature'}
                </th>
                {PLANS.map((plan) => {
                  const Icon = plan.icon;
                  return (
                    <th key={plan.id} className="p-4 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          plan.color === 'green' ? 'bg-green-600' :
                          plan.color === 'blue' ? 'bg-blue-600' : 'bg-purple-600'
                        }`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-gray-100">
                          {isAr ? plan.nameAr : plan.nameEn}
                        </span>
                        <span className="text-2xl font-bold text-blue-600">${plan.price}</span>
                        {plan.popular && (
                          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded">
                            {isAr ? 'الأكثر اختياراً' : 'Popular'}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Object.keys(PLANS[0].features).map((key) => (
                <tr key={key} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <td className="p-4 text-gray-700 dark:text-gray-300">
                    {isAr ? PLANS[0].features[key].ar : PLANS[0].features[key].en}
                  </td>
                  {PLANS.map((plan) => (
                    <td key={plan.id} className="p-4 text-center">
                      <span className="flex items-center justify-center gap-1">
                        <Check className="w-4 h-4 text-green-600" />
                        {formatValue(plan.features[key].value)}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 flex justify-center">
          <Link to="/pricing">
            <Button size="lg">
              {isAr ? 'عرض التسعير' : 'View Pricing'}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Features;
