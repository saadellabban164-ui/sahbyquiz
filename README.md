# صاحبي عارفني؟ — How Well Do You Know Me?

تطبيق اختبارات عربي أولًا للأصحاب والمدرسين والمرتبطين. الواجهة HTML/CSS/JavaScript وتعمل كتطبيق PWA قابل للتثبيت، وطبقة الإنتاج Firebase Authentication وFirestore وCloud Functions وFirebase Hosting.

## المزايا الجديدة

يمكن إنشاء الاختبار بثلاثة أوضاع: أصحاب، اختبار علاقة، أو مدرس وطلاب. في وضع المدرس يكتب المدرس إيميله، وكل طالب يكتب اسمه ويحل مرة واحدة من الجهاز نفسه. بعد 24 ساعة تنشئ الوظيفة المجدولة صورة PNG بتقرير النتائج وترسلها إلى إيميل المدرس من خلال Resend. الكود البرمجي يمنع التكرار محليًا وبسجل `deviceKey` على الخادم؛ هذا يمنع إعادة الدخول من نفس المتصفح/الجهاز، مع العلم أن أي نظام متصفح لا يستطيع إثبات هوية جهاز ماديًا بنسبة 100% إذا تم مسح بياناته.

يوجد دخول اختياري بالبريد وكلمة المرور عبر Firebase Authentication. من غير حساب، يظل إنشاء وحل الاختبارات متاحًا. الحساب يساعد صاحب الاختبار على الوصول إلى إدارته من أجهزة مختلفة. الشعار المستخدم هو الصورة المرفقة داخل `logo.png`، ولا يوجد رابط `vsos.example` في التذييل.

## تشغيل Firebase Hosting

1. أنشئ مشروعًا في Firebase Console.
2. فعّل Authentication: Anonymous وEmail/Password، وأنشئ Firestore.
3. انسخ `firebase-config.example.js` إلى `firebase-config.js` وضع قيم المشروع العامة.
4. انسخ `.firebaserc.example` إلى `.firebaserc` واستبدل `YOUR_FIREBASE_PROJECT_ID` بمعرّف المشروع.
5. ثبّت CLI وسجّل الدخول:

```bash
npm install -g firebase-tools
firebase login
firebase use YOUR_FIREBASE_PROJECT_ID
npm install --prefix functions
firebase deploy --only hosting,firestore:rules,functions
```

سيكون الموقع على `https://YOUR_FIREBASE_PROJECT_ID.web.app`، والروابط القصيرة ستكون بصيغة `?q=quiz_id` بدل وضع بيانات الاختبار الطويلة داخل الرابط. كود الدخول المكون من 6 أرقام يظل متاحًا أيضًا.

## تقرير المدرس بعد 24 ساعة

وظيفة `sendTeacherReports` تعمل كل 15 دقيقة وتبحث عن التقارير المستحقة. قبل نشر Functions، أضف إعدادات Resend الآمنة:

```bash
firebase functions:secrets:set RESEND_API_KEY
firebase functions:config:set reports.from_email="reports@your-domain.com"
```

أو استخدم متغيرات البيئة في بيئة Functions، مع تفعيل دومين إرسال موثّق في Resend. لا تضع مفتاح Resend في ملفات الواجهة. الوظيفة ترسل صورة `quiz-report.png` فيها المتوسط وقائمة الطلاب ودرجاتهم.

## الحماية والإدارة

`quizzes` عام للقراءة إذا كان الاختبار فعالًا، بينما `quizPrivate` يحتوي إجابات المنشئ ولا يقرأه إلا المالك. `submissions` و`reportJobs` للمالك فقط. وظيفة الإرسال هي المسار الوحيد لكتابة النتيجة، وتتحقق من عدم وجود `deviceKey` سبق استخدامه لنفس الاختبار. فعّل App Check من Firebase Console قبل الإنتاج؛ الدالة تستخدم `enforceAppCheck`.

## فحص محلي

```bash
python3 -m http.server 3000
```

ثم افتح `http://localhost:3000`. وضع المتصفح المحلي يحفظ البيانات في المتصفح فقط حتى يتم ربط Firebase.

## النشر البديل

يوجد Workflow لـ GitHub Pages كنسخة احتياطية، لكن **Firebase Hosting هو المسار الموصى به** لأنه يعمل مباشرة مع Firestore وFunctions والروابط القصيرة.
