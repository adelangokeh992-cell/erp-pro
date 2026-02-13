# نظام ERP متعدد الشركات

نظام إدارة موارد مؤسسية (ERP) متعدد الشركات (Multi-Tenant) بواجهة ويب تدعم العربية والإنجليزية.

## التشغيل السريع

1. **تشغيل الـ Backend:** من مجلد المشروع:
   - افتح مجلد `backend` وشغّل **start_backend.bat**، أو
   - من الطرفية: `cd backend` ثم `venv\Scripts\activate` ثم `python -m uvicorn server:app --host 0.0.0.0 --port 8002`
2. **تشغيل الـ Frontend:** في نافذة أخرى: `cd frontend` ثم `npm start`
3. افتح المتصفح على: **http://localhost:3000**
4. **بيانات الدخول للتجربة:**
   - مستخدم شركة: **DEMO** / **demo** / **Demo@123**
   - مدير النظام: **superadmin** / **Admin@123**

للتفاصيل الكاملة (المتطلبات، التنصيب، MongoDB، الأجهزة، أوفلاين): انظر [INSTALL_LOCAL.md](INSTALL_LOCAL.md).

## البناء للنشر (Deploy)

- **Backend:** شغّل على السيرفر بـ `uvicorn server:app --host 0.0.0.0 --port 8002` (من مجلد `backend` بعد تفعيل الـ venv وتنصيب المتطلبات). ضبط `MONGO_URL` و `CORS_ORIGINS` في `.env` حسب البيئة.
- **Frontend (ويب):** من مجلد `frontend`: `npm run build` ثم انشر محتويات مجلد `build` على خادم ويب (أو reverse proxy أمام الـ Backend).
- **تطبيق Desktop (Electron):** من مجلد `frontend`: `npm run build` ثم `npm run dist` (أو `npm run build:electron` لتنفيذ البناء ثم التعبئة معاً). للمثبّت Windows يُستخدم أيقونة من `build/icon.ico` إن وُجد. لتفعيل تشويش كود الواجهة: `set OBFUSCATE_BUILD=true` ثم `npm run build` قبل `npm run dist`.
