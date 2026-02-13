# دليل النشر | Deployment Guide

## المتطلبات

- Docker & Docker Compose
- MongoDB (أو استخدم صورة mongo في docker-compose)
- نطاق (domain) مع SSL

## الإعداد للإنتاج

1. انسخ `.env.example` إلى `.env` واملأ القيم:

```bash
cp backend/.env.example backend/.env
```

2. المتغيرات الأساسية:

| المتغير | الوصف |
|---------|-------|
| SECRET_KEY | مفتاح عشوائي آمن (32+ حرف) |
| CORS_ORIGINS | نطاقات الفرونتند المسموحة (مفصولة بفاصلة) |
| MONGO_URL | رابط MongoDB |
| STRIPE_API_KEY | مفتاح Stripe Live |
| STRIPE_WEBHOOK_SECRET | سر Webhook من Stripe |
| SMTP_* | إعدادات البريد |
| FRONTEND_URL | رابط التطبيق (للبريد) |

3. تشغيل بالإنتاج:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

4. للوصول عبر نطاق مع SSL، استخدم Nginx أو Caddy كـ reverse proxy أمام Docker.

## النسخ الاحتياطي

راجع [BACKUP_RESTORE.md](./BACKUP_RESTORE.md)

## المراقبة

- Health check: `GET /api/health`
- للـ Sentry: أضف `sentry-sdk` وادمج في `server.py`
