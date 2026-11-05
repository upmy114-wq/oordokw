# صفحة الدفع + لوحة التحكم

موقع بسيط بدون أي مكتبات خارجية (Node built-in فقط).

## الصفحات
- `public/index.html` — صفحة الدفع (الرئيسية). عند الضغط على "دفع" يتم إرسال **رقم الجوال + مبلغ الشحن** للوحة التحكم ثم الانتقال لصفحة الملخص.
- `public/summary.html` — صفحة الملخص واختيار طريقة الدفع.
- `public/admin.html` — **لوحة التحكم** (محمية بكلمة مرور).

## لوحة التحكم
- الرابط: `/admin.html` (مثال: `https://your-app.up.railway.app/admin.html`)
- تعرض جدول بـ **رقم الجوال** و **قيمة الشحن** والوقت، ويتحدّث تلقائيًا كل 4 ثوانٍ.
- زر **الواي فاي** يعرض **عدد الزيارات النشطة** على الموقع الآن (أي زائر فتح الموقع خلال آخر 30 ثانية).

### كلمة المرور
الافتراضية للتجربة: `admin123`
**غيّرها في Railway** من: Variables → أضف متغير:
```
ADMIN_PASSWORD = كلمة_المرور_القوية
```

## التشغيل محليًا
```bash
npm start
```
ثم افتح: http://localhost:3000 — واللوحة: http://localhost:3000/admin.html

## الرفع على GitHub
```bash
git init
git add .
git commit -m "payment site + admin"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

## النشر على Railway
1. New Project → Deploy from GitHub repo → اختار الريبو.
2. Railway يكتشف Node تلقائيًا ويشغّل `npm start`.
3. من **Variables** أضف `ADMIN_PASSWORD`.
4. من **Settings → Networking → Generate Domain** لإنشاء رابط الموقع.

> ملاحظة: الطلبات تُحفظ في ملف `data/submissions.json`. على Railway هذا الملف **مؤقت** ويُمسح عند كل إعادة نشر (redeploy). لو عايز تخزين دائم، استخدم قاعدة بيانات (مثل Railway Postgres) — أقدر أساعدك في الربط.
