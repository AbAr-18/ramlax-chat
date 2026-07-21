import type { ChatDataAdapter } from "@/lib/adapters/ChatDataAdapter";
import type {
  Language,
  KnowledgeAnswer,
  LeadData,
  QualificationAnswer,
  QualificationQuestion,
  Recommendation,
} from "@/lib/types/chat.types";

interface KnowledgeEntry {
  keywords: string[];
  answerAr: string;
  answerEn: string;
  citationAr: string;
  citationEn: string;
  /** 0-100. اجعلها أقل من LOW_CONFIDENCE_THRESHOLD لمحاكاة حالة الثقة المنخفضة */
  confidence: number;
}

/** أي إجابة بثقة أقل من هذا الحد تُعامل كـ "ثقة منخفضة" وتستدعي زر التحويل */
export const LOW_CONFIDENCE_THRESHOLD = 55;

/** قاعدة معرفة وهمية عن خدمات رمال (مساحات العمل / الحاضنة / المسرّعة / الدورات) */
const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    keywords: ["مساحة", "مساحات", "مكتب", "مقعد", "workspace", "desk", "office", "coworking"],
    answerAr:
      "توفر رمال عدة خيارات لمساحات العمل: مقعد مرن (Hot Desk)، مكتب مخصص (Dedicated Desk)، ومكتب خاص (Private Office)، بالإضافة إلى قاعات اجتماعات يمكن حجزها بالساعة.",
    answerEn:
      "Rimal offers several workspace options: a flexible Hot Desk, a Dedicated Desk, and a Private Office, plus meeting rooms bookable by the hour.",
    citationAr: "صفحة مساحات العمل",
    citationEn: "Workspaces page",
    confidence: 92,
  },
  {
    keywords: ["حاضنة", "احتضان", "incubator", "incubation"],
    answerAr:
      "برنامج الحاضنة في رمال موجّه للأفكار وريادة الأعمال في مراحلها المبكرة، ويقدّم إرشادًا من خبراء، مساحة عمل، وربطًا بشبكة علاقات في القطاع التقني بالطائف.",
    answerEn:
      "Rimal's incubator program targets early-stage startup ideas, offering expert mentorship, workspace access, and connections to the tech ecosystem in Taif.",
    citationAr: "صفحة برنامج الحاضنة",
    citationEn: "Incubator program page",
    confidence: 88,
  },
  {
    keywords: ["مسرعة", "مسرّعة", "تسريع", "accelerator"],
    answerAr:
      "برنامج المسرّعة مخصص للشركات الناشئة التي لديها منتج وعملاء أوائل، ويشمل استشارات مكثفة، فرص تمويل أولي، وربطًا مباشرًا بمستثمرين.",
    answerEn:
      "The accelerator program is for startups with a product and early customers, including intensive mentorship, seed funding opportunities, and direct investor connections.",
    citationAr: "صفحة برنامج المسرّعة",
    citationEn: "Accelerator program page",
    confidence: 90,
  },
  {
    keywords: ["دورة", "دورات", "تدريب", "ورشة", "course", "courses", "training", "workshop"],
    answerAr:
      "تقدّم رمال دورات وورش عمل دورية في ريادة الأعمال والمهارات التقنية، تُعقد في مقر رمال بالطائف وتُعلن مواعيدها بشكل مستمر.",
    answerEn:
      "Rimal runs regular courses and workshops on entrepreneurship and tech skills, held at Rimal's Taif location with schedules announced continuously.",
    citationAr: "صفحة الدورات والفعاليات",
    citationEn: "Courses & events page",
    confidence: 85,
  },
  {
    keywords: ["أين", "موقع", "الطائف", "location", "address", "where", "based"],
    answerAr:
      "رمال (Rimal X) حاضنة ومسرّعة أعمال تقنية سعودية، ومقرها الرئيسي في مدينة الطائف.",
    answerEn:
      "Rimal X is a Saudi tech business incubator and accelerator, headquartered in Taif.",
    citationAr: "صفحة من نحن",
    citationEn: "About us page",
    confidence: 95,
  },
  {
    // حالة ثقة منخفضة مقصودة: تفاصيل الأسعار الدقيقة غير مؤكدة في قاعدة المعرفة الوهمية
    keywords: ["سعر", "أسعار", "تكلفة", "كم يكلف", "رسوم", "price", "cost", "pricing", "fees"],
    answerAr:
      "تختلف الأسعار حسب نوع المساحة أو البرنامج ومدة الاشتراك، وتتوفر عروض خاصة بشكل دوري.",
    answerEn:
      "Pricing varies by workspace/program type and subscription length, with periodic special offers available.",
    citationAr: "صفحة الأسعار (تقديرية)",
    citationEn: "Pricing page (estimated)",
    confidence: 38,
  },
];

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

const QUALIFICATION_QUESTIONS: QualificationQuestion[] = [
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

function findAnswer(byId: QualificationAnswer[], questionId: string) {
  return byId.find((a) => a.questionId === questionId)?.optionId;
}

function delay<T>(value: T, ms = 700): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export class MockChatAdapter implements ChatDataAdapter {
  async sendMessage(message: string, lang: Language): Promise<KnowledgeAnswer> {
    return this.getKnowledgeAnswer(message, lang);
  }

  async getKnowledgeAnswer(query: string, lang: Language): Promise<KnowledgeAnswer> {
    const normalized = normalize(query);
    const match = KNOWLEDGE_BASE.find((entry) =>
      entry.keywords.some((kw) => normalized.includes(normalize(kw)))
    );

    if (!match) {
      return delay({
        answerAr: "",
        answerEn: "",
        confidence: null,
        hasAnswer: false,
      });
    }

    return delay({
      answerAr: match.answerAr,
      answerEn: match.answerEn,
      citationAr: match.citationAr,
      citationEn: match.citationEn,
      confidence: match.confidence,
      hasAnswer: true,
    });
  }

  async submitLead(lead: LeadData): Promise<{ success: boolean }> {
    void lead;
    return delay({ success: true }, 900);
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
    return QUALIFICATION_QUESTIONS;
  }

  getRecommendation(answers: QualificationAnswer[], lang: Language): Recommendation {
    const budget = findAnswer(answers, "budget") ?? "b1";
    const teamSize = findAnswer(answers, "teamSize") ?? "t1";
    const usageType = findAnswer(answers, "usageType") ?? "u1";

    const budgetLabel = answers.find((a) => a.questionId === "budget");
    const teamLabel = answers.find((a) => a.questionId === "teamSize");
    const usageLabel = answers.find((a) => a.questionId === "usageType");

    const reasonSuffixAr = `بناءً على ميزانيتك (${budgetLabel?.labelAr ?? ""}) وعدد فريقك (${
      teamLabel?.labelAr ?? ""
    })، هذا الخيار الأنسب لاستخدامك (${usageLabel?.labelAr ?? ""}).`;
    const reasonSuffixEn = `Based on your budget (${budgetLabel?.labelEn ?? ""}) and team size (${
      teamLabel?.labelEn ?? ""
    }), this fits your usage (${usageLabel?.labelEn ?? ""}) best.`;

    let result: Omit<Recommendation, "reasonAr" | "reasonEn">;

    if (usageType === "u2") {
      result = {
        id: "meeting-room",
        nameAr: "باقة قاعات الاجتماعات",
        nameEn: "Meeting Room Package",
      };
    } else if (usageType === "u3") {
      result = {
        id: "training-hall",
        nameAr: "قاعة التدريب والفعاليات",
        nameEn: "Training & Events Hall",
      };
    } else if (teamSize === "t1" && budget === "b1") {
      result = { id: "hot-desk", nameAr: "مقعد مرن (Hot Desk)", nameEn: "Hot Desk" };
    } else if (teamSize === "t1") {
      result = {
        id: "dedicated-desk",
        nameAr: "مكتب مخصص (Dedicated Desk)",
        nameEn: "Dedicated Desk",
      };
    } else if (budget === "b3") {
      result = {
        id: "private-office",
        nameAr: "مكتب خاص (Private Office)",
        nameEn: "Private Office",
      };
    } else {
      result = {
        id: "dedicated-desk-team",
        nameAr: "مكاتب مخصصة للفريق (Dedicated Desks)",
        nameEn: "Team Dedicated Desks",
      };
    }

    void lang;
    return {
      ...result,
      reasonAr: reasonSuffixAr,
      reasonEn: reasonSuffixEn,
    };
  }
}

export const mockChatAdapter = new MockChatAdapter();
