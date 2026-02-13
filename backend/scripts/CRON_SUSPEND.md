# Auto-Suspend (تعليق التراخيص المنتهية تلقائياً)

يتم تعليق الشركات (tenants) التي انتهى اشتراكها تلقائياً بإحدى الطريقتين:

---

## 1. المهمة المجدولة داخل السيرفر (مفعّلة افتراضياً)

عند تشغيل الباكند، تُشغّل مهمة في الخلفية تنفّذ منطق التعليق كل فترة.

| متغير البيئة | الوصف | الافتراضي |
|--------------|--------|-----------|
| `SUSPEND_AUTO_RUN` | تفعيل المهمة الداخلية: `true` أو `false` | `true` |
| `SUSPEND_CHECK_INTERVAL_SECONDS` | الفترة بين كل تشغيل (ثانية) | `3600` (ساعة) |

**أمثلة:**

- تشغيل كل 24 ساعة: `SUSPEND_CHECK_INTERVAL_SECONDS=86400`
- إيقاف المهمة الداخلية واستخدام Cron/Task Scheduler فقط: `SUSPEND_AUTO_RUN=false`

---

## 2. استدعاء من خارج السيرفر (Cron / Windows Task Scheduler)

يمكن استدعاء الـ API من جدولة خارجية بدل (أو بالإضافة إلى) المهمة الداخلية.

### الطريقة أ: سكربت Python

```bash
cd backend
set BACKEND_URL=http://localhost:8001
REM اختياري إذا ضبطت SUSPEND_CRON_SECRET في السيرفر:
REM set SUSPEND_CRON_SECRET=your-secret
python scripts/run_suspend_expired.py
```

### الطريقة ب: ملف Batch (ويندوز)

من مجلد المشروع (مجلد فيه `backend`):

```bat
set BACKEND_URL=http://localhost:8001
backend\scripts\run_suspend_expired.bat
```

ثم في **المجدول الزمني (Task Scheduler)**:
- البرنامج: `backend\scripts\run_suspend_expired.bat` أو المسار الكامل للسكربت.
- التوقيت: يومياً (أو كل ساعة) حسب الحاجة.

### الطريقة ج: استدعاء HTTP مباشر

إذا كان السيرفر يعمل واختيارك استخدام `SUSPEND_CRON_SECRET`:

```bash
curl -X POST "http://localhost:8001/api/licenses/suspend-expired" -H "X-Cron-Secret: YOUR_SECRET"
```

---

## تأمين استدعاء Cron (اختياري)

في ملف `.env` أو بيئة السيرفر:

```env
SUSPEND_CRON_SECRET=كلمة_سر_قوية
```

عند ضبطها، أي طلب لـ `POST /api/licenses/suspend-expired` يجب أن يرسل الهيدر:

```
X-Cron-Secret: كلمة_سر_قوية
```

وإلا سيرد السيرفر `401 Unauthorized`.
