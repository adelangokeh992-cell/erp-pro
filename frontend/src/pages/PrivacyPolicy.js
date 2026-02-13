import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicy = () => {
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
          {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
        </h1>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
          <p className="text-sm text-gray-500">
            {isAr ? 'آخر تحديث:' : 'Last updated:'} {new Date().toLocaleDateString(isAr ? 'ar' : 'en')}
          </p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6">
              {isAr ? '1. جمع البيانات' : '1. Data Collection'}
            </h2>
            <p>
              {isAr
                ? 'نجمع البيانات اللازمة لتشغيل الخدمة: معلومات الشركة، المستخدمين، المنتجات، الفواتير، والعملاء. لا نبيع بياناتك لأطراف ثالثة.'
                : 'We collect data necessary to operate the service: company info, users, products, invoices, and customers. We do not sell your data to third parties.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6">
              {isAr ? '2. استخدام البيانات' : '2. Data Usage'}
            </h2>
            <p>
              {isAr
                ? 'تُستخدم البيانات لتقديم الخدمة، تحسينها، وإرسال إشعارات مهمة. قد نستخدم بيانات مجمّعة لأغراض إحصائية دون تحديد هوية.'
                : 'Data is used to provide the service, improve it, and send important notifications. We may use aggregated data for statistical purposes without identifying individuals.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6">
              {isAr ? '3. التخزين والأمان' : '3. Storage & Security'}
            </h2>
            <p>
              {isAr
                ? 'نخزّن البيانات على خوادم آمنة. نستخدم تشفيراً للنقل (HTTPS) ونطبق إجراءات أمنية لحماية بياناتك.'
                : 'We store data on secure servers. We use encryption for transmission (HTTPS) and apply security measures to protect your data.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6">
              {isAr ? '4. حقوقك' : '4. Your Rights'}
            </h2>
            <p>
              {isAr
                ? 'لديك الحق في الوصول لبياناتك، تصحيحها، وحذفها. للطلب، تواصل معنا عبر صفحة الدعم.'
                : 'You have the right to access, correct, and delete your data. To request, contact us via the Support page.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6">
              {isAr ? '5. الكوكيز والتقنيات' : '5. Cookies & Technologies'}
            </h2>
            <p>
              {isAr
                ? 'نستخدم تقنيات ضرورية لتشغيل الخدمة: تخزين الجلسة (token)، تفضيلات اللغة، والوضع الليلي. لا نستخدم كوكيز تتبع لأغراض إعلانية.'
                : 'We use essential technologies: session storage (token), language preferences, dark mode. We do not use tracking cookies for advertising.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6">
              {isAr ? '6. الاحتفاظ بالبيانات' : '6. Data Retention'}
            </h2>
            <p>
              {isAr
                ? 'نحتفظ ببياناتك طالما حسابك نشط. بعد الإلغاء، نحذف أو نجهّل البيانات خلال 90 يوماً ما لم يتطلب القانون غير ذلك.'
                : 'We retain your data while your account is active. After cancellation, we delete or anonymize data within 90 days unless law requires otherwise.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6">
              {isAr ? '7. نقل البيانات' : '7. Data Transfer'}
            </h2>
            <p>
              {isAr
                ? 'البيانات تُخزّن على خوادم قد تكون خارج بلدك. نضمن حماية مناسبة وفق المعايير المعتمدة.'
                : 'Data may be stored on servers outside your country. We ensure adequate protection per applicable standards.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6">
              {isAr ? '8. القاصرون' : '8. Minors'}
            </h2>
            <p>
              {isAr
                ? 'الخدمة موجهة للشركات والبالغين. لا نجمع بياناتاً عن قصد من أشخاص دون 18 عاماً.'
                : 'The service is for businesses and adults. We do not knowingly collect data from persons under 18.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6">
              {isAr ? '9. الاتصال' : '9. Contact'}
            </h2>
            <p>
              {isAr
                ? 'لأي استفسار حول الخصوصية أو ممارسة حقوقك، راجع صفحة الدعم أو support@erppro.com.'
                : 'For privacy inquiries or to exercise your rights, visit the Support page or support@erppro.com.'}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
