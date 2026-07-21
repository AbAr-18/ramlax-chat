-- رملة — Backend حقيقي (المرحلة الثانية)
-- المخطط الكامل: تصنيفات، قاعدة معرفة، تأهيل، ترشيح، عملاء محتملون، سجل محادثات
-- شغّل هذا الملف مرة واحدة على قاعدة بيانات Supabase فارغة، ثم شغّل seed.sql بعده.

create extension if not exists pgcrypto;

-- =========================================================
-- 1) الجداول
-- =========================================================

create table categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table knowledge_base (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  keywords_ar text[] not null default '{}',
  keywords_en text[] not null default '{}',
  question_ar text not null,
  question_en text not null,
  answer_ar text not null,
  answer_en text not null,
  citation_ar text,
  citation_en text,
  confidence int not null default 90 check (confidence between 0 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- to_tsvector() الأصلية معلَّمة STABLE (وليست IMMUTABLE) في Postgres حتى مع regconfig ثابت، لأن
-- القواميس يمكن تعديلها وقت التشغيل نظريًا — لذا لا يقبلها Postgres مباشرة داخل عمود GENERATED.
-- الحل القياسي الموثّق (Postgres wiki): لفّها بدالة IMMUTABLE مخصّصة، آمن هنا لأن 'simple' قاموس
-- مدمج ثابت لا يُعدَّل أبدًا. array_to_string() نفسها معلَّمة STABLE أيضًا في Postgres، لذا يجب أن
-- تُستدعى من *داخل* دالة IMMUTABLE (Postgres يثق بإعلان immutable للدالة نفسها ولا يتحقق من
-- التوابع التي تستدعيها بداخلها)، لا مباشرة داخل تعريف العمود المولَّد.
create or replace function immutable_simple_tsvector(text)
returns tsvector
language sql
immutable
parallel safe
as $$
  select to_tsvector('simple'::regconfig, coalesce($1, ''));
$$;

create or replace function immutable_simple_tsvector_arr(text[])
returns tsvector
language sql
immutable
parallel safe
as $$
  select to_tsvector('simple'::regconfig, coalesce(array_to_string($1, ' '), ''));
$$;

-- عمود بحث نصي كامل مولَّد تلقائيًا: يغطي الكلمات المفتاحية (وزن أعلى) ونص السؤال (وزن أدنى).
-- ملاحظة مهمة: نستخدم إعداد البحث 'simple' (توكينايز + تحويل لحروف صغيرة فقط، بدون تجذير/Stemming)
-- لأن Postgres/Supabase لا يشحنان قاموس تجذير عربي جاهزًا افتراضيًا (بعكس english/french/...).
-- لذلك الاعتماد الأساسي في المطابقة هو تطابق الكلمات المفتاحية (keywords_ar/keywords_en) حرفيًا
-- عبر عامل التقاطع بين المصفوفات (&&)، والبحث النصي هنا مكمّل/احتياطي فقط. راجع ملخص القيود آخر الرد.
alter table knowledge_base
  add column search_vector tsvector
  generated always as (
    setweight(immutable_simple_tsvector_arr(keywords_ar), 'A') ||
    setweight(immutable_simple_tsvector_arr(keywords_en), 'A') ||
    setweight(immutable_simple_tsvector(question_ar), 'B') ||
    setweight(immutable_simple_tsvector(question_en), 'B')
  ) stored;

create index knowledge_base_keywords_ar_idx on knowledge_base using gin (keywords_ar);
create index knowledge_base_keywords_en_idx on knowledge_base using gin (keywords_en);
create index knowledge_base_search_idx on knowledge_base using gin (search_vector);
create index knowledge_base_category_idx on knowledge_base (category_id);

create table qualification_questions (
  id text primary key, -- budget, teamSize, usageType
  question_ar text not null,
  question_en text not null,
  sort_order int not null default 0
);

create table qualification_options (
  id text primary key, -- b1, b2, b3, t1, t2, t3, u1, u2, u3
  question_id text not null references qualification_questions(id) on delete cascade,
  label_ar text not null,
  label_en text not null,
  sort_order int not null default 0
);

create table recommendation_rules (
  id uuid primary key default gen_random_uuid(),
  match_conditions jsonb not null, -- مثال: {"usageType": "u2"} أو {"teamSize": "t1", "budget": "b1"}
  priority int not null default 0, -- الأولوية الأعلى تُفحص أولًا
  result_id text not null,
  name_ar text not null,
  name_en text not null,
  reason_template_ar text not null,
  reason_template_en text not null
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  qualification_answers jsonb,
  recommended_option text,
  lang text not null default 'ar',
  status text not null default 'new', -- new / contacted / converted / rejected
  created_at timestamptz not null default now()
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  lang text not null default 'ar',
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender text not null check (sender in ('user', 'assistant')),
  text text,
  matched_knowledge_id uuid references knowledge_base(id) on delete set null,
  confidence int,
  has_answer boolean,
  created_at timestamptz not null default now()
);

create index conversation_messages_conversation_idx on conversation_messages (conversation_id);
create index leads_status_idx on leads (status);

-- =========================================================
-- 2) تحديث updated_at تلقائيًا عند تعديل صف في knowledge_base
-- =========================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger knowledge_base_set_updated_at
  before update on knowledge_base
  for each row
  execute function set_updated_at();

-- =========================================================
-- 3) دالة المطابقة: أولوية لتضمّن الكلمات المفتاحية المنسَّقة يدويًا (إشارة موثوقة ومنزوعة الغموض
--    عبر التصنيف)، ثم البحث النصي الكامل كترتيب/احتياط ثانوي فقط.
--
-- ملاحظات مهمة اكتُشفت أثناء الاختبار الفعلي على قاعدة بيانات حقيقية (وليس افتراضًا نظريًا):
-- 1) keywords_ar/keywords_en تحتوي عبارات من كلمتين أحيانًا (مثل "مساحة عمل") كعنصر واحد في
--    المصفوفة، لذا عامل تقاطع المصفوفات (&&) لا يعمل أبدًا معها (يتطلب تطابقًا حرفيًا لعنصر كامل
--    مقابل كلمة واحدة من الاستعلام). الحل: مطابقة تضمّن نصي (kw داخل نص الاستعلام) عبر unnest، وهو
--    ما يطابق فعليًا سلوك المطابقة بالتضمّن (.includes) المستخدم أصلًا في MockChatAdapter.ts.
-- 2) إعداد البحث 'simple' لا يحذف كلمات الوقف (Stopwords) — فكلمات استفهام عربية شائعة جدًا مثل
--    "ما"/"هل"/"هي" تتكرر في كل الأسئلة تقريبًا، فتُنتج تطابقات وهمية عبر websearch_to_tsquery إن
--    استُخدمت بدلالة OR دون تصفية. الحل: استبعاد قائمة كلمات وقف صغيرة قبل بناء tsquery.
-- 3) مطابقة التضمّن النصي البسيطة (position) لا تحترم حدود الكلمة، فكلمة مفتاحية إنجليزية مفردة
--    مثل "course" تُطابق كجزء من كلمة أخرى مثل "courses" خطأً. الحل: استخدام حدود الكلمة في
--    التعبيرات النمطية (\y في محرك Postgres المتقدّم، مكافئ لـ \b) بدل position/substring الخام.
--    (جُرِّب أيضًا السماح بـ "s" اختيارية لتغطية الجمع الإنجليزي البسيط، لكنه أعاد فتح نفس مشكلة
--    "course"⊂"courses" عبر عدة إدخالات أخرى تستخدم "course" كمفتاح عام — فتم التراجع عنه؛ الأصوب
--    هو إضافة صيغة الجمع صراحة كعنصر إضافي في مصفوفة الكلمات المفتاحية عند الحاجة الفعلية لها.)
-- هذه القيود كلها ناتجة عن عدم توفر تجذير (Stemming) حقيقي في Postgres/Supabase الافتراضي؛ الحل
-- الجذري لاحقًا هو Embeddings/Vector search كما هو مذكور في ملخص الأسابيع 2-4 المتبقية.
create or replace function match_knowledge_base(p_query text, p_lang text default 'ar')
returns setof knowledge_base
language plpgsql
stable
as $$
declare
  v_tsquery tsquery;
  v_tokens text[];
  v_meaningful_tokens text[];
  v_normalized text := lower(trim(coalesce(p_query, '')));
  v_stopwords text[] := array[
    'ما','ماذا','هل','من','في','على','عن','هي','هو','أن','إلى','كم','أين','متى','لماذا','كيف',
    'يا','و','أو','لا','نعم','الذي','التي','هذا','هذه','ذلك','تلك','مع','بعد','قبل','عند','كل',
    'أي','لك','لي','له','لها','انا','أنا','انت','أنت','نحن','هم','أم','ثم','قد','لم','لن','إذا',
    'حتى','بين','عبر','دون','تقدم','تقدمون','رمال','x',
    'what','how','when','where','why','can','i','you','is','a','an','of','to','for','do','does',
    'the','are','in','on','at','with','and','or','not','this','that','it','my','your','we','they',
    'be','will','would','should','could','about','me'
  ];
begin
  v_tokens := regexp_split_to_array(v_normalized, '\s+');
  select array_agg(t) into v_meaningful_tokens
  from unnest(v_tokens) as t
  where length(t) > 1 and not (t = any(v_stopwords));

  v_tsquery := case
    when v_meaningful_tokens is null or array_length(v_meaningful_tokens, 1) is null then null
    else websearch_to_tsquery('simple', array_to_string(v_meaningful_tokens, ' or '))
  end;

  return query
  select kb.*
  from knowledge_base kb
  where kb.is_active = true
    and (
      (p_lang = 'ar' and exists (
        select 1 from unnest(kb.keywords_ar) kw
        where kw <> '' and v_normalized ~ ('\y' || lower(kw) || '\y')
      ))
      or (p_lang = 'en' and exists (
        select 1 from unnest(kb.keywords_en) kw
        where kw <> '' and v_normalized ~ ('\y' || lower(kw) || '\y')
      ))
      or (v_tsquery is not null and kb.search_vector @@ v_tsquery)
    )
  order by
    (
      case
        when p_lang = 'ar' and exists (
          select 1 from unnest(kb.keywords_ar) kw
          where kw <> '' and v_normalized ~ ('\y' || lower(kw) || '\y')
        ) then 10
        when p_lang = 'en' and exists (
          select 1 from unnest(kb.keywords_en) kw
          where kw <> '' and v_normalized ~ ('\y' || lower(kw) || '\y')
        ) then 10
        else 0
      end
      + coalesce(ts_rank(kb.search_vector, v_tsquery), 0)
    ) desc
  limit 1;
end;
$$;

-- الدالة تُستدعى مباشرة من العميل (anon) عبر supabase.rpc(...)، لذا تحتاج صلاحية EXECUTE صريحة.
grant execute on function match_knowledge_base(text, text) to anon, authenticated;

-- =========================================================
-- 4) Row Level Security
-- =========================================================

alter table categories enable row level security;
alter table knowledge_base enable row level security;
alter table qualification_questions enable row level security;
alter table qualification_options enable row level security;
alter table recommendation_rules enable row level security;
alter table leads enable row level security;
alter table conversations enable row level security;
alter table conversation_messages enable row level security;

-- قراءة عامة (anon + authenticated) على جداول المعرفة والتأهيل والترشيح
create policy "categories_select" on categories
  for select to anon, authenticated
  using (true);

create policy "knowledge_base_select_active" on knowledge_base
  for select to anon, authenticated
  using (is_active = true);

create policy "qualification_questions_select" on qualification_questions
  for select to anon, authenticated
  using (true);

create policy "qualification_options_select" on qualification_options
  for select to anon, authenticated
  using (true);

create policy "recommendation_rules_select" on recommendation_rules
  for select to anon, authenticated
  using (true);

-- كتابة عامة (anon) على leads/conversations/conversation_messages فقط (إدخال بدون تسجيل دخول)
create policy "leads_insert_anon" on leads
  for insert to anon, authenticated
  with check (true);

create policy "conversations_insert_anon" on conversations
  for insert to anon, authenticated
  with check (true);

create policy "conversation_messages_insert_anon" on conversation_messages
  for insert to anon, authenticated
  with check (true);

-- المستخدمون المسجّلون (لوحة الإدارة) يملكون صلاحية كاملة على كل الجداول
create policy "categories_all_authenticated" on categories
  for all to authenticated
  using (true) with check (true);

create policy "knowledge_base_all_authenticated" on knowledge_base
  for all to authenticated
  using (true) with check (true);

create policy "qualification_questions_all_authenticated" on qualification_questions
  for all to authenticated
  using (true) with check (true);

create policy "qualification_options_all_authenticated" on qualification_options
  for all to authenticated
  using (true) with check (true);

create policy "recommendation_rules_all_authenticated" on recommendation_rules
  for all to authenticated
  using (true) with check (true);

create policy "leads_all_authenticated" on leads
  for all to authenticated
  using (true) with check (true);

create policy "conversations_all_authenticated" on conversations
  for all to authenticated
  using (true) with check (true);

create policy "conversation_messages_all_authenticated" on conversation_messages
  for all to authenticated
  using (true) with check (true);
