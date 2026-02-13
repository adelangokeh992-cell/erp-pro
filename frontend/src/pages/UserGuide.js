import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { ArrowLeft, BookOpen } from 'lucide-react';

const SECTIONS = [
  { id: 'start', titleAr: 'البدء', titleEn: 'Getting Started', contentAr: 'تسجيل الدخول: رمز الشركة، اسم المستخدم، كلمة المرور. إنشاء شركة: من "ابدأ تجربة" املأ البيانات وأنشئ حساب المدير. كلمة المرور: 8 أحرف، حرف كبير، رقم، رمز خاص.', contentEn: 'Login: Company code, username, password. Create company: From "Start Trial" fill data and create admin account. Password: 8+ chars, uppercase, number, special char.' },
  { id: 'dashboard', titleAr: 'لوحة التحكم', titleEn: 'Dashboard', contentAr: 'نظرة عامة على المبيعات والمخزون وإحصائيات سريعة وتنبيهات نقص المخزون.', contentEn: 'Overview of sales, inventory, quick stats, and low-stock alerts.' },
  { id: 'inventory', titleAr: 'المنتجات', titleEn: 'Inventory', contentAr: 'إضافة منتج: الاسم، SKU (مطلوب)، التصنيف، المخزون، الأسعار. حد إعادة الطلب للتنبيه. تعديل وتصدير PDF/Excel.', contentEn: 'Add product: Name, SKU (required), category, stock, prices. Reorder level for alerts. Edit and export PDF/Excel.' },
  { id: 'customers', titleAr: 'العملاء', titleEn: 'Customers', contentAr: 'إضافة عميل: الاسم، الهاتف، البريد، العنوان. نوع: فرد أو شركة. الرصيد للمدينين والدائنين.', contentEn: 'Add customer: Name, phone, email, address. Type: Individual or company. Balance for receivables.' },
  { id: 'pos', titleAr: 'نقطة البيع', titleEn: 'POS', contentAr: 'اختر المنتجات أو ابحث بالباركود/SKU. أضف للفاتورة. اختر طريقة الدفع (نقدي/بطاقة). احفظ الفاتورة.', contentEn: 'Select products or search by barcode/SKU. Add to invoice. Choose payment (cash/card). Save invoice.' },
  { id: 'invoices', titleAr: 'الفواتير', titleEn: 'Invoices', contentAr: 'عرض وبحث وطباعة الفواتير. إنشاء فاتورة جديدة من نقطة البيع.', contentEn: 'View, search, print invoices. Create new from POS.' },
  { id: 'purchases', titleAr: 'المشتريات', titleEn: 'Purchases', contentAr: 'إنشاء أمر شراء. اختيار المورد وإضافة المنتجات. الكميات والأسعار. حفظ وتتبع الحالة.', contentEn: 'Create purchase order. Select supplier, add products. Quantities and prices. Save and track status.' },
  { id: 'settings', titleAr: 'الإعدادات', titleEn: 'Settings', contentAr: 'الاتصال، المزامنة، النسخ الاحتياطي، إعداد RFID.', contentEn: 'Connection, sync, backup, RFID setup.' },
  { id: 'support', titleAr: 'الدعم', titleEn: 'Support', contentAr: 'صفحة الدعم، نموذج تواصل، support@erppro.com، FAQ.', contentEn: 'Support page, contact form, support@erppro.com, FAQ.' },
];

const UserGuide = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

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
          <BookOpen className="w-10 h-10 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {isAr ? 'دليل المستخدم' : 'User Guide'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isAr ? 'دليل سريع لاستخدام ERP Pro' : 'Quick guide to using ERP Pro'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.id} className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {isAr ? s.titleAr : s.titleEn}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                {isAr ? s.contentAr : s.contentEn}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-10 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {isAr ? 'للمزيد من التفاصيل، راجع' : 'For more details, see'}{' '}
            <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">docs/USER_GUIDE.md</code>
            {isAr ? ' أو' : ' or'}{' '}
            <Link to="/support" className="text-blue-600 font-medium hover:underline">
              {isAr ? 'تواصل مع الدعم' : 'contact support'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;
