"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Send, X } from "lucide-react";
import type {
  ChatMessage,
  Language,
  LeadData,
  QualificationAnswer,
} from "@/lib/types/chat.types";
import { t } from "@/lib/i18n/translations";
import { supabaseChatAdapter as mockChatAdapter } from "@/lib/adapters/SupabaseChatAdapter";
import ChatBubble from "@/components/chat/ChatBubble";
import MessageBubble from "@/components/chat/MessageBubble";
import TypingIndicator from "@/components/chat/TypingIndicator";
import QualificationStep from "@/components/chat/QualificationStep";
import RecommendationCard from "@/components/chat/RecommendationCard";
import LeadForm from "@/components/chat/LeadForm";
import LanguageToggle from "@/components/chat/LanguageToggle";

type FlowStage = "idle" | "qualifying" | "doneQualifying";

const TYPE_INTERVAL_MS = 24;
const ERROR_SIMULATION_RATE = 0.12;
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX_MESSAGES = 5;
const RATE_LIMIT_COOLDOWN_MS = 3_000;

const PII_PATTERNS = [
  /\b[12]\d{9}\b/, // رقم هوية/إقامة سعودي مبسّط
  /\bSA\d{2}[A-Z0-9]{18}\b/i, // آيبان سعودي
  /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/, // بريد إلكتروني كامل
];

function containsPII(text: string): boolean {
  return PII_PATTERNS.some((pattern) => pattern.test(text));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState<Language>("ar");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [piiHint, setPiiHint] = useState(false);
  const [assistantTyping, setAssistantTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  const [flowStage, setFlowStage] = useState<FlowStage>("idle");
  const [qualificationAnswers, setQualificationAnswers] = useState<QualificationAnswer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [leadFormShown, setLeadFormShown] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  const idCounterRef = useRef(0);
  const sendTimestampsRef = useRef<number[]>([]);
  const retryMapRef = useRef<Map<string, string>>(new Map());
  const rateLimitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const dict = t(lang);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const sideClass = lang === "ar" ? "right-4 sm:right-6" : "left-4 sm:left-6";
  const fontClass = lang === "en" ? "font-en" : "font-sans";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, assistantTyping]);

  useEffect(() => {
    return () => {
      if (rateLimitTimeoutRef.current) clearTimeout(rateLimitTimeoutRef.current);
      if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
    };
  }, []);

  function generateId(): string {
    idCounterRef.current += 1;
    return `msg-${idCounterRef.current}-${Date.now()}`;
  }

  function addMessage(partial: Omit<ChatMessage, "id" | "timestamp">): string {
    const id = generateId();
    setMessages((prev) => [...prev, { ...partial, id, timestamp: Date.now() }]);
    return id;
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }

  function scheduleStreamEnd(charCount: number) {
    setIsStreaming(true);
    if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
    streamTimeoutRef.current = setTimeout(() => setIsStreaming(false), charCount * TYPE_INTERVAL_MS + 200);
  }

  function canSendNow(): boolean {
    const now = Date.now();
    sendTimestampsRef.current = sendTimestampsRef.current.filter(
      (ts) => now - ts < RATE_LIMIT_WINDOW_MS
    );
    return sendTimestampsRef.current.length < RATE_LIMIT_MAX_MESSAGES;
  }

  async function simulateKnowledgeReply(text: string, replyLang: Language) {
    setAssistantTyping(true);
    const willError = Math.random() < ERROR_SIMULATION_RATE;

    if (willError) {
      await sleep(800);
      setAssistantTyping(false);
      const id = generateId();
      setMessages((prev) => [
        ...prev,
        { id, sender: "assistant", kind: "text", text: "", timestamp: Date.now(), isError: true },
      ]);
      retryMapRef.current.set(id, text);
      return;
    }

    const answer = await mockChatAdapter.sendMessage(text, replyLang);
    setAssistantTyping(false);
    const replyText = answer.hasAnswer ? (replyLang === "ar" ? answer.answerAr : answer.answerEn) : "";
    addMessage({
      sender: "assistant",
      kind: "text",
      text: replyText,
      citation: answer.hasAnswer
        ? { ar: answer.citationAr ?? "", en: answer.citationEn ?? "" }
        : undefined,
      confidence: answer.confidence,
      hasAnswer: answer.hasAnswer,
      shouldAnimate: true,
    });
    scheduleStreamEnd(replyText.length);
  }

  function startQualificationFlow(replyLang: Language) {
    const introText = t(replyLang).qualification.intro;
    addMessage({ sender: "assistant", kind: "text", text: introText, shouldAnimate: true });
    scheduleStreamEnd(introText.length);

    const questions = mockChatAdapter.getQualificationQuestions(replyLang);
    addMessage({ sender: "assistant", kind: "qualification", text: "", qualificationQuestionId: questions[0].id });

    setFlowStage("qualifying");
    setQualificationAnswers([]);
    setCurrentQuestionIndex(0);
  }

  async function processUserText(text: string) {
    if (mockChatAdapter.detectPromptInjection(text)) {
      setAssistantTyping(true);
      await sleep(500);
      setAssistantTyping(false);
      const refusal = dict.promptInjectionRefusal;
      addMessage({ sender: "assistant", kind: "text", text: refusal, shouldAnimate: true });
      scheduleStreamEnd(refusal.length);
      return;
    }

    if (flowStage === "idle" && mockChatAdapter.detectQualificationIntent(text)) {
      startQualificationFlow(lang);
      return;
    }

    await simulateKnowledgeReply(text, lang);
  }

  async function handleSend(rawText?: string) {
    const text = (rawText ?? inputValue).trim();
    if (!text || assistantTyping || isStreaming || rateLimited || flowStage === "qualifying") return;

    if (!canSendNow()) {
      setRateLimited(true);
      if (rateLimitTimeoutRef.current) clearTimeout(rateLimitTimeoutRef.current);
      rateLimitTimeoutRef.current = setTimeout(() => setRateLimited(false), RATE_LIMIT_COOLDOWN_MS);
      return;
    }
    sendTimestampsRef.current.push(Date.now());

    setInputValue("");
    setPiiHint(false);
    addMessage({ sender: "user", kind: "text", text });
    await processUserText(text);
  }

  function handleRetry(errorMessageId: string) {
    const originalText = retryMapRef.current.get(errorMessageId);
    if (!originalText) return;
    retryMapRef.current.delete(errorMessageId);
    setMessages((prev) => prev.filter((m) => m.id !== errorMessageId));
    void simulateKnowledgeReply(originalText, lang);
  }

  function handleTransfer() {
    addMessage({ sender: "assistant", kind: "text", text: dict.transferConfirmed, shouldAnimate: true });
    scheduleStreamEnd(dict.transferConfirmed.length);
  }

  function handleQualificationSelect(questionId: string, optionId: string) {
    const questions = mockChatAdapter.getQualificationQuestions(lang);
    const question = questions.find((q) => q.id === questionId);
    const option = question?.options.find((o) => o.id === optionId);
    if (!question || !option) return;

    const answer: QualificationAnswer = {
      questionId,
      optionId,
      labelAr: option.labelAr,
      labelEn: option.labelEn,
    };
    const newAnswers = [...qualificationAnswers, answer];
    setQualificationAnswers(newAnswers);
    addMessage({ sender: "user", kind: "text", text: lang === "ar" ? option.labelAr : option.labelEn });

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      setCurrentQuestionIndex(nextIndex);
      addMessage({ sender: "assistant", kind: "qualification", text: "", qualificationQuestionId: questions[nextIndex].id });
      return;
    }

    const recommendation = mockChatAdapter.getRecommendation(newAnswers, lang);
    addMessage({ sender: "assistant", kind: "recommendation", text: "", recommendation });
    setFlowStage("doneQualifying");
  }

  function handleRecommendationCta() {
    if (leadFormShown) return;
    addMessage({ sender: "assistant", kind: "leadForm", text: "" });
    setLeadFormShown(true);
  }

  async function handleLeadSubmit(lead: LeadData) {
    setLeadSubmitting(true);
    await mockChatAdapter.submitLead(lead);
    setLeadSubmitting(false);
    setLeadSubmitted(true);
  }

  function handleNewConversation() {
    setMessages([]);
    setFlowStage("idle");
    setQualificationAnswers([]);
    setCurrentQuestionIndex(0);
    setLeadFormShown(false);
    setLeadSubmitted(false);
    setLeadSubmitting(false);
    setAssistantTyping(false);
    setIsStreaming(false);
    setInputValue("");
    setPiiHint(false);
    setRateLimited(false);
    sendTimestampsRef.current = [];
    retryMapRef.current.clear();
  }

  function handleLanguageToggle() {
    setLang((prev) => (prev === "ar" ? "en" : "ar"));
  }

  const inputDisabled = assistantTyping || isStreaming || flowStage === "qualifying";
  const sendDisabled = !inputValue.trim() || inputDisabled || rateLimited;

  return (
    <div dir={dir} className={fontClass}>
      <div className={`fixed z-50 bottom-4 sm:bottom-6 ${sideClass}`}>
        <ChatBubble isOpen={isOpen} onClick={() => setIsOpen((o) => !o)} lang={lang} />
      </div>

      <div
        className={`fixed z-50 bottom-20 sm:bottom-24 ${sideClass} flex h-[70vh] max-h-[600px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 ${
          isOpen
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-4 scale-95 opacity-0"
        }`}
        role="dialog"
        aria-hidden={!isOpen}
        aria-label={dict.brandName}
      >
        <div className="flex items-center justify-between gap-2 bg-rimal-dark px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rimal-primary text-sm font-bold text-white">
              {lang === "ar" ? "ر" : "R"}
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-white">{dict.brandName}</span>
              <span className="text-[11px] text-white/60">{dict.brandTagline}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleNewConversation}
              title={dict.newConversation}
              className="flex items-center gap-1 rounded-lg border border-white/20 px-2 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-white/10"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{dict.newConversation}</span>
            </button>
            <LanguageToggle lang={lang} onToggle={handleLanguageToggle} />
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={dict.closeAria}
              className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-white px-3 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-2 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rimal-badge text-2xl">
                👋
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold text-rimal-dark-text">{dict.welcomeTitle}</h3>
                <p className="text-xs leading-relaxed text-gray-500">{dict.welcomeBody}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {dict.quickReplies.map((quickReply) => (
                  <button
                    key={quickReply}
                    type="button"
                    onClick={() => void handleSend(quickReply)}
                    className="rounded-full border border-rimal-secondary/30 bg-rimal-secondary/5 px-3 py-1.5 text-xs font-medium text-rimal-secondary transition-colors hover:bg-rimal-secondary hover:text-white"
                  >
                    {quickReply}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => {
              if (message.kind === "qualification") {
                const question = mockChatAdapter
                  .getQualificationQuestions(lang)
                  .find((q) => q.id === message.qualificationQuestionId);
                if (!question) return null;
                return (
                  <div key={message.id} dir="ltr" className="flex w-full items-end justify-start gap-2">
                    <QualificationStep
                      question={question}
                      lang={lang}
                      selectedOptionId={
                        qualificationAnswers.find((a) => a.questionId === question.id)?.optionId
                      }
                      onSelect={(optionId) => handleQualificationSelect(question.id, optionId)}
                    />
                  </div>
                );
              }
              if (message.kind === "recommendation" && message.recommendation) {
                return (
                  <div key={message.id} dir="ltr" className="flex w-full items-end justify-start gap-2">
                    <RecommendationCard
                      recommendation={message.recommendation}
                      lang={lang}
                      onCta={handleRecommendationCta}
                      ctaDisabled={leadFormShown}
                    />
                  </div>
                );
              }
              if (message.kind === "leadForm") {
                return (
                  <div key={message.id} dir="ltr" className="flex w-full items-end justify-start gap-2">
                    <LeadForm
                      lang={lang}
                      onSubmit={handleLeadSubmit}
                      submitting={leadSubmitting}
                      submitted={leadSubmitted}
                    />
                  </div>
                );
              }
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  lang={lang}
                  onTransfer={handleTransfer}
                  onRetry={handleRetry}
                  onTick={scrollToBottom}
                />
              );
            })
          )}
          {assistantTyping && <TypingIndicator lang={lang} />}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="flex flex-col gap-1.5 border-t border-gray-200 bg-white px-3 py-3"
        >
          {rateLimited && (
            <span className="text-[11px] font-medium text-red-600">{dict.rateLimitNotice}</span>
          )}
          {piiHint && !rateLimited && (
            <span className="text-[11px] font-medium text-amber-600">{dict.piiHint}</span>
          )}
          <div className="flex items-center gap-2">
            <input
              id="ramla-chat-input"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setPiiHint(containsPII(e.target.value));
              }}
              placeholder={
                flowStage === "qualifying"
                  ? lang === "ar"
                    ? "الرجاء اختيار أحد الخيارات أعلاه"
                    : "Please select an option above"
                  : dict.inputPlaceholder
              }
              disabled={inputDisabled}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-rimal-dark-text outline-none transition-colors focus:border-rimal-secondary disabled:bg-gray-50"
            />
            <button
              type="submit"
              disabled={sendDisabled}
              aria-label={dict.send}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rimal-primary text-white transition-colors hover:bg-rimal-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className={`h-4 w-4 ${lang === "ar" ? "rotate-180" : ""}`} />
            </button>
          </div>
          <span className="text-center text-[10px] text-gray-400">{dict.footerHint}</span>
        </form>
      </div>
    </div>
  );
}
