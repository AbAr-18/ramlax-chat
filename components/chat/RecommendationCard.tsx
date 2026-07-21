import { Sparkles } from "lucide-react";
import type { Language, Recommendation } from "@/lib/types/chat.types";
import { t } from "@/lib/i18n/translations";

interface RecommendationCardProps {
  recommendation: Recommendation;
  lang: Language;
  onCta: () => void;
  ctaDisabled?: boolean;
}

export default function RecommendationCard({
  recommendation,
  lang,
  onCta,
  ctaDisabled,
}: RecommendationCardProps) {
  const dict = t(lang);
  const isEn = lang === "en";

  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="flex max-w-[90%] flex-col gap-3 overflow-hidden rounded-2xl border border-rimal-primary/30 bg-white shadow-sm"
    >
      <div className="flex items-center gap-2 bg-rimal-badge px-4 py-2.5 text-white">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide">{dict.recommendation.title}</span>
      </div>
      <div className="flex flex-col gap-2 px-4 pb-4">
        <h4 className="text-base font-bold text-rimal-dark-text">
          {isEn ? recommendation.nameEn : recommendation.nameAr}
        </h4>
        <p className="text-sm leading-relaxed text-gray-600">
          {isEn ? recommendation.reasonEn : recommendation.reasonAr}
        </p>
        <button
          type="button"
          onClick={onCta}
          disabled={ctaDisabled}
          className="mt-1 w-fit rounded-lg bg-rimal-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rimal-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {dict.recommendation.ctaButton}
        </button>
      </div>
    </div>
  );
}
