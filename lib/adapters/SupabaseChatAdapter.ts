import { supabase } from "@/lib/supabase/client";
import type { ChatDataAdapter } from "@/lib/adapters/ChatDataAdapter";
import type {
  Language,
  KnowledgeAnswer,
  LeadData,
  QualificationAnswer,
  QualificationQuestion,
  Recommendation,
} from "@/lib/types/chat.types";

/** نفس حد الثقة المنخفضة المستخدم سابقًا في MockChatAdapter — MessageBubble.tsx يستورده من هنا الآن دون أي تعديل عليه */
export const LOW_CONFIDENCE_THRESHOLD = 55;

// نفس الأنماط بالحرف من MockChatAdapter.ts — منطق واجهة أمامية بسيط لا يحتاج قاعدة بيانات
const QUALIFICATION_TRIGGERS = [
  "أبغى مساحة",
  "ابغى مساحة",
  "أبغى عضوية",
  "ابغى عضوية",
  "اريد مساحة",
  "أريد مساحة",
  "اريد عضوية",
  "أريد عضوية",
  "أبي مساحة",
  "ابي مساحة",
  "انضمام",
  "اشتراك",
  "membership",
  "i want a workspace",
  "i want a desk",
  "i need a workspace",
  "i need membership",
  "i want to join",
  "sign up",
  "join rimal",
];

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /تجاهل\s+(كل\s+)?(التعليمات|الأوامر|ما\s*سبق)/i,
  /انسَ\s+تعليماتك/i,
  /تجاهل\s+system\s*prompt/i,
  /ignore\s+(all\s+|any\s+)?(previous|prior|the above|the)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior)\s+instructions/i,
  /reveal\s+(your|the)\s+(system\s+)?prompt/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /system\s*prompt\s*:/i,
];

// قيم احتياطية (Bootstrap) مطابقة تمامًا لِما يزرعه seed.sql — تُستخدم فقط قبل اكتمال أول تحميل من Supabase
// (getQualificationQuestions/getRecommendation في ChatDataAdapter دالتان متزامنتان (sync) وليستا Promise، لذا
// لا يمكن انتظار استعلام Supabase بداخلهما مباشرة؛ الحل هو تحميل مسبق (prefetch) في الخلفية عند إنشاء الأدابتر،
// مع هذه القيم الاحتياطية المطابقة لبيانات seed.sql كضمانة عدم كسر التدفق أثناء لحظات التحميل الأولى القصيرة).
const FALLBACK_QUALIFICATION_QUESTIONS: QualificationQuestion[] = [
  {
    id: "budget",
    questionAr: "ما هي ميزانيتك الشهرية التقريبية؟",
    questionEn: "What's your approximate monthly budget?",
    options: [
      { id: "b1", labelAr: "أقل من 1,000 ريال", labelEn: "Under SAR 1,000" },
      { id: "b2", labelAr: "1,000 - 3,000 ريال", labelEn: "SAR 1,000 - 3,000" },
      { id: "b3", labelAr: "أكثر من 3,000 ريال", labelEn: "Over SAR 3,000" },
    ],
  },
  {
    id: "teamSize",
    questionAr: "كم عدد أفراد فريقك؟",
    questionEn: "How many people are on your team?",
    options: [
      { id: "t1", labelAr: "فردي (شخص واحد)", labelEn: "Just me" },
      { id: "t2", labelAr: "فريق صغير (2-5)", labelEn: "Small team (2-5)" },
      { id: "t3", labelAr: "فريق أكبر (6+)", labelEn: "Larger team (6+)" },
    ],
  },
  {
    id: "usageType",
    questionAr: "ما هو نوع الاستخدام الأساسي؟",
    questionEn: "What's the main type of use?",
    options: [
      { id: "u1", labelAr: "عمل يومي مكتبي", labelEn: "Daily desk work" },
      { id: "u2", labelAr: "اجتماعات فقط", labelEn: "Meetings only" },
      { id: "u3", labelAr: "تدريب وفعاليات", labelEn: "Training & events" },
    ],
  },
];

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

interface KnowledgeRow {
  id: string;
  answer_ar: string;
  answer_en: string;
  citation_ar: string | null;
  citation_en: string | null;
  confidence: number;
  keywords_ar?: string[];
  keywords_en?: string[];
}

interface RecommendationRuleRow {
  match_conditions: Record<string, string>;
  priority: number;
  result_id: string;
  name_ar: string;
  name_en: string;
  reason_template_ar: string;
  reason_template_en: string;
}

/** يطابق تمامًا منطق if/else الثابت الذي كان في MockChatAdapter.getRecommendation — يُستخدم كاحتياط فقط */
function buildFallbackRecommendation(answers: QualificationAnswer[], lang: Language): Recommendation {
  const find = (id: string) => answers.find((a) => a.questionId === id)?.optionId;
  const budget = find("budget") ?? "b1";
  const teamSize = find("teamSize") ?? "t1";
  const usageType = find("usageType") ?? "u1";

  const budgetLabel = answers.find((a) => a.questionId === "budget");
  const teamLabel = answers.find((a) => a.questionId === "teamSize");
  const usageLabel = answers.find((a) => a.questionId === "usageType");

  const reasonAr = `بناءً على ميزانيتك (${budgetLabel?.labelAr ?? ""}) وعدد فريقك (${
    teamLabel?.labelAr ?? ""
  })، هذا الخيار الأنسب لاستخدامك (${usageLabel?.labelAr ?? ""}).`;
  const reasonEn = `Based on your budget (${budgetLabel?.labelEn ?? ""}) and team size (${
    teamLabel?.labelEn ?? ""
  }), this fits your usage (${usageLabel?.labelEn ?? ""}) best.`;

  let result: Omit<Recommendation, "reasonAr" | "reasonEn">;
  if (usageType === "u2") {
    result = { id: "meeting-room", nameAr: "باقة قاعات الاجتماعات", nameEn: "Meeting Room Package" };
  } else if (usageType === "u3") {
    result = { id: "training-hall", nameAr: "قاعة التدريب والفعاليات", nameEn: "Training & Events Hall" };
  } else if (teamSize === "t1" && budget === "b1") {
    result = { id: "hot-desk", nameAr: "مقعد مرن (Hot Desk)", nameEn: "Hot Desk" };
  } else if (teamSize === "t1") {
    result = { id: "dedicated-desk", nameAr: "مكتب مخصص (Dedicated Desk)", nameEn: "Dedicated Desk" };
  } else if (budget === "b3") {
    result = { id: "private-office", nameAr: "مكتب خاص (Private Office)", nameEn: "Private Office" };
  } else {
    result = {
      id: "dedicated-desk-team",
      nameAr: "مكاتب مخصصة للفريق (Dedicated Desks)",
      nameEn: "Team Dedicated Desks",
    };
  }

  void lang;
  return { ...result, reasonAr, reasonEn };
}

class SupabaseChatAdapter implements ChatDataAdapter {
  private qualificationQuestions: QualificationQuestion[] = FALLBACK_QUALIFICATION_QUESTIONS;
  private recommendationRules: RecommendationRuleRow[] | null = null;

  private lastQualificationAnswers: QualificationAnswer[] = [];
  private lastRecommendedId: string | null = null;
  private lastLang: Language = "ar";

  private conversationIdPromise: Promise<string | null> | null = null;

  constructor() {
    void this.loadQualificationData();
  }

  private async loadQualificationData() {
    try {
      const [{ data: questions }, { data: options }, { data: rules }] = await Promise.all([
        supabase
          .from("qualification_questions")
          .select("id, question_ar, question_en, sort_order")
          .order("sort_order"),
        supabase
          .from("qualification_options")
          .select("id, question_id, label_ar, label_en, sort_order")
          .order("sort_order"),
        supabase.from("recommendation_rules").select("*").order("priority", { ascending: false }),
      ]);

      if (questions && questions.length > 0 && options) {
        this.qualificationQuestions = questions.map((q) => ({
          id: q.id,
          questionAr: q.question_ar,
          questionEn: q.question_en,
          options: options
            .filter((o) => o.question_id === q.id)
            .map((o) => ({ id: o.id, labelAr: o.label_ar, labelEn: o.label_en })),
        }));
      }
      if (rules && rules.length > 0) {
        this.recommendationRules = rules as unknown as RecommendationRuleRow[];
      }
    } catch {
      // تجاهل الخطأ والإبقاء على القيم الاحتياطية المطابقة لـ seed.sql
    }
  }

  async sendMessage(message: string, lang: Language): Promise<KnowledgeAnswer> {
    return this.getKnowledgeAnswer(message, lang);
  }

  async getKnowledgeAnswer(query: string, lang: Language): Promise<KnowledgeAnswer> {
    this.lastLang = lang;
    const { answer, matchedId } = await this.matchKnowledgeBase(query, lang);
    void this.logTurn(query, lang, answer, matchedId);
    return answer;
  }

  private async matchKnowledgeBase(
    query: string,
    lang: Language
  ): Promise<{ answer: KnowledgeAnswer; matchedId: string | null }> {
    const { data, error } = await supabase.rpc("match_knowledge_base", {
      p_query: query,
      p_lang: lang,
    });

    let row: KnowledgeRow | undefined =
      !error && data && data.length > 0 ? (data[0] as KnowledgeRow) : undefined;

    // احتياط: مطابقة بالتضمّن النصي على الكلمات المفتاحية (تشابه سلوك المرحلة الأولى)، تُستخدم فقط
    // عندما لا تُرجع دالة full-text search أي تطابق — مفيدة خصوصًا للعربية التي لا تدعم التجذير
    // (Stemming) في Postgres/Supabase افتراضيًا. راجع ملاحظة القيود في ملخص الرد.
    if (!row) {
      row = await this.fallbackSubstringMatch(query, lang);
    }

    if (!row) {
      return { answer: { answerAr: "", answerEn: "", confidence: null, hasAnswer: false }, matchedId: null };
    }

    return {
      answer: {
        answerAr: row.answer_ar,
        answerEn: row.answer_en,
        citationAr: row.citation_ar ?? undefined,
        citationEn: row.citation_en ?? undefined,
        confidence: row.confidence,
        hasAnswer: true,
      },
      matchedId: row.id,
    };
  }

  private async fallbackSubstringMatch(query: string, lang: Language): Promise<KnowledgeRow | undefined> {
    const { data } = await supabase
      .from("knowledge_base")
      .select("id, answer_ar, answer_en, citation_ar, citation_en, confidence, keywords_ar, keywords_en")
      .eq("is_active", true);
    if (!data) return undefined;

    const normalizedQuery = normalize(query);
    const match = data.find((row) => {
      const keywords = (lang === "ar" ? row.keywords_ar : row.keywords_en) ?? [];
      return keywords.some((kw: string) => normalizedQuery.includes(normalize(kw)));
    });
    return match as KnowledgeRow | undefined;
  }

  async submitLead(lead: LeadData): Promise<{ success: boolean }> {
    const { error } = await supabase.from("leads").insert({
      name: lead.name,
      phone: lead.phone,
      qualification_answers: this.lastQualificationAnswers.length ? this.lastQualificationAnswers : null,
      recommended_option: this.lastRecommendedId,
      lang: this.lastLang,
    });
    return { success: !error };
  }

  detectQualificationIntent(message: string): boolean {
    const normalized = normalize(message);
    return QUALIFICATION_TRIGGERS.some((trigger) => normalized.includes(normalize(trigger)));
  }

  detectPromptInjection(message: string): boolean {
    return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(message));
  }

  getQualificationQuestions(lang: Language): QualificationQuestion[] {
    void lang;
    return this.qualificationQuestions;
  }

  getRecommendation(answers: QualificationAnswer[], lang: Language): Recommendation {
    this.lastQualificationAnswers = answers;
    this.lastLang = lang;

    const result = this.recommendationRules
      ? this.matchRuleBased(answers, lang)
      : buildFallbackRecommendation(answers, lang);

    this.lastRecommendedId = result.id;
    return result;
  }

  private matchRuleBased(answers: QualificationAnswer[], lang: Language): Recommendation {
    const byQuestion: Record<string, string> = {};
    answers.forEach((a) => {
      byQuestion[a.questionId] = a.optionId;
    });

    const rules = this.recommendationRules ?? [];
    const matched = rules
      .filter((rule) => Object.entries(rule.match_conditions).every(([k, v]) => byQuestion[k] === v))
      .sort((a, b) => b.priority - a.priority)[0];

    const rule = matched ?? rules[rules.length - 1];
    if (!rule) return buildFallbackRecommendation(answers, lang);

    const labelFor = (questionId: string) => answers.find((a) => a.questionId === questionId);

    const fill = (template: string, labelField: "labelAr" | "labelEn") =>
      template
        .replace("{{budgetLabel}}", labelFor("budget")?.[labelField] ?? "")
        .replace("{{teamLabel}}", labelFor("teamSize")?.[labelField] ?? "")
        .replace("{{usageLabel}}", labelFor("usageType")?.[labelField] ?? "");

    void lang;
    return {
      id: rule.result_id,
      nameAr: rule.name_ar,
      nameEn: rule.name_en,
      reasonAr: fill(rule.reason_template_ar, "labelAr"),
      reasonEn: fill(rule.reason_template_en, "labelEn"),
    };
  }

  /** ينشئ صف محادثة واحدًا لكل تحميل صفحة (Session)، ويُعاد استخدامه لكل الرسائل اللاحقة في نفس التبويب */
  private async ensureConversation(lang: Language): Promise<string | null> {
    if (!this.conversationIdPromise) {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      this.conversationIdPromise = (async () => {
        try {
          const { error } = await supabase.from("conversations").insert({ id, lang });
          return error ? null : id;
        } catch {
          return null;
        }
      })();
    }
    return this.conversationIdPromise;
  }

  private async logTurn(userText: string, lang: Language, answer: KnowledgeAnswer, matchedId: string | null) {
    try {
      const conversationId = await this.ensureConversation(lang);
      if (!conversationId) return;
      await supabase.from("conversation_messages").insert([
        { conversation_id: conversationId, sender: "user", text: userText },
        {
          conversation_id: conversationId,
          sender: "assistant",
          text: answer.hasAnswer ? (lang === "ar" ? answer.answerAr : answer.answerEn) : null,
          matched_knowledge_id: matchedId,
          confidence: answer.confidence,
          has_answer: answer.hasAnswer,
        },
      ]);
    } catch {
      // تسجيل المحادثة غير معطّل لتجربة المستخدم — أي خطأ هنا يُتجاهل بصمت (fire-and-forget)
    }
  }
}

export const supabaseChatAdapter = new SupabaseChatAdapter();
