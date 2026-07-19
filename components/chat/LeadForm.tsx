"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import type { Language, LeadData } from "@/lib/types/chat.types";
import { t } from "@/lib/i18n/translations";

interface LeadFormProps {
  lang: Language;
  onSubmit: (lead: LeadData) => void;
  submitting: boolean;
  submitted: boolean;
}

const PHONE_PATTERN = /^0\d{9}$/;

export default function LeadForm({ lang, onSubmit, submitting, submitted }: LeadFormProps) {
  const dict = t(lang);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: { name?: string; phone?: string } = {};
    if (name.trim().length < 2) nextErrors.name = dict.leadForm.nameError;
    if (!PHONE_PATTERN.test(phone.trim())) nextErrors.phone = dict.leadForm.phoneError;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit({ name: name.trim(), phone: phone.trim() });
  }

  if (submitted) {
    return (
      <div
        dir={lang === "ar" ? "rtl" : "ltr"}
        className="flex max-w-[90%] flex-col gap-1 rounded-2xl border border-green-200 bg-white px-4 py-3 shadow-sm"
      >
        <div className="flex items-center gap-2 text-rimal-dark-text">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-rimal-primary" />
          <span className="text-sm font-bold">{dict.leadForm.successTitle}</span>
        </div>
        <p className="text-sm text-gray-600">{dict.leadForm.successBody}</p>
      </div>
    );
  }

  return (
    <form
      dir={lang === "ar" ? "rtl" : "ltr"}
      onSubmit={handleSubmit}
      className="flex max-w-[90%] flex-col gap-3 rounded-2xl border border-rimal-secondary/20 bg-white px-4 py-4 shadow-sm"
    >
      <h4 className="text-sm font-bold text-rimal-dark-text">{dict.leadForm.title}</h4>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600" htmlFor="lead-name">
          {dict.leadForm.nameLabel}
        </label>
        <input
          id="lead-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={dict.leadForm.namePlaceholder}
          disabled={submitting}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-rimal-dark-text outline-none transition-colors focus:border-rimal-secondary disabled:bg-gray-50"
        />
        {errors.name && <span className="text-xs text-red-600">{errors.name}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600" htmlFor="lead-phone">
          {dict.leadForm.phoneLabel}
        </label>
        <input
          id="lead-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={dict.leadForm.phonePlaceholder}
          disabled={submitting}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-rimal-dark-text outline-none transition-colors focus:border-rimal-secondary disabled:bg-gray-50 font-en"
          dir="ltr"
        />
        {errors.phone && <span className="text-xs text-red-600">{errors.phone}</span>}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span>{dict.leadForm.privacyNote}</span>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex items-center justify-center gap-2 rounded-lg bg-rimal-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rimal-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? dict.leadForm.submitting : dict.leadForm.submit}
      </button>
    </form>
  );
}
