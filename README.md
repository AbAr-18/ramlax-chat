# رملة — Ramla Chat Widget (Rimal X)

Chat Widget لموقع رمال (Rimal X)، مبني بـ Next.js App Router + TypeScript + Tailwind CSS، مع Backend حقيقي عبر Supabase (قاعدة بيانات، بحث نصي كامل، لوحة إدارة CRUD).

## الإعداد المحلي

```bash
npm install
cp .env.local.example .env.local   # واملأ NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

## قاعدة البيانات

1. أنشئ مشروع Supabase جديد.
2. شغّل `supabase/migrations/0001_init.sql` على قاعدة البيانات (عبر SQL Editor في لوحة Supabase، أو `psql`، أو Supabase CLI).
3. شغّل `supabase/seed.sql` بعده لتعبئة التصنيفات العشرة والأسئلة الـ150 وبيانات تدفق التأهيل والترشيح.
4. أنشئ أول مستخدم دخول للوحة الإدارة من Supabase Dashboard → Authentication → Users → Add user (بريد إلكتروني وكلمة مرور). أي مستخدم `authenticated` في Supabase Auth يملك صلاحية كاملة على كل الجداول حسب سياسات RLS المطبّقة في الـ migration.

## لوحة الإدارة

بعد تسجيل الدخول من `/admin/login`، تتوفر إدارة كاملة (CRUD) لِـ: التصنيفات، أسئلة قاعدة المعرفة الـ150، أسئلة/خيارات التأهيل وقواعد الترشيح، العملاء المحتملون (Leads)، وسجل المحادثات (للمراجعة فقط).

## دمج الويدجت في موقع خارجي (rimalx.co)

هناك طريقتان جاهزتان، وثّقتان هنا فقط دون تنفيذ فعلي على rimalx.co لأنه خارج نطاق هذا المستودع:

### 1) موقع Next.js/React مباشر

إذا كان rimalx.co نفسه مبنيًا بـ Next.js/React، يمكن استيراد المكوّن مباشرة:

```tsx
import ChatWidget from "@/components/chat/ChatWidget";
// ضعه مرة واحدة في layout.tsx أو الصفحة الرئيسية
<ChatWidget />
```

يتطلب ذلك أن يكون نفس مستودع رملة (أو حزمة منشورة منه) جزءًا من مشروع rimalx.co، مع متغيرات البيئة `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` معرّفة هناك أيضًا.

### 2) Embed script عام (لأي موقع HTML، حتى لو لم يكن Next.js)

أضف سطرًا واحدًا قبل إغلاق `</body>` في أي صفحة:

```html
<script src="https://ramlax-chat.vercel.app/embed.js" async></script>
```

هذا السكربت (`/public/embed.js`) يحقن `<iframe>` شفافًا يشير إلى `/widget` (صفحة معزولة تعرض `ChatWidget` فقط، انظر `/app/widget/page.tsx`)، ثابتًا أسفل يمين الشاشة.

**قيد معروف**: الويدجت يبدّل موضعه داخليًا (يمين↔يسار) عند تبديل اللغة من زر AR/EN، لكن الـ iframe الخارجي لا يتزامن مع تلك الحالة حاليًا ويبقى ثابتًا على اليمين افتراضيًا. لموقع إنجليزي بالكامل، عدّل `right`→`left` يدويًا في `embed.js`، أو نفّذ لاحقًا مزامنة عبر `postMessage` بين الصفحتين.

## طبقة البيانات (Adapter Pattern)

- `lib/adapters/ChatDataAdapter.ts` — الواجهة الموحّدة (لا تتغيّر بتغيّر التنفيذ).
- `lib/adapters/SupabaseChatAdapter.ts` — التنفيذ الفعلي الحالي (Supabase)، وهو ما يستخدمه `ChatWidget.tsx`.
- `lib/adapters/MockChatAdapter.ts` — أُبقي عليه كمرجع/Fallback للتطوير المحلي بدون اتصال Supabase (غير مستخدم فعليًا في الواجهة حاليًا).

## المتبقي لإكمال مشروع رملة الكامل

- تكامل Escalation حقيقي مع فريق المبيعات (تيليجرام/واتساب/CRM فعلي بدل رسالة تأكيد ثابتة).
- تحسين دقة البحث عبر Embeddings/Vector search بدل مطابقة الكلمات المفتاحية، إن رغبنا بـ RAG حقيقي لاحقًا.
- اختبارات آلية (unit/e2e).
- دمج فعلي داخل كود rimalx.co نفسه (وليس فقط تجهيز embed.js وتوثيقه).
