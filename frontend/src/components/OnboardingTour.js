import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { LayoutDashboard, Package, ShoppingBag, FileText, ChevronRight, X } from 'lucide-react';

const STEPS = [
  {
    id: 'dashboard',
    path: '/',
    icon: LayoutDashboard,
    titleAr: 'لوحة التحكم',
    titleEn: 'Dashboard',
    descAr: 'نظرة عامة على مبيعاتك ومخزونك وإحصائياتك',
    descEn: 'Overview of your sales, inventory and statistics',
  },
  {
    id: 'products',
    path: '/inventory',
    icon: Package,
    titleAr: 'المنتجات',
    titleEn: 'Products',
    descAr: 'إدارة المخزون والمنتجات وإضافة عناصر جديدة',
    descEn: 'Manage inventory, products and add new items',
  },
  {
    id: 'pos',
    path: '/pos',
    icon: ShoppingBag,
    titleAr: 'نقطة البيع',
    titleEn: 'Point of Sale',
    descAr: 'بيع المنتجات وإنشاء فواتير بسرعة',
    descEn: 'Sell products and create invoices quickly',
  },
  {
    id: 'invoices',
    path: '/invoices',
    icon: FileText,
    titleAr: 'الفواتير',
    titleEn: 'Invoices',
    descAr: 'عرض وإدارة جميع فواتيرك',
    descEn: 'View and manage all your invoices',
  },
];

const OnboardingTour = () => {
  const { language } = useLanguage();
  const { completed, markCompleted } = useOnboarding();
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  const isAr = language === 'ar';

  useEffect(() => {
    if (!completed && location.pathname) {
      const idx = STEPS.findIndex((s) => s.path === location.pathname || (s.path === '/' && location.pathname === '/'));
      if (idx >= 0) {
        setStep(idx);
        setOpen(true);
      }
    }
  }, [completed, location.pathname]);

  if (completed || !open) return null;

  const current = STEPS[step];
  const Icon = current?.icon;

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      navigate(STEPS[step + 1].path);
    } else {
      markCompleted();
      setOpen(false);
    }
  };

  const handleSkip = () => {
    markCompleted();
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <Card className="max-w-md w-full shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <span className="text-sm text-gray-500">
            {step + 1} / {STEPS.length}
          </span>
          <Button variant="ghost" size="icon" onClick={handleSkip}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {Icon && (
            <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Icon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
          )}
          <h3 className="text-xl font-bold">
            {isAr ? current.titleAr : current.titleEn}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {isAr ? current.descAr : current.descEn}
          </p>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleNext} className="flex-1 gap-2">
              {step < STEPS.length - 1
                ? (isAr ? 'التالي' : 'Next')
                : (isAr ? 'إنهاء الجولة' : 'Finish Tour')}
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" onClick={handleSkip}>
              {isAr ? 'تخطي' : 'Skip'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingTour;
