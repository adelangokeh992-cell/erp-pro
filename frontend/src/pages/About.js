import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Info } from 'lucide-react';

const PRODUCT_NAME = 'ERP Pro';
const COMPANY_NAME = 'ERP Pro';
const VERSION = process.env.REACT_APP_VERSION || '1.0.0';
const COPYRIGHT_YEAR = new Date().getFullYear();

const About = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <Info className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-2xl">{isAr ? 'حول البرنامج' : 'About'}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {isAr ? 'معلومات الإصدار والحقوق' : 'Version and copyright information'}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500">{isAr ? 'اسم المنتج' : 'Product'}</p>
            <p className="text-lg font-semibold">{PRODUCT_NAME}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{isAr ? 'الإصدار' : 'Version'}</p>
            <p className="text-lg font-mono">{VERSION}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{isAr ? 'الترخيص' : 'License'}</p>
            <p className="text-sm text-gray-600">
              {isAr ? 'برنامج إدارة موارد مؤسسية — SaaS متعدد الشركات.' : 'Enterprise Resource Planning — Multi-tenant SaaS.'}
            </p>
          </div>
          <div className="pt-4 border-t space-y-1">
            <p className="text-sm font-medium text-gray-700">
              © {COPYRIGHT_YEAR} {COMPANY_NAME}. {isAr ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
            </p>
            <p className="text-xs text-gray-500">
              {isAr
                ? 'لا يُسمح بإعادة إنتاج أو توزيع هذا البرنامج دون إذن صريح.'
                : 'This software may not be reproduced or distributed without express permission.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default About;
