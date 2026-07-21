// أنواع بيانات Widget المحادثة "رملة" — طبقة العرض فقط (Prototype الأسبوع 1)

export type Language = "ar" | "en";

export type MessageSender = "user" | "assistant";

/** نوع محتوى الرسالة داخل الشات، يحدد أي مكوّن فرعي يُعرض */
export type MessageKind =
  | "text"
  | "qualification"
  | "recommendation"
  | "leadForm"
  | "leadSuccess";

export interface ChatCitation {
  ar: string;
  en: string;
}

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  kind: MessageKind;
  text: string;
  timestamp: number;
  citation?: ChatCitation;
  /** 0-100، أو null إذا لا تنطبق (مثل: لا توجد إجابة أصلًا) */
  confidence?: number | null;
  hasAnswer?: boolean;
  isError?: boolean;
  /** تتحكم في تشغيل تأثير الكتابة الحرفية مرة واحدة فقط لكل رسالة */
  shouldAnimate?: boolean;
  qualificationQuestionId?: string;
  recommendation?: Recommendation;
}

export interface KnowledgeAnswer {
  answerAr: string;
  answerEn: string;
  citationAr?: string;
  citationEn?: string;
  /** 0-100، أو null عندما hasAnswer = false */
  confidence: number | null;
  hasAnswer: boolean;
}

export interface QualificationOption {
  id: string;
  labelAr: string;
  labelEn: string;
}

export interface QualificationQuestion {
  id: string;
  questionAr: string;
  questionEn: string;
  options: QualificationOption[];
}

export interface QualificationAnswer {
  questionId: string;
  optionId: string;
  labelAr: string;
  labelEn: string;
}

export interface Recommendation {
  id: string;
  nameAr: string;
  nameEn: string;
  reasonAr: string;
  reasonEn: string;
}

export interface LeadData {
  name: string;
  phone: string;
}
