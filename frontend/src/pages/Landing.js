import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Package, BarChart3, ShoppingBag, Users, Zap, Globe, ArrowRight } from 'lucide-react';

const PRODUCT_NAME = 'ERP Pro';

const Landing = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const features = [
    {
      icon: Package,
      titleAr: 'إدارة المخزون',
      titleEn: 'Inventory Management',
      descAr: 'تتبع المنتجات والمستودعات والجرد',
      descEn: 'Track products, warehouses, and inventory counts',
    },
    {
      icon: ShoppingBag,
      titleAr: 'نقطة البيع',
      titleEn: 'Point of Sale',
      descAr: 'بيع سريع مع دعم الباركود و RFID',
      descEn: 'Fast checkout with barcode and RFID support',
    },
    {
      icon: BarChart3,
      titleAr: 'التقارير والمحاسبة',
      titleEn: 'Reports & Accounting',
      descAr: 'تقارير مبيعات ومشتريات ومحاسبة متكاملة',
      descEn: 'Sales, purchases reports and full accounting',
    },
    {
      icon: Users,
      titleAr: 'متعدد الشركات',
      titleEn: 'Multi-Tenant',
      descAr: 'إدارة عدة شركات من منصة واحدة',
      descEn: 'Manage multiple companies from one platform',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">{PRODUCT_NAME}</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/pricing" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
              {isAr ? 'التسعير' : 'Pricing'}
            </Link>
            <Link to="/features" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
              {isAr ? 'المزايا' : 'Features'}
            </Link>
            <Link to="/faq" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
              {isAr ? 'الأسئلة الشائعة' : 'FAQ'}
            </Link>
            <Link to="/guide" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
              {isAr ? 'دليل المستخدم' : 'User Guide'}
            </Link>
            <Link to="/support" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
              {isAr ? 'الدعم' : 'Support'}
            </Link>
            <Link to="/login">
              <Button variant="ghost">{isAr ? 'تسجيل الدخول' : 'Login'}</Button>
            </Link>
            <Link to="/admin/tenants/new">
              <Button>{isAr ? 'ابدأ تجربة' : 'Start Free Trial'}</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-blue-600" />
          <span className="text-sm text-blue-600 font-medium">
            {isAr ? 'عربي • English' : 'Arabic • English'}
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          {isAr ? 'نظام إدارة موارد مؤسسية' : 'Enterprise Resource Planning'}
          <br />
          <span className="text-blue-600">{PRODUCT_NAME}</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          {isAr
            ? 'إدارة مخزونك، مبيعاتك، وفواتيرك من مكان واحد. واجهة عربية كاملة وتطبيق موبايل.'
            : 'Manage inventory, sales, and invoices from one place. Full Arabic support and mobile app.'}
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link to="/admin/tenants/new">
            <Button size="lg" className="gap-2">
              {isAr ? 'ابدأ تجربة مجانية' : 'Start Free Trial'}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">
              {isAr ? 'تسجيل الدخول' : 'Login'}
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">
          {isAr ? 'لماذا ERP Pro؟' : 'Why ERP Pro?'}
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="p-6 rounded-xl bg-white border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {isAr ? f.titleAr : f.titleEn}
                </h3>
                <p className="text-sm text-gray-600">
                  {isAr ? f.descAr : f.descEn}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Video placeholder */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="aspect-video bg-gray-200 rounded-xl flex items-center justify-center">
          <p className="text-gray-500">
            {isAr ? 'فيديو توضيحي — قريباً' : 'Demo Video — Coming Soon'}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {isAr ? 'جاهز للبدء؟' : 'Ready to get started?'}
        </h2>
        <p className="text-gray-600 mb-6">
          {isAr ? 'أنشئ شركتك وابدأ إدارة أعمالك خلال دقائق.' : 'Create your company and start managing your business in minutes.'}
        </p>
        <Link to="/admin/tenants/new">
          <Button size="lg">{isAr ? 'إنشاء شركة' : 'Create Company'}</Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm text-gray-500">© {new Date().getFullYear()} {PRODUCT_NAME}</span>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-sm text-gray-500 hover:text-gray-700">
              {isAr ? 'الخصوصية' : 'Privacy'}
            </Link>
            <Link to="/terms" className="text-sm text-gray-500 hover:text-gray-700">
              {isAr ? 'الشروط' : 'Terms'}
            </Link>
            <Link to="/support" className="text-sm text-gray-500 hover:text-gray-700">
              {isAr ? 'الدعم' : 'Support'}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
