import { MessageCircle, X } from "lucide-react";
import type { Language } from "@/lib/types/chat.types";
import { t } from "@/lib/i18n/translations";

interface ChatBubbleProps {
  isOpen: boolean;
  onClick: () => void;
  lang: Language;
}

export default function ChatBubble({ isOpen, onClick, lang }: ChatBubbleProps) {
  const dict = t(lang);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? dict.closeAria : dict.bubbleAria}
      className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-rimal-primary text-white shadow-lg shadow-rimal-primary/30 transition-all duration-300 hover:scale-105 hover:bg-rimal-primary-hover active:scale-95 sm:h-16 sm:w-16"
    >
      <span
        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
          isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />
      </span>
      <span
        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
          isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0"
        }`}
      >
        <X className="h-6 w-6 sm:h-7 sm:w-7" />
      </span>
    </button>
  );
}
