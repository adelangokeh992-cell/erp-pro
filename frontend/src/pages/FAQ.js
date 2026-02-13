import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { ArrowLeft, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

const FAQ_ITEMS = [
  {
    qAr: 'كيف أبدأ باستخدام ERP Pro؟',
    qEn: 'How do I get started with ERP Pro?',
    aAr: 'سجّل شركتك من صفحة "ابدأ تجربة"، ثم سجّل الدخول برمز الشركة واسم المستخدم وكلمة المرور.',
    aEn: 'Register your company from the "Start Free Trial" page, then log in with your company code, username, and password.',
  },
  {
    qAr: 'ما هي طرق الدفع المتاحة؟',
    qEn: 'What payment methods are available?',
    aAr: 'نقبل الدفع عبر Stripe (بطاقات الائتمان). يمكنك الاشتراك شهرياً أو سنوياً.',
    aEn: 'We accept payment via Stripe (credit cards). You can subscribe monthly or yearly.',
  },
  {
    qAr: 'هل يمكنني تغيير الباقة لاحقاً؟',
    qEn: 'Can I change my plan later?',
    aAr: 'نعم، يمكنك الترقية أو التخفيض في أي وقت من لوحة إدارة الاشتراك.',
    aEn: 'Yes, you can upgrade or downgrade at any time from the subscription management panel.',
  },
  {
    qAr: 'كيف أستعيد كلمة المرور؟',
    qEn: 'How do I reset my password?',
    aAr: 'اضغط "نسيت كلمة المرور" في صفحة تسجيل الدخول، وأدخل بريدك الإلكتروني. ستتلقى رابطاً لإعادة التعيين.',
    aEn: 'Click "Forgot password" on the login page and enter your email. You will receive a reset link.',
  },
  {
    qAr: 'هل تدعمون العمل بدون إنترنت؟',
    qEn: 'Do you support offline mode?',
    aAr: 'نعم، يمكنك تحميل البيانات للعمل أوفلاين ثم مزامنتها عند العودة للاتصال.',
    aEn: 'Yes, you can download data for offline use and sync when back online.',
  },
  {
    qAr: 'كيف أتواصل مع الدعم؟',
    qEn: 'How do I contact support?',
    aAr: 'استخدم صفحة الدعم أو راسلنا على support@erppro.com',
    aEn: 'Use the Support page or email us at support@erppro.com',
  },
];

const FAQ = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            {isAr ? 'العودة' : 'Back'}
          </Button>
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <HelpCircle className="w-10 h-10 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {isAr ? 'الأسئلة الشائعة' : 'FAQ'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isAr ? 'إجابات على الأسئلة الأكثر شيوعاً' : 'Answers to the most common questions'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {FAQ_ITEMS.map((item, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden"
            >
              <button
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {isAr ? item.qAr : item.qEn}
                </span>
                {openIndex === idx ? (
                  <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                )}
              </button>
              {openIndex === idx && (
                <div className="px-6 pb-4 text-gray-600 dark:text-gray-400 text-sm border-t dark:border-gray-700 pt-3">
                  {isAr ? item.aAr : item.aEn}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {isAr ? 'لم تجد إجابتك؟' : "Didn't find your answer?"}{' '}
            <Link to="/support" className="text-blue-600 font-medium hover:underline">
              {isAr ? 'تواصل معنا' : 'Contact us'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
