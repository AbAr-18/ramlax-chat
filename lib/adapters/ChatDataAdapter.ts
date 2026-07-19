import type {
  Language,
  KnowledgeAnswer,
  LeadData,
  QualificationAnswer,
  QualificationQuestion,
  Recommendation,
} from "@/lib/types/chat.types";

/**
 * واجهة موحّدة لطبقة بيانات المحادثة.
 * التنفيذ الحالي الوحيد هو MockChatAdapter (بيانات وهمية محليًا).
 * في الأسابيع 2-4 سيُستبدل بتنفيذ حقيقي يتصل بـ Backend / RAG / قاعدة بيانات
 * دون الحاجة لتعديل أي مكوّن في الواجهة، لأن جميع المكوّنات تتعامل فقط مع هذه الواجهة.
 */
export interface ChatDataAdapter {
  /** إرسال رسالة حرة والحصول على رد معرفي (يمر داخليًا عبر getKnowledgeAnswer) */
  sendMessage(message: string, lang: Language): Promise<KnowledgeAnswer>;

  /** البحث المباشر في قاعدة المعرفة الوهمية */
  getKnowledgeAnswer(query: string, lang: Language): Promise<KnowledgeAnswer>;

  /** إرسال بيانات العميل المحتمل (Lead) */
  submitLead(lead: LeadData): Promise<{ success: boolean }>;

  /** يكشف إن كانت الرسالة تدل على رغبة العميل بالانضمام (لبدء تدفق التأهيل) */
  detectQualificationIntent(message: string): boolean;

  /** يكشف محاولات حقن التعليمات (Prompt Injection) */
  detectPromptInjection(message: string): boolean;

  /** أسئلة تدفق التأهيل التجريبي */
  getQualificationQuestions(lang: Language): QualificationQuestion[];

  /** يحسب الترشيح النهائي بناءً على إجابات التأهيل */
  getRecommendation(
    answers: QualificationAnswer[],
    lang: Language
  ): Recommendation;
}
