import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';

const TermsOfService = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            {isAr ? 'العودة' : 'Back'}
          </Button>
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {isAr ? 'شروط الاستخدام' : 'Terms of Service'}
        </h1>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
          <p className="text-sm text-gray-500">
            {isAr ? 'آخر تحديث:' : 'Last updated:'} {new Date().toLocaleDateString(isAr ? 'ar' : 'en')}
          </p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6">
              {isAr ? '1. القبول' : '1. Acceptance'}
            </h2>
            <p>
              {isAr
                ? 'باستخدام ERP Pro، فإنك توافق على هذه الشروط. إذا لم توافق، لا تستخدم الخدمة.'
                : 'By using ERP Pro, you agree to these terms. If you do not agree, do not use the service.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6">
              {isAr ? '2. الاستخدام المسموح' : '2. Permitted Use'}
            </h2>
            <p>
              {isAr
                ? 'تستخدم الخدمة لأغراض إدارة الأعمال المشروعة فقط. يُمنع الاستخدام غير القانوني أو إساءة الاستخدام.'
                : 'Use the service only for legitimate business management purposes. Illegal use or abuse is prohibited.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6">
              {isAr ? '3. المسؤولية' : '3. Liability'}
            </h2>
            <p>
              {isAr
                ? 'نقدم الخدمة "كما هي". لا نضمن عدم انقطاع الخدمة. مسؤوليتك عن دقة البيانات التي تدخلها.'
                : 'We provide the service "as is". We do not guarantee uninterrupted service. You are responsible for the accuracy of data you enter.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6">
              {isAr ? '4. الإلغاء' : '4. Termination'}
            </h2>
            <p>
              {isAr
                ? 'يمكنك إلغاء اشتراكك في أي وقت. نحتفظ بحق تعليق أو إنهاء الحسابات المخالفة للشروط.'
                : 'You may cancel your subscription at any time. We reserve the right to suspend or terminate accounts that violate these terms.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6">
              {isAr ? '5. الدفع والاشتراكات' : '5. Payment & Subscriptions'}
            </h2>
            <p>
              {isAr
                ? 'الاشتراكات تُدفع مقدماً. لا نسترد المبالغ عن الفترات المستخدمة. الترقية فورية؛ التخفيض يُطبّق في الدورة التالية.'
                : 'Subscriptions are paid in advance. No refunds for used periods. Upgrades apply immediately; downgrades apply next billing cycle.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6">
              {isAr ? '6. الملكية الفكرية' : '6. Intellectual Property'}
            </h2>
            <p>
              {isAr
                ? 'ERP Pro وعلامته التجارية مملوكان لنا. بياناتك تبقى ملكك. نمنحك ترخيصاً محدوداً لاستخدام الخدمة.'
                : 'ERP Pro and its brand are ours. Your data remains yours. We grant you a limited license to use the service.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6">
              {isAr ? '7. الاختصاص القضائي' : '7. Jurisdiction'}
            </h2>
            <p>
              {isAr
                ? 'تخضع هذه الشروط لقوانين المملكة العربية السعودية (أو الدولة المحددة في عقدك). أي نزاع يُحال للمحاكم المختصة.'
                : 'These terms are governed by the laws of Saudi Arabia (or the jurisdiction specified in your contract). Disputes are subject to competent courts.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6">
              {isAr ? '8. التعديلات' : '8. Changes'}
            </h2>
            <p>
              {isAr
                ? 'قد نعدّل هذه الشروط. سنخطرك بالتغييرات الجوهرية عبر البريد أو داخل التطبيق. استمرار الاستخدام بعد 30 يوماً من الإشعار يعني الموافقة.'
                : 'We may modify these terms. We will notify you of material changes via email or in-app. Continued use 30 days after notice constitutes acceptance.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6">
              {isAr ? '9. الاتصال' : '9. Contact'}
            </h2>
            <p>
              {isAr
                ? 'للاستفسارات حول الشروط: صفحة الدعم أو support@erppro.com.'
                : 'For terms inquiries: Support page or support@erppro.com.'}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
