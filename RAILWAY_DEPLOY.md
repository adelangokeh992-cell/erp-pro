# نشر ERP Pro على Railway

## المشكلة التي تم حلها

Railpack لا يستطيع تحديد طريقة البناء لأن المشروع **monorepo** (backend + frontend في مجلدات فرعية). الحل: تحديد **Root Directory** لخدمة الـ API.

---

## خطوات النشر (Backend API)

### 1. إعداد المشروع على Railway

1. ادخل إلى [Railway Dashboard](https://railway.app) → مشروعك → الخدمة (Service).
2. افتح **Settings** (الإعدادات).
3. في **Build**:
   - **Root Directory:** اكتب `backend` (مهم جداً).
   - **Config File Path (اختياري):** `/backend/railway.json` إذا أردت استخدام الإعدادات من الملف.
4. احفظ التغييرات.

### 2. متغيرات البيئة (Variables)

أضف المتغيرات التالية في **Variables**:

| المتغير | الوصف | مثال |
|---------|-------|------|
| `MONGO_URL` | رابط اتصال MongoDB | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `DB_NAME` | اسم قاعدة البيانات | `erp_production` |
| `SECRET_KEY` | مفتاح سري للجلسات | سلسلة عشوائية طويلة وقوية |

**متغيرات اختيارية:**

| المتغير | الوصف |
|---------|-------|
| `FRONTEND_URL` | رابط الـ frontend (لـ CORS) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | لإرسال البريد |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | لـ Stripe |
| `SENTRY_DSN` | لمراقبة الأخطاء |

### 3. إعادة النشر

بعد ضبط **Root Directory** والمتغيرات:

- **Redeploy** من لوحة Railway، أو
- ادفع تغييرات جديدة إلى GitHub لتفعيل النشر التلقائي.

---

## ما الذي يحدث بعد ضبط Root Directory؟

عند ضبط `backend` كـ Root Directory:

1. Railpack يرى `requirements.txt` و `server.py` داخل `backend/`.
2. يكتشف المشروع كـ **Python + FastAPI**.
3. يثبت الحزم ويشغّل: `uvicorn server:app --host 0.0.0.0 --port $PORT`.
4. Railway يوفّر `PORT` تلقائياً.

ملف `backend/railway.json` يحدد:
- أمر التشغيل الصريح.
- مسار الـ healthcheck: `/api/health`.

---

## نشر الـ Frontend

الـ frontend (React) منفصل. يمكن نشره على:

- **Vercel** أو **Netlify** (مثالي لـ React).
- أو خدمة أخرى من Railway إذا أردت.

تأكد من ضبط `VITE_API_URL` أو المتغير المناسب ليشير إلى رابط الـ API على Railway (مثل `https://xxx.railway.app`).

---

## التحقق من النشر

بعد نجاح النشر:

```
https://عنوان-خدمتك.railway.app/api/health
```

يفترض أن يرجع:

```json
{"status":"healthy","database":"connected"}
```

---

## ملخص سريع

1. **Root Directory** = `backend`.
2. أضف `MONGO_URL`, `DB_NAME`, `SECRET_KEY`.
3. أعد النشر.
4. اختبر `/api/health`.
