import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { AlertTriangle } from 'lucide-react';

/**
 * Hook to check if user can add more items based on limits
 */
export const useLimitCheck = () => {
  const { tenantSettings, isSuperAdmin } = useAuth();

  const checkLimit = (type) => {
    // Super admin has no limits
    if (isSuperAdmin()) {
      return { canAdd: true, remaining: Infinity, message: '' };
    }

    if (!tenantSettings) {
      return { canAdd: true, remaining: Infinity, message: '' };
    }

    const limits = tenantSettings.limits || {};
    const usage = tenantSettings.currentUsage || {};

    switch (type) {
      case 'users': {
        const max = limits.maxUsers || 999999;
        const current = usage.users || 0;
        const remaining = max - current;
        return {
          canAdd: remaining > 0,
          remaining,
          current,
          max,
          message: remaining <= 0 ? 'تم الوصول للحد الأقصى من المستخدمين' : ''
        };
      }

      case 'products': {
        const max = limits.maxProducts || 999999;
        const current = usage.products || 0;
        const remaining = max - current;
        return {
          canAdd: remaining > 0,
          remaining,
          current,
          max,
          message: remaining <= 0 ? 'تم الوصول للحد الأقصى من المنتجات' : ''
        };
      }

      case 'warehouses': {
        const max = limits.maxWarehouses || 999999;
        const current = usage.warehouses || 0;
        const remaining = max - current;
        return {
          canAdd: remaining > 0,
          remaining,
          current,
          max,
          message: remaining <= 0 ? 'تم الوصول للحد الأقصى من المستودعات' : ''
        };
      }

      case 'invoices': {
        const max = limits.maxInvoicesPerMonth;
        if (max === -1) {
          return { canAdd: true, remaining: Infinity, message: '' };
        }
        const current = usage.invoicesThisMonth || 0;
        const remaining = max - current;
        return {
          canAdd: remaining > 0,
          remaining,
          current,
          max,
          message: remaining <= 0 ? 'تم الوصول للحد الأقصى من الفواتير هذا الشهر' : ''
        };
      }

      default:
        return { canAdd: true, remaining: Infinity, message: '' };
    }
  };

  return { checkLimit };
};

/**
 * Component to display limit warning
 */
const LimitWarning = ({ type, showRemaining = true }) => {
  const { checkLimit } = useLimitCheck();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const { canAdd, remaining, current, max, message } = checkLimit(type);

  if (canAdd && remaining > 10) {
    return null;
  }

  const typeLabels = {
    users: isAr ? 'المستخدمين' : 'Users',
    products: isAr ? 'المنتجات' : 'Products',
    warehouses: isAr ? 'المستودعات' : 'Warehouses',
    invoices: isAr ? 'الفواتير' : 'Invoices'
  };

  if (!canAdd) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
        <AlertTriangle className="w-5 h-5" />
        <span>
          {isAr 
            ? `تم الوصول للحد الأقصى من ${typeLabels[type]} (${max})`
            : `Maximum ${typeLabels[type]} limit reached (${max})`
          }
        </span>
      </div>
    );
  }

  if (showRemaining && remaining <= 10) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-amber-700">
        <AlertTriangle className="w-5 h-5" />
        <span>
          {isAr 
            ? `متبقي ${remaining} ${typeLabels[type]} فقط من أصل ${max}`
            : `Only ${remaining} ${typeLabels[type]} remaining out of ${max}`
          }
        </span>
      </div>
    );
  }

  return null;
};

export default LimitWarning;
