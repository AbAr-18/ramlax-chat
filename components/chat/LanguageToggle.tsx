import { Languages } from "lucide-react";
import type { Language } from "@/lib/types/chat.types";
import { t } from "@/lib/i18n/translations";

interface LanguageToggleProps {
  lang: Language;
  onToggle: () => void;
}

export default function LanguageToggle({ lang, onToggle }: LanguageToggleProps) {
  const dict = t(lang);

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1 rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10"
      aria-label="Toggle language / تبديل اللغة"
    >
      <Languages className="h-3.5 w-3.5" />
      <span className={lang === "en" ? "font-en" : ""}>{dict.langToggle}</span>
    </button>
  );
}
