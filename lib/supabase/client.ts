import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// لا نرمي استثناءً هنا عن قصد: هذه الوحدة تُستورد (بشكل غير مباشر) من الصفحة الرئيسية ومن صفحات
// لوحة الإدارة، ويحاول Next.js تنفيذها أثناء `next build` لتوليد الصفحات الساكنة — رمي خطأ هنا
// يكسر البناء بالكامل قبل حتى ضبط متغيرات البيئة. بدل ذلك، نستخدم قيمًا احتياطية غير فعّالة
// فقط لتفادي فشل الإنشاء، وأي استدعاء فعلي لـ Supabase بدون بيئة حقيقية سيفشل بوضوح وقت التشغيل
// في المتصفح (حيث يسهل تشخيصه)، وليس وقت البناء.
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY غير معرّفَين — انسخ .env.local.example إلى .env.local واملأه."
  );
}

/** عميل Supabase الموحّد — يُستخدم في SupabaseChatAdapter وفي كل صفحات لوحة الإدارة */
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
