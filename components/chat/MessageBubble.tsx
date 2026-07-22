"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, HelpCircle, RotateCcw, UserRound } from "lucide-react";
import type { ChatMessage, Language } from "@/lib/types/chat.types";
import { t } from "@/lib/i18n/translations";
import { LOW_CONFIDENCE_THRESHOLD } from "@/lib/adapters/MockChatAdapter";

interface MessageBubbleProps {
  message: ChatMessage;
  lang: Language;
  onTransfer: () => void;
  onRetry: (messageId: string) => void;
  onTick?: () => void;
}

const TYPE_INTERVAL_MS = 24;

function formatTime(timestamp: number, lang: Language) {
  return new Date(timestamp).toLocaleTimeString(lang === "ar" ? "ar-SA" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function AssistantAvatar() {
  return (
    <div
      className="mb-1 h-7 w-7 shrink-0 rounded-full bg-gray-100 shadow-sm"
      style={{
        backgroundImage: "url(/mascot/ramla-sprites.png), radial-gradient(circle, #f3f4f6, #f3f4f6)",
        backgroundSize: "300% 200%, cover",
        backgroundPosition: "50% 0%, center",
        backgroundRepeat: "no-repeat, no-repeat",
      }}
    />
  );
}

export default function MessageBubble({
  message,
  lang,
  onTransfer,
  onRetry,
  onTick,
}: MessageBubbleProps) {
  const dict = t(lang);
  const isUser = message.sender === "user";
  const isEn = lang === "en";

  const [displayedText, setDisplayedText] = useState(
    message.sender === "assistant" && message.shouldAnimate ? "" : message.text
  );
  const [isTypingOut, setIsTypingOut] = useState(
    message.sender === "assistant" && !!message.shouldAnimate && message.text.length > 0
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (message.sender !== "assistant" || !message.shouldAnimate || message.text.length === 0) {
      return;
    }
    let i = 0;
    intervalRef.current = setInterval(() => {
      i += 1;
      setDisplayedText(message.text.slice(0, i));
      onTick?.();
      if (i >= message.text.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsTypingOut(false);
      }
    }, TYPE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // يعمل مرة واحدة فقط عند ظهور الرسالة لأول مرة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id]);

  function skipTyping() {
    if (!isTypingOut) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayedText(message.text);
    setIsTypingOut(false);
  }

  const citation = message.citation ? (isEn ? message.citation.en : message.citation.ar) : null;
  const isLowConfidence =
    message.hasAnswer && typeof message.confidence === "number" && message.confidence < LOW_CONFIDENCE_THRESHOLD;
  const isNoAnswer = message.hasAnswer === false;

  if (message.isError) {
    return (
      <div dir="ltr" className="flex w-full items-start justify-start gap-2">
        <AssistantAvatar />
        <div
          dir={lang === "ar" ? "rtl" : "ltr"}
          className="flex max-w-[85%] flex-col gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700"
        >
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{dict.errorTitle}</span>
          </div>
          <p className="text-sm leading-relaxed">{dict.errorBody}</p>
          <button
            type="button"
            onClick={() => onRetry(message.id)}
            className="flex w-fit items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {dict.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir="ltr" className={`flex w-full items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <AssistantAvatar />}
      <div className={`flex max-w-[85%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      <div
        dir={lang === "ar" ? "rtl" : "ltr"}
        onClick={skipTyping}
        className={`flex w-full flex-col gap-2 rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? "bg-rimal-secondary text-white"
            : "bg-gray-100 text-rimal-dark-text"
        } ${isTypingOut ? "cursor-pointer" : ""}`}
        title={isTypingOut ? (isEn ? "Click to skip typing" : "اضغط لتخطي الكتابة") : undefined}
      >
        {isNoAnswer ? (
          <div className="flex items-start gap-2 rounded-xl border border-gray-300 bg-white/70 px-3 py-2">
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
            <p className="text-sm font-medium leading-relaxed text-gray-600">{dict.noAnswerNotice}</p>
          </div>
        ) : (
          <p className="whitespace-pre-line text-sm leading-relaxed">{displayedText}</p>
        )}

        {citation && !isNoAnswer && !isTypingOut && (
          <span className="w-fit rounded-full bg-rimal-secondary/10 px-2.5 py-1 text-xs font-medium text-rimal-secondary">
            {dict.citationPrefix} {citation}
          </span>
        )}

        {typeof message.confidence === "number" && !isNoAnswer && !isTypingOut && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>{dict.confidenceLabel}</span>
              <span>{message.confidence}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-rimal-primary transition-all duration-500"
                style={{ width: `${message.confidence}%` }}
              />
            </div>
          </div>
        )}

        {(isLowConfidence || isNoAnswer) && !isTypingOut && (
          <div className="flex flex-col gap-2 rounded-xl bg-rimal-secondary/5 p-2.5">
            {isLowConfidence && (
              <p className="text-xs font-medium text-rimal-secondary">{dict.lowConfidenceNotice}</p>
            )}
            <button
              type="button"
              onClick={onTransfer}
              className="w-fit rounded-lg bg-rimal-secondary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rimal-secondary-hover"
            >
              {dict.transferButton}
            </button>
          </div>
        )}
      </div>
      <span className="px-1 text-[10px] text-gray-400">{formatTime(message.timestamp, lang)}</span>
      </div>
      {isUser && (
        <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rimal-secondary/15 text-rimal-secondary">
          <UserRound className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
