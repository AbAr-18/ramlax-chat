import type { Language } from "@/lib/types/chat.types";
import { t } from "@/lib/i18n/translations";

interface TypingIndicatorProps {
  lang: Language;
}

export default function TypingIndicator({ lang }: TypingIndicatorProps) {
  const dict = t(lang);

  return (
    <div dir="ltr" className="flex w-full items-end justify-start gap-2">
      <div
        className="flex items-center gap-1 rounded-2xl bg-gray-100 px-4 py-3 shadow-sm"
        role="status"
        aria-label={dict.typing}
      >
        <span className="h-2 w-2 animate-dot-bounce rounded-full bg-rimal-secondary [animation-delay:-0.2s]" />
        <span className="h-2 w-2 animate-dot-bounce rounded-full bg-rimal-secondary [animation-delay:-0.1s]" />
        <span className="h-2 w-2 animate-dot-bounce rounded-full bg-rimal-secondary" />
      </div>
    </div>
  );
}
