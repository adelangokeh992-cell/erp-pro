# النسخ الاحتياطي والاستعادة | Backup & Restore

## التصدير اليدوي (Manual Export)

1. سجّل الدخول كمدير شركة أو super admin
2. اذهب إلى الإعدادات > النسخ الاحتياطي
3. اضغط "تحميل نسخة احتياطية" لتصدير بيانات شركتك كملف JSON

## الاستعادة اليدوية (Manual Restore)

1. سجّل الدخول
2. الإعدادات > النسخ الاحتياطي
3. اختر ملف JSON المصدر من النسخة الاحتياطية
4. تأكيد الاستعادة (ستستبدل البيانات الحالية)

## النسخ الاحتياطي المجدول (Scheduled Backup)

لتفعيل النسخ الاحتياطي التلقائي:

1. أضف في `.env`:
   ```
   BACKUP_CRON_SECRET=your-secure-random-secret
   BACKUP_DIR=/path/to/backups
   ```

2. استخدم cron (Linux) أو Task Scheduler (Windows):

   **Linux/Mac (cron - يومياً الساعة 2 صباحاً):**
   ```
   0 2 * * * curl -X POST "https://your-api.com/api/backup/scheduled?secret=YOUR_SECRET"
   ```

   **Windows Task Scheduler:**
   - إنشاء مهمة جديدة
   - الإجراء: بدء برنامج
   - البرنامج: `curl` أو `Invoke-WebRequest`
   - الوسائط: `-X POST "https://your-api.com/api/backup/scheduled?secret=YOUR_SECRET"`

3. الملفات تُحفظ في `BACKUP_DIR` بصيغة: `{tenantId}_{YYYYMMDD_HHMMSS}.json`
