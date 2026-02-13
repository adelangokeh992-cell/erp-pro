# رفع الـ Backend على سيرفر (أول نسخة)

## المطلوب

| المطلوب | الوصف |
|---------|--------|
| **سيرفر** | VPS (Linux) أو منصة مثل Railway / Render |
| **MongoDB** | على السيرفر أو MongoDB Atlas (مجاني للبداية) |
| **متغيرات بيئة** | `MONGO_URL`, `DB_NAME`, `SECRET_KEY` |
| **HTTPS** | دومين + شهادة SSL (أو جاهز من المنصة) |

---

## المتغيرات المهمة (Environment)

أنشئ ملف `.env` على السيرفر (أو اضبطها في لوحة الاستضافة):

```env
MONGO_URL=mongodb://localhost:27017
# أو Atlas: mongodb+srv://user:pass@cluster.mongodb.net/

DB_NAME=erp_production

SECRET_KEY=استخدم-سلسلة-عشوائية-طويلة-وقوية-هنا
```

- **SECRET_KEY:** غيّرها ولا تترك القيمة الافتراضية في الإنتاج.

---

## الطريقة 1: VPS (مثلاً Ubuntu)

1. **اتصل بالسيرفر:** `ssh user@ip-server`
2. **ثبّت Python 3.11+ و MongoDB** (أو استخدم MongoDB Atlas واترك MONGO_URL يشير له).
3. **انسخ مجلد الـ backend** أو استنسخ من Git.
4. **أنشئ بيئة افتراضية وتثبيت الحزم:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate   # Linux/Mac
   pip install -r requirements.txt
   ```
5. **أنشئ ملف `.env`** وضبط `MONGO_URL`, `DB_NAME`, `SECRET_KEY`.
6. **شغّل الخادم (تجربة):**
   ```bash
   uvicorn server:app --host 0.0.0.0 --port 8002
   ```
7. **لتشغيل دائم:** استخدم systemd أو screen/tmux:
   - مثال systemd: وحدة خدمة تشغّل `uvicorn server:app --host 0.0.0.0 --port 8002` من مجلد الـ backend.
8. **HTTPS:** ثبّت Nginx كـ reverse proxy + Certbot (Let's Encrypt) لشهادة مجانية، ووجّه الطلبات من المنفذ 443 إلى `http://127.0.0.1:8002`.

---

## الطريقة 2: منصة جاهزة (Railway / Render)

1. سجّل واتصل المستودع (Git) أو ارفع مجلد الـ backend.
2. حدد أن الـ **Root** أو **Start Command** هو تشغيل الـ API، مثلاً:
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn server:app --host 0.0.0.0 --port ${PORT:-8002}`
3. أضف **MongoDB:** إما خدمة MongoDB من المنصة أو MongoDB Atlas، ثم ضبط **MONGO_URL** و **DB_NAME** في متغيرات البيئة.
4. ضبط **SECRET_KEY** في متغيرات البيئة.
5. المنصة تعطيك دومين بـ HTTPS جاهز (مثل `xxx.railway.app`).

---

## الطريقة 3: Docker Compose

من المجلد الرئيسي للمشروع:

```bash
docker-compose up -d
```

يشغّل MongoDB على المنفذ 27017 والـ Backend على 8002. للتخصيص، أنشئ ملف `.env` وضبط `SECRET_KEY`.

---

## توثيق الـ API (Swagger)

بعد تشغيل الـ Backend، افتح:
- **Swagger UI:** `http://localhost:8002/api/docs`
- **ReDoc:** `http://localhost:8002/api/redoc`

---

## التحقق

- من المتصفح أو أي أداة:  
  `https://عنوان-سيرفرك/api/health`  
  يفترض يرجع: `{"status":"healthy","database":"connected"}`

---

## ملخص سريع

1. اختر: VPS أو Railway/Render.
2. جهّز MongoDB (محلي أو Atlas).
3. اضبط `.env`: `MONGO_URL`, `DB_NAME`, `SECRET_KEY`.
4. شغّل: `uvicorn server:app --host 0.0.0.0 --port 8002` (أو المنفذ اللي تعطيه المنصة).
5. فعّل HTTPS (Nginx+Certbot على VPS، أو استخدم دومين المنصة).

بعدها ضبط تطبيق الويندوز والموبايل على هذا الرابط (مثلاً `https://api.yourproduct.com`).
