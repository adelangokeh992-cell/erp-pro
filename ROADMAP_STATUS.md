# حالة خطة العمل – المرحلة 1 و 2

تم فحص المشروع وتحديد ما هو **جاهز** وما هو **ناقص** من أول خطوتين (المرحلة 1: البنية التحتية، المرحلة 2: Desktop Electron).

---

## المرحلة 1: البنية التحتية

### 1.1 License Server API — جاهز

| المكون | الحالة | الملاحظات |
|--------|--------|-----------|
| **Backend** | موجود | `backend/routes/licenses.py` |
| **تفعيل ترخيص** | `POST /api/licenses/activate` | ربط ترخيص بـ `tenantCode` + `licenseKey` + `hardwareId` |
| **التحقق من الترخيص** | `POST /api/licenses/check` | `tenantCode` + `hardwareId` → `isValid`, `reason`, `subscriptionExpiry`, إلخ |
| **حد الأجهزة** | مدعوم | `maxDevices` و `devices[]` مع `hardwareIdHash` |
| **تحديث حالة الاشتراك** | عند كل activate/check | يتم تحديث `tenant.status` إذا انتهى الاشتراك |

---

### 1.2 Auto-suspend — جاهز (عند التحقق)

| المكون | الحالة | الملاحظات |
|--------|--------|-----------|
| **تحديث حالة الشركة** | موجود | داخل `licenses.py`: `_update_tenant_status_if_needed()` |
| **منطق التعليق** | عند انتهاء `subscription.expiryDate` | يتم ضبط `tenant.status = "expired"` في DB |
| **رفض الدخول** | عند activate أو check | إذا `effective_status in ["expired","suspended"]` يُرجع `isValid: false` |
| **Cron تلقائي** | غير موجود | التعليق يحدث **عند استدعاء** activate/check فقط (لا يوجد job دوري يمر على كل الشركات) |

**خلاصة:** المنطق جاهز؛ إذا أردت تعليقاً تلقائياً دورياً بدون انتظار طلب ترخيص، تحتاج مهمة مجدولة (cron/celery) تمر على الـ tenants وتحدث الـ status.

---

### 1.3 نظام Hardware ID — جزئي

| المكون | الحالة | الملخص |
|--------|--------|--------|
| **Backend** | جاهز | تخزين `hardwareId` كـ hash (SHA-256) في `tenant.license.devices[].hardwareIdHash` |
| **Frontend (ويب)** | بديل فقط | `AuthContext`: إذا لم يكن `window.erpDesktop.getHardwareId` يستخدم `localStorage.deviceId` (مثل `web_xxx`) |
| **Electron Main** | غير منفذ | `preload.js` يعرض `license:get-hardware-id` لكن **لا يوجد** `ipcMain` في `electron-main.js` يستمع له ويُرجع hardware ID حقيقي |

**خلاصة:** السيرفر والويب جاهزان؛ لربط الترخيص بجهاز معين في Desktop تحتاج تنفيذ في `electron-main.js` (مثلاً باستخدام `machine-id` أو ما شابه) وإرجاعه عبر IPC.

---

### 1.4 Sync API محسّن — جاهز

| المكون | الحالة | الملاحظات |
|--------|--------|-----------|
| **ملف الـ API** | موجود | `backend/routes/sync.py` |
| **رفع التغييرات** | `POST /api/sync/upload` | دفعات (batched) مع `collections[].changes[]` و `action`: create/update/delete |
| **تحميل التغييرات** | `POST /api/sync/download` | حسب `since` (timestamp) لكل collection |
| **حل التعارضات** | مدعوم | إذا `server.updatedAt > baseUpdatedAt` → `skipped_conflict` + إرجاع `serverDocument` |
| **مجموعات المزامنة** | محددة | products, customers, suppliers, invoices, purchases, warehouses, users, expenses, accounts, journal_entries |

---

## المرحلة 2: Desktop (Electron)

### 2.1 Electron Setup — جزئي

| المكون | الحالة | الملاحظات |
|--------|--------|-----------|
| **إعداد Electron** | موجود | `electron-main.js`, `preload.js`, `package.json` (main, electron, electron-builder) |
| **نافذة واحدة** | يعمل | إنشاء نافذة، تحميل `localhost:3000` في التطوير أو `build/index.html` في الإنتاج |
| **أمان** | سليم | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` |
| **سكربتات التشغيل** | موجودة | `run_electron.bat`, و `electron-dev` في package.json |
| **IPC من الـ Main** | غير منفذ | لا يوجد `ipcMain.handle` في `electron-main.js` لأي من: license, rfid, printer, updates |

---

### 2.2 Local Database — جزئي (IndexedDB وليس SQLite)

| المكون | الحالة | الملاحظات |
|--------|--------|-----------|
| **تخزين محلي** | موجود | `frontend/src/services/offlineStorage.js` — **IndexedDB** (ليس SQLite) |
| **عزل حسب tenant** | مدعوم | `setTenantId`, مخازن منفصلة/مفتاح tenant |
| **صف مزامنة** | مدعوم | `sync_queue` ومجموعات للمنتجات، العملاء، الفواتير، إلخ |
| **حل تعارض** | مدعوم | أولوية السيرفر (Conflict resolution with server priority) |
| **OfflineContext** | موجود | يستخدم `offlineStorage`، تحميل/مزامنة، حالة اتصال |
| **SQLite في Electron** | غير موجود | الخطة تذكر "SQLite محلي" — حالياً لا يوجد SQLite؛ المنطق مبني على IndexedDB (يعمل في المتصفح و Electron) |

**خلاصة:** منطق "قاعدة محلية + مزامنة" جاهز على IndexedDB؛ إذا كان مطلوباً SQLite صراحة في Desktop يمكن إضافته لاحقاً مع الاحتفاظ بنفس واجهة المزامنة.

---

### 2.3 License Verification — جزئي

| المكون | الحالة | الملاحظات |
|--------|--------|-----------|
| **عند تسجيل الدخول** | يعمل | في `AuthContext.login` لمستخدم شركة: استدعاء `licenseAPI.check(tenantCode, hardwareId)` بعد تسجيل الدخول |
| **رفض عند ترخيص غير صالح** | يعمل | إذا `!isValid` يتم إلغاء الـ token واعتبار تسجيل الدخول فاشلاً |
| **Hardware ID في Desktop** | غير مكتمل | `getHardwareId()` يستدعي `window.erpDesktop.getHardwareId()` لكن الـ main process لا يرد → ي fallback لـ `localStorage.deviceId` (غير مرتبط بجهاز حقيقي) |

**خلاصة:** التحقق من الترخيص على السيرفر جاهز؛ لربط الترخيص بجهاز Desktop فعلياً تحتاج تنفيذ `get-hardware-id` في الـ main process.

---

### 2.4 Code Obfuscation — غير منفذ

- لا يوجد إعداد لـ obfuscation (مثل javascript-obfuscator أو إعداد في electron-builder) في المشروع الحالي.

---

### 2.5 Auto-Update — غير منفذ

| المكون | الحالة |
|--------|--------|
| **الحزمة** | `electron-updater` موجودة في package.json |
| **Preload** | يعرض `app:check-updates` |
| **Main process** | لا يوجد تسجيل لـ `ipcMain.handle('app:check-updates')` ولا استدعاء لـ autoUpdater |

---

### 2.6 Installer Builder — إعداد أساسي فقط

| المكون | الحالة |
|--------|--------|
| **electron-builder** | موجود في dependencies |
| **سكربت** | يوجد `"dist": "electron-builder"` |
| **إعداد تفصيلي** | لا يوجد في المسار المفحوص إعداد لـ nsis/msi (شعار، حقوق نشر، إلخ) في الـ build config |

---

### 2.7 RFID Integration — جزئي

| المكون | الحالة | الملاحظات |
|--------|--------|-----------|
| **في المتصفح** | موجود | `rfidScanner.js` — وضع Keyboard Wedge (ضغطات لوحة مفاتيح سريعة)، يدعم C6100 وغيره |
| **Preload (Electron)** | موجود | `rfid:list-ports`, `rfid:start`, `rfid:stop`, `onRfidTag` |
| **Main process** | غير منفذ | لا يوجد في `electron-main.js` أي IPC لـ RFID أو Serial/COM |

**خلاصة:** RFID كـ keyboard wedge يعمل في الويب؛ ربط حقيقي بـ COM Port في Electron غير منفذ.

---

### 2.8 Printer Integration — غير منفذ

| المكون | الحالة |
|--------|--------|
| **Preload** | يعرض `printer:print-html` |
| **Main process** | لا يوجد handler لطباعة HTML أو باركود |

---

## ملخص سريع

| المهمة | الحالة | ملاحظة |
|--------|--------|--------|
| **1.1 License Server API** | جاهز | activate + check، حد أجهزة، تخزين hash |
| **1.2 Auto-suspend** | جاهز عند الطلب | يفتقد cron دوري فقط |
| **1.3 Hardware ID** | جزئي | Backend جاهز؛ Electron main لا يولد/يرجع hardware ID |
| **1.4 Sync API** | جاهز | upload/download + conflict resolution |
| **2.1 Electron Setup** | جزئي | نافذة + preload؛ بدون IPC في main |
| **2.2 Local DB** | جزئي | IndexedDB + مزامنة جاهزة؛ لا SQLite |
| **2.3 License Verification** | جزئي | يعمل مع fallback deviceId؛ يحتاج hardware ID حقيقي في Desktop |
| **2.4 Obfuscation** | غير منفذ | — |
| **2.5 Auto-Update** | غير منفذ | الحزمة موجودة فقط |
| **2.6 Installer** | أساسي | electron-builder بدون تفاصيل شعار/حقوق |
| **2.7 RFID** | جزئي | keyboard wedge في الويب؛ COM في Electron غير منفذ |
| **2.8 Printer** | غير منفذ | — |

---

## أولويات مقترحة لإكمال الخطوتين

1. **إكمال Electron Main:** تسجيل handlers في `electron-main.js` لـ:
   - `license:get-hardware-id` (مثلاً عبر مكتبة machine-id)
   - (اختياري) إعادة استخدام نفس استدعاءات الـ license API من الـ renderer عبر main إذا لزم الأمر
2. **Cron للـ Auto-suspend (اختياري):** مهمة دورية تحدث `tenant.status` للشركات المنتهية بدون انتظار طلب ترخيص.
3. **تحديث تلقائي:** ربط `electron-updater` في main مع `app:check-updates`.
4. **الطباعة:** تنفيذ `printer:print-html` في main (مثلاً بـ `window.webContents.print` أو مكتبة طباعة).
5. **RFID على COM (للموبايل/Desktop):** تنفيذ `rfid:*` في main مع مكتبة Serial Port.

تم إنشاء هذا الملف بعد فحص الكود الموجود فقط؛ أي تغيير لاحق في المشروع قد يغيّر بعض التفاصيل.
