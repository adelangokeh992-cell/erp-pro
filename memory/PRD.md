# نظام ERP SaaS متعدد الشركات - مستند المتطلبات

## المشكلة الأصلية
يريد المستخدم بناء نظام ERP كخدمة (SaaS) متعدد المستأجرين مع:
- **لوحة Super Admin**: إدارة جميع الشركات من مكان واحد
- **Multi-Tenant Architecture**: كل شركة لها بيئة منفصلة مع عزل البيانات
- **تخصيص بدون كود**: حقول مخصصة، تصميم الفاتورة، صفحات إضافية
- **نظام اشتراكات مرن**: شهري/سنوي، حسب المستخدمين، حسب الباقات
- **العمل Offline**: نقطة البيع والمخزون يعمل بدون إنترنت
- **التوطين**: دعم العربية والإنجليزية مع RTL

## البنية التقنية
- **Frontend**: React, React Router, TailwindCSS, ShadCN UI, IndexedDB
- **Backend**: FastAPI, Pydantic, Motor (async MongoDB driver)
- **Database**: MongoDB with Multi-Tenant Architecture
- **Authentication**: JWT with role-based access (Super Admin, Tenant Admin, etc.)

---

## ما تم تنفيذه ✅

### المرحلة 1 - النظام الأساسي (مكتمل سابقاً ✅)
- Products, Customers, Suppliers, Purchases, Users, Warehouses
- POS, Invoices, ESL Management
- Reports, Accounting, Dashboard
- RFID Scanner Integration (Keyboard Wedge)
- Product Units (Serial Numbers/Tags)
- Inventory Count
- Offline Mode (IndexedDB)

### المرحلة 2 - Multi-Tenant SaaS (مكتمل ✅) - 12 فبراير 2026
| الميزة | الوصف | الحالة |
|--------|-------|--------|
| Super Admin Login | صفحة تسجيل دخول منفصلة لمدير النظام | ✅ |
| Super Admin Dashboard | لوحة تحكم رئيسية مع إحصائيات الشركات | ✅ |
| Tenant Management | إنشاء/تعديل/حذف الشركات | ✅ |
| Tenant Statistics | عدد الشركات، الباقات، الحالات، المنتهية قريباً | ✅ |
| Subscription Management | تمديد الاشتراكات، تغيير الحالة | ✅ |
| Auto Admin Creation | إنشاء مدير تلقائي لكل شركة جديدة | ✅ |
| JWT Authentication | تسجيل دخول آمن مع أدوار مختلفة | ✅ |

### المرحلة 3 - عزل البيانات (مكتمل ✅) - 12 فبراير 2026
| الميزة | الوصف | الحالة |
|--------|-------|--------|
| JWT with tenantId | رمز المصادقة يحتوي على معرف الشركة | ✅ |
| Data Isolation | كل شركة ترى بياناتها فقط | ✅ |
| Unified Login Page | صفحة واحدة لتسجيل دخول Super Admin و Tenant | ✅ |
| Tenant Login Flow | تسجيل دخول برمز الشركة | ✅ |
| Products Filtering | فلترة المنتجات حسب tenant_id | ✅ |

### المرحلة 4 - نظام التحكم الشامل (مكتمل ✅) - 12 فبراير 2026
| الميزة | الوصف | الحالة |
|--------|-------|--------|
| Feature Toggles | تفعيل/تعطيل ميزات لكل شركة (POS, RFID, Reports...) | ✅ |
| Custom Fields | حقول مخصصة للمنتجات والعملاء (نوع، اسم، required) | ✅ |
| Invoice Customization | شعار، عنوان، رقم ضريبي، ألوان، معاينة | ✅ |
| Limits & Restrictions | حد المستخدمين، المنتجات، المستودعات، التخزين | ✅ |
| Settings Page | صفحة إعدادات شاملة بـ 4 تبويبات | ✅ |

### المرحلة 5 - تطبيق الإعدادات (مكتمل ✅) - 12 فبراير 2026
| الميزة | الوصف | الحالة |
|--------|-------|--------|
| Feature Gating | إخفاء الميزات المعطلة من القائمة الجانبية | ✅ |
| Custom Fields Renderer | عرض الحقول المخصصة في نماذج المنتجات | ✅ |
| Limit Checking | التحقق من الحدود قبل إضافة عناصر جديدة | ✅ |
| Tenant Settings API | `/api/tenants/{id}/settings` مع الاستخدام الحالي | ✅ |
| Invoice Generator | مولد فواتير بإعدادات الشركة | ✅ |
| Dynamic Sidebar | اسم الشركة والميزات حسب الإعدادات | ✅ |

### المرحلة 6 - توسيع الحقول المخصصة (مكتمل ✅) - 12 فبراير 2026
| الميزة | الوصف | الحالة |
|--------|-------|--------|
| Custom Fields للعملاء | حقول مخصصة في نموذج العملاء (الرقم الضريبي، حد الائتمان) | ✅ |
| Custom Fields للموردين | حقول مخصصة في نموذج الموردين (شروط الدفع، الحساب البنكي) | ✅ |
| Invoice Generator المحسن | Header ملون، تخطيط احترافي، دعم الخصومات، رقم الصفحة | ✅ |

### المرحلة 7 - نظام الاشتراكات والحدود (مكتمل ✅) - 12 فبراير 2026
| الميزة | الوصف | الحالة |
|--------|-------|--------|
| Stripe Integration | تكامل كامل مع Stripe للدفع | ✅ |
| Subscription Plans | 5 باقات (Basic, Professional, Enterprise + سنوية) | ✅ |
| Checkout Flow | صفحة الدفع مع إعادة التوجيه لـ Stripe | ✅ |
| Payment Success | صفحة نجاح الدفع مع تحديث الاشتراك | ✅ |
| Limit Warnings | تحذيرات الحدود في جميع الصفحات | ✅ |
| Offline Storage Update | دعم Multi-Tenant في IndexedDB | ✅ |

### المرحلة 8 - تحسين Offline Mode للـ Multi-Tenant (مكتمل ✅) - 12 فبراير 2026
| الميزة | الوصف | الحالة |
|--------|-------|--------|
| Tenant-Aware Storage | تخزين منفصل لكل شركة في IndexedDB | ✅ |
| Download for Offline | زر تحميل البيانات للعمل بدون إنترنت | ✅ |
| Sync Button | زر مزامنة البيانات مع الخادم | ✅ |
| Progress Indicator | شريط تقدم أثناء التحميل/المزامنة | ✅ |
| Cached Items Count | عرض عدد العناصر المحفوظة | ✅ |
| Connection Status | مؤشر حالة الاتصال (متصل/غير متصل) | ✅ |
| Full Sync | مزامنة كاملة (رفع + تحميل) | ✅ |
| Tenant Metadata | حفظ معلومات المزامنة لكل شركة | ✅ |
| Auto-Sync | مزامنة تلقائية كل ساعة | ✅ |
| Last Sync Display | عرض آخر مزامنة في صفحة Super Admin | ✅ |

---

## الملفات الجديدة

### Backend
- `/app/backend/routes/tenants.py` - إدارة الشركات API
- `/app/backend/routes/auth_v2.py` - مصادقة Multi-Tenant
- `/app/backend/models/tenant.py` - نموذج الشركة
- `/app/backend/middleware/tenant.py` - استخراج tenant من JWT
- `/app/backend/utils/auth.py` - أدوات JWT

### Frontend
- `/app/frontend/src/pages/LoginV2.js` - صفحة تسجيل دخول جديدة
- `/app/frontend/src/pages/SuperAdminDashboard.js` - لوحة التحكم
- `/app/frontend/src/pages/TenantManagement.js` - إدارة الشركات
- `/app/frontend/src/pages/CreateTenant.js` - إنشاء شركة جديدة
- `/app/frontend/src/pages/TenantDetails.js` - تفاصيل الشركة
- `/app/frontend/src/pages/TenantSettings.js` - إعدادات الشركة الشاملة
- `/app/frontend/src/components/SuperAdminLayout.js` - تخطيط Super Admin
- `/app/frontend/src/components/CustomFieldsRenderer.js` - عرض الحقول المخصصة
- `/app/frontend/src/components/LimitWarning.js` - تحذيرات الحدود
- `/app/frontend/src/hooks/useInvoiceGenerator.js` - مولد الفواتير

---

## APIs الجديدة

### Authentication
- `POST /api/auth/login` - تسجيل دخول (يدعم Super Admin و Tenant Users)
- `POST /api/auth/register-super-admin` - تسجيل مدير نظام جديد

### Tenants
- `GET /api/tenants` - جلب جميع الشركات
- `GET /api/tenants/stats` - إحصائيات الشركات
- `GET /api/tenants/{id}` - تفاصيل شركة
- `GET /api/tenants/{id}/settings` - إعدادات الشركة والاستخدام الحالي ⭐ جديد
- `POST /api/tenants` - إنشاء شركة جديدة
- `PUT /api/tenants/{id}` - تحديث شركة
- `POST /api/tenants/{id}/extend-subscription` - تمديد الاشتراك
- `DELETE /api/tenants/{id}` - حذف شركة

---

## بيانات الدخول

### Super Admin
- **URL**: `/admin-login`
- **Username**: `superadmin`
- **Password**: `Admin@123`

### Tenant (مثال)
- **Tenant Code**: `ALNO3723`
- **Username**: `alnoor_admin`
- **Password**: `Pass@123`

---

## المهام القادمة

### P1 - تحسينات
- [x] تطبيق الحقول المخصصة على العملاء والموردين ✅
- [x] تحسين مولد الفواتير (Header ملون، تخطيط احترافي) ✅
- [x] إضافة رسائل تحذير عند الاقتراب من الحدود ✅
- [x] نظام الاشتراكات (Stripe) ✅

### P2 - الميزات المستقبلية
- [x] تحسين Offline Mode لكل شركة ✅
- [ ] RFID Inventory Count improvements
- [ ] Auto-suspend للاشتراكات المنتهية
- [ ] بوابة العميل لإدارة الاشتراك

### P3 - تحسينات تقنية
- [ ] إصلاح خطأ `babel-metadata-plugin` (Maximum call stack size exceeded)
- [ ] معالجة circular dependency في backend files

---

## ملاحظات تقنية

### Tenant Data Isolation
كل سجل في قاعدة البيانات يحتوي على `tenantId` لضمان عزل البيانات:
```javascript
{
  tenantId: "tenant_123",
  name: "منتج",
  ...
}
```

### Subscription Plans
```javascript
{
  free: { maxUsers: 5, maxProducts: 1000 },
  basic: { maxUsers: 10, maxProducts: 5000 },
  professional: { maxUsers: 25, maxProducts: 10000 },
  enterprise: { maxUsers: 100, maxProducts: 100000 }
}
```

---

## ما تم تنفيذه ✅

### المرحلة 1 - الأساسيات (مكتمل ✅)
| الوحدة | الوصف | الحالة |
|--------|-------|--------|
| Products | CRUD للمنتجات، مسح RFID، تصدير PDF/Excel | ✅ |
| Customers | إدارة العملاء مع إضافة من الفواتير | ✅ |
| Suppliers | إدارة الموردين مع تتبع الرصيد | ✅ |
| Purchases | إضافة/تعديل مشتريات مع تحديث المخزون + إضافة منتج جديد | ✅ |
| Users | إدارة المستخدمين مع اختيار الأدوار | ✅ |
| Warehouses | إدارة المستودعات | ✅ |
| POS | نقطة بيع كاملة مع سلة وإتمام البيع | ✅ |
| Invoices | إنشاء وإدارة الفواتير | ✅ |
| ESL | إدارة ملصقات الرف الإلكترونية | ✅ |

### المرحلة 2 - التقارير والمحاسبة (مكتمل ✅)
| الميزة | الوصف | الحالة |
|--------|-------|--------|
| لوحة التحكم المتقدمة | إحصائيات المبيعات، تنبيهات المخزون، أداء يومي | ✅ |
| التقارير التفصيلية | تقارير المبيعات، المخزون، المشتريات، الأرباح | ✅ |
| وحدة المحاسبة | المصروفات، دليل الحسابات، قيود اليومية | ✅ |
| نظام المصادقة | تسجيل دخول، صلاحيات، أدوار المستخدمين | ✅ |

### المرحلة 3 - وضع العمل بدون إنترنت (مكتمل ✅) - فبراير 2026
| الميزة | الوصف | الحالة |
|--------|-------|--------|
| IndexedDB Storage | تخزين محلي كامل لجميع البيانات | ✅ |
| Offline API Wrapper | واجهة API ذكية تدعم Online/Offline | ✅ |
| Sync Queue | قائمة انتظار للمزامنة عند الاتصال | ✅ |
| Settings UI | واجهة لإدارة الاتصال والمزامنة | ✅ |
| Connection Indicator | مؤشر حالة الاتصال في الـ Header | ✅ |
| Download for Offline | تحميل البيانات للعمل بدون إنترنت | ✅ |
| Auto Sync | مزامنة تلقائية عند الاتصال بالإنترنت | ✅ |

### المرحلة 4 - تحسينات المشتريات (مكتمل ✅) - 8 فبراير 2026
| الميزة | الوصف | الحالة |
|--------|-------|--------|
| تعديل المشتريات | نافذة تعديل الحالة والضريبة والخصم والملاحظات | ✅ |
| إضافة منتج جديد | خيار إضافة منتج جديد من داخل نافذة المشتريات | ✅ |
| أصناف متعددة | إضافة أكثر من صنف في نفس عملية الشراء | ✅ |
| تاغات RFID لكل قطعة | عند شراء كمية > 1، إمكانية إدخال تاغ RFID فريد لكل قطعة | ✅ |

---

## ملفات Offline Mode الجديدة
- `/app/frontend/src/services/offlineStorage.js` - خدمة IndexedDB الكاملة
- `/app/frontend/src/services/api.js` - API Wrapper يدعم Online/Offline
- `/app/frontend/src/contexts/OfflineContext.js` - React Context للتحكم في الوضع
- `/app/frontend/src/pages/Settings.js` - واجهة الإعدادات المُحدثة
- `/app/frontend/src/components/Layout.js` - مؤشر حالة الاتصال

## كيفية عمل Offline Mode
1. **التخزين**: IndexedDB يحفظ جميع البيانات (منتجات، عملاء، فواتير، مشتريات، إلخ)
2. **التبديل**: المستخدم يختار Online أو Offline من الإعدادات
3. **API Routing**: `api.js` يوجه الطلبات للخادم أو IndexedDB حسب الوضع
4. **Sync Queue**: العمليات في Offline تُضاف لقائمة انتظار
5. **Auto Sync**: عند الاتصال بالإنترنت، تُزامن التغييرات تلقائياً

---

## APIs المتوفرة

### المنتجات
- `GET /api/products` - جلب جميع المنتجات
- `POST /api/products` - إنشاء منتج
- `PUT /api/products/{id}` - تحديث منتج
- `DELETE /api/products/{id}` - حذف منتج

### العملاء
- `GET /api/customers` - جلب جميع العملاء
- `POST /api/customers` - إنشاء عميل
- `PUT /api/customers/{id}` - تحديث عميل
- `DELETE /api/customers/{id}` - حذف عميل

### الموردين
- `GET /api/suppliers` - جلب جميع الموردين
- `POST /api/suppliers` - إنشاء مورد
- `PUT /api/suppliers/{id}` - تحديث مورد
- `DELETE /api/suppliers/{id}` - حذف مورد

### المشتريات
- `GET /api/purchases` - جلب جميع المشتريات
- `GET /api/purchases/{id}` - جلب مشتريات بالـ ID
- `POST /api/purchases` - إنشاء عملية شراء (يحدث المخزون تلقائياً)
- `PUT /api/purchases/{id}` - تعديل عملية شراء (الحالة، الضريبة، الخصم، الملاحظات)
- `DELETE /api/purchases/{id}` - حذف عملية شراء

### المستخدمين
- `GET /api/users` - جلب جميع المستخدمين
- `POST /api/users` - إنشاء مستخدم
- `PUT /api/users/{id}` - تحديث مستخدم

### المستودعات
- `GET /api/warehouses` - جلب جميع المستودعات
- `POST /api/warehouses` - إنشاء مستودع

### الفواتير
- `GET /api/invoices` - جلب جميع الفواتير
- `POST /api/invoices` - إنشاء فاتورة

### لوحة التحكم
- `GET /api/dashboard/stats` - إحصائيات النظام
- `GET /api/dashboard/alerts` - تنبيهات النظام

### التقارير
- `GET /api/reports/sales` - تقرير المبيعات
- `GET /api/reports/inventory` - تقرير المخزون
- `GET /api/reports/purchases` - تقرير المشتريات
- `GET /api/reports/profit` - تقرير الأرباح

### المحاسبة
- `GET /api/accounting/expenses` - المصروفات
- `POST /api/accounting/expenses` - إضافة مصروف
- `GET /api/accounting/accounts` - دليل الحسابات
- `GET /api/accounting/summary` - ملخص مالي

### المصادقة
- `POST /api/auth/login` - تسجيل الدخول
- `GET /api/auth/me` - معلومات المستخدم الحالي
- `POST /api/auth/logout` - تسجيل الخروج

---

## بيانات اختبار تسجيل الدخول
- **اسم المستخدم**: admin
- **كلمة المرور**: 123456

---

## مخطط قاعدة البيانات
- `products`: name, nameEn, sku, rfidTag, stock, costPrice, salePrice
- `customers`: name, nameEn, phone, email, address, balance
- `suppliers`: name, nameEn, phone, email, address, balance
- `purchases`: purchaseNumber, supplierId, items[], total, status
- `users`: username, name, email, role, isActive, hashedPassword
- `warehouses`: name, code, address, phone, managerId
- `invoices`: invoiceNumber, customerId, items[], total, status
- `expenses`: category, description, amount, date, paymentMethod
- `accounts`: code, name, type, balance

---

## المهام المستقبلية (Backlog)

### P1 - أولوية عالية
- [ ] تطبيق صلاحيات المستخدمين (RBAC) على مستوى API
- [ ] تكامل RFID Scanner (C6100) الحقيقي

### P2 - أولوية متوسطة
- [ ] تكامل ملصقات الرف الإلكترونية (ESL) - بانتظار الوثائق
- [ ] تقارير متقدمة بالرسوم البيانية

### P3 - أولوية منخفضة
- [ ] نظام إشعارات البريد الإلكتروني
- [ ] تحسينات UI/UX إضافية

---

## ملفات المرجع
- `/app/backend/server.py` - نقطة الدخول للباك إند
- `/app/frontend/src/App.js` - نقطة الدخول للواجهة الأمامية
- `/app/frontend/src/services/api.js` - خدمة API مركزية (Online/Offline)
- `/app/frontend/src/services/offlineStorage.js` - خدمة IndexedDB
- `/app/frontend/src/contexts/AuthContext.js` - سياق المصادقة
- `/app/frontend/src/contexts/OfflineContext.js` - سياق Offline
- `/app/frontend/src/contexts/LanguageContext.js` - إدارة اللغة

---

## تقارير الاختبار
- `/app/test_reports/iteration_1.json`
- `/app/test_reports/iteration_2.json`
- `/app/test_reports/iteration_3.json` - اختبار Offline Mode ✅

---

## آخر تحديث
**12 فبراير 2026** - تم إكمال Offline Mode للـ Multi-Tenant:
- ✅ تخزين منفصل لكل شركة في IndexedDB
- ✅ زر "تحميل للأوفلاين" في الـ Header
- ✅ زر "مزامنة" مع عداد العناصر المحفوظة
- ✅ شريط تقدم أثناء التحميل والمزامنة
- ✅ مؤشر حالة الاتصال (متصل/غير متصل)
- ✅ مزامنة كاملة (رفع التغييرات + تحميل البيانات الجديدة)
- ✅ مزامنة تلقائية كل ساعة (بدون أخطاء إذا لم يكن هناك إنترنت)
- ✅ عرض آخر مزامنة تحت أسماء الشركات في صفحة Super Admin

**تحديث الصفحات - فبراير 2026**:
- ✅ المخزون: تعديل المنتجات + حقل RFID Tag + حقل ESL Device ID
- ✅ الفواتير: عرض القائمة + تفاصيل + طباعة
- ✅ العملاء: إضافة + تعديل
- ✅ الموردين: إضافة + تعديل
- ✅ المشتريات: عرض التفاصيل + حقل RFID Tag عند الإضافة
- ✅ نقطة البيع: طباعة الفاتورة فوراً بعد البيع
- ✅ المستخدمين: تعديل + تغيير كلمة السر
- ✅ المستودعات: تعديل
