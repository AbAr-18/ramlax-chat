import type { Language, QualificationQuestion } from "@/lib/types/chat.types";

interface QualificationStepProps {
  question: QualificationQuestion;
  lang: Language;
  selectedOptionId?: string;
  onSelect: (optionId: string) => void;
}

export default function QualificationStep({
  question,
  lang,
  selectedOptionId,
  onSelect,
}: QualificationStepProps) {
  const isEn = lang === "en";
  const questionText = isEn ? question.questionEn : question.questionAr;
  const answered = Boolean(selectedOptionId);

  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="flex max-w-[90%] flex-col gap-3 rounded-2xl bg-gray-100 px-4 py-3 shadow-sm"
    >
      <p className="text-sm font-semibold text-rimal-dark-text">{questionText}</p>
      <div className="flex flex-wrap gap-2">
        {question.options.map((option) => {
          const label = isEn ? option.labelEn : option.labelAr;
          const isSelected = selectedOptionId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={answered}
              onClick={() => onSelect(option.id)}
              className={`rounded-full border-2 px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isSelected
                  ? "border-rimal-secondary bg-rimal-secondary text-white"
                  : answered
                    ? "cursor-not-allowed border-gray-200 text-gray-400"
                    : "border-rimal-secondary text-rimal-secondary hover:bg-rimal-secondary hover:text-white"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
