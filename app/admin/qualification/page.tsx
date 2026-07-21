"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface QuestionRow {
  id: string;
  question_ar: string;
  question_en: string;
  sort_order: number;
}

interface OptionRow {
  id: string;
  question_id: string;
  label_ar: string;
  label_en: string;
  sort_order: number;
}

interface RuleRow {
  id: string;
  match_conditions: Record<string, string>;
  priority: number;
  result_id: string;
  name_ar: string;
  name_en: string;
  reason_template_ar: string;
  reason_template_en: string;
}

export default function QualificationPage() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOptionId, setNewOptionId] = useState<Record<string, string>>({});
  const [ruleJsonDrafts, setRuleJsonDrafts] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const [{ data: q }, { data: o }, { data: r }] = await Promise.all([
      supabase.from("qualification_questions").select("*").order("sort_order"),
      supabase.from("qualification_options").select("*").order("sort_order"),
      supabase.from("recommendation_rules").select("*").order("priority", { ascending: false }),
    ]);
    setQuestions(q ?? []);
    setOptions(o ?? []);
    setRules((r as unknown as RuleRow[]) ?? []);
    setRuleJsonDrafts(
      Object.fromEntries(((r as unknown as RuleRow[]) ?? []).map((rule) => [rule.id, JSON.stringify(rule.match_conditions)]))
    );
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveQuestion(question: QuestionRow) {
    await supabase
      .from("qualification_questions")
      .update({ question_ar: question.question_ar, question_en: question.question_en })
      .eq("id", question.id);
  }

  async function saveOption(option: OptionRow) {
    await supabase
      .from("qualification_options")
      .update({ label_ar: option.label_ar, label_en: option.label_en, sort_order: option.sort_order })
      .eq("id", option.id);
  }

  async function deleteOption(id: string) {
    if (!confirm("حذف هذا الخيار؟")) return;
    await supabase.from("qualification_options").delete().eq("id", id);
    void load();
  }

  async function addOption(questionId: string) {
    const id = (newOptionId[questionId] ?? "").trim();
    if (!id) return;
    const count = options.filter((o) => o.question_id === questionId).length;
    await supabase
      .from("qualification_options")
      .insert({ id, question_id: questionId, label_ar: "خيار جديد", label_en: "New option", sort_order: count + 1 });
    setNewOptionId({ ...newOptionId, [questionId]: "" });
    void load();
  }

  async function saveRule(rule: RuleRow) {
    let conditions: Record<string, string>;
    try {
      conditions = JSON.parse(ruleJsonDrafts[rule.id] ?? "{}");
    } catch {
      alert("صيغة JSON غير صحيحة لشروط المطابقة");
      return;
    }
    await supabase
      .from("recommendation_rules")
      .update({
        match_conditions: conditions,
        priority: rule.priority,
        result_id: rule.result_id,
        name_ar: rule.name_ar,
        name_en: rule.name_en,
        reason_template_ar: rule.reason_template_ar,
        reason_template_en: rule.reason_template_en,
      })
      .eq("id", rule.id);
  }

  async function deleteRule(id: string) {
    if (!confirm("حذف قاعدة الترشيح هذه؟")) return;
    await supabase.from("recommendation_rules").delete().eq("id", id);
    void load();
  }

  async function addRule() {
    await supabase.from("recommendation_rules").insert({
      match_conditions: {},
      priority: 0,
      result_id: "new-option",
      name_ar: "خيار جديد",
      name_en: "New option",
      reason_template_ar: "بناءً على إجاباتك، هذا الخيار الأنسب.",
      reason_template_en: "Based on your answers, this option fits best.",
    });
    void load();
  }

  function updateQuestionLocal(id: string, patch: Partial<QuestionRow>) {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }
  function updateOptionLocal(id: string, patch: Partial<OptionRow>) {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }
  function updateRuleLocal(id: string, patch: Partial<RuleRow>) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  if (loading) {
    return <p className="text-sm text-gray-400">جارٍ التحميل...</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-rimal-dark-text">أسئلة تدفق التأهيل</h1>
        <p className="mt-1 text-xs text-gray-500">
          معرّفات الأسئلة (budget / teamSize / usageType) ومعرّفات الخيارات (مثل b1، t2) مرتبطة بمنطق الترشيح — عدّل النصوص بحرية، وانتبه عند إضافة/حذف الخيارات.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {questions.map((question) => (
          <div key={question.id} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-rimal-secondary/10 px-2 py-1 font-en text-xs font-semibold text-rimal-secondary">
                {question.id}
              </span>
              <input
                value={question.question_ar}
                onChange={(e) => updateQuestionLocal(question.id, { question_ar: e.target.value })}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-rimal-secondary"
              />
              <input
                value={question.question_en}
                onChange={(e) => updateQuestionLocal(question.id, { question_en: e.target.value })}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-rimal-secondary font-en"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => saveQuestion(question)}
                className="rounded-lg p-1.5 text-rimal-secondary transition-colors hover:bg-rimal-secondary/10"
                title="حفظ"
              >
                <Save className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {options
                .filter((o) => o.question_id === question.id)
                .map((option) => (
                  <div key={option.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-2">
                    <span className="rounded-full bg-white px-2 py-1 font-en text-xs font-semibold text-gray-500">
                      {option.id}
                    </span>
                    <input
                      value={option.label_ar}
                      onChange={(e) => updateOptionLocal(option.id, { label_ar: e.target.value })}
                      className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-rimal-secondary"
                    />
                    <input
                      value={option.label_en}
                      onChange={(e) => updateOptionLocal(option.id, { label_en: e.target.value })}
                      className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-rimal-secondary font-en"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => saveOption(option)}
                      className="rounded-lg p-1.5 text-rimal-secondary transition-colors hover:bg-white"
                      title="حفظ"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteOption(option.id)}
                      className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-white"
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

              <div className="flex items-center gap-2 pt-1">
                <input
                  value={newOptionId[question.id] ?? ""}
                  onChange={(e) => setNewOptionId({ ...newOptionId, [question.id]: e.target.value })}
                  placeholder="معرّف الخيار الجديد (مثال: b4)"
                  className="w-56 rounded-lg border border-dashed border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-rimal-secondary font-en"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => addOption(question.id)}
                  className="flex items-center gap-1 rounded-lg border border-dashed border-rimal-secondary/40 px-2 py-1.5 text-xs font-semibold text-rimal-secondary transition-colors hover:bg-rimal-secondary/10"
                >
                  <Plus className="h-3.5 w-3.5" /> إضافة خيار
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-rimal-dark-text">قواعد الترشيح</h2>
            <p className="mt-1 text-xs text-gray-500">
              الأولوية الأعلى تُفحص أولًا. شروط المطابقة بصيغة JSON، مثال: {"{"}"usageType":"u2"{"}"}. النصوص تدعم
              المتغيرات {"{{budgetLabel}}"}، {"{{teamLabel}}"}، {"{{usageLabel}}"}.
            </p>
          </div>
          <button
            type="button"
            onClick={addRule}
            className="flex items-center gap-1.5 rounded-lg bg-rimal-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rimal-primary-hover"
          >
            <Plus className="h-3.5 w-3.5" /> قاعدة جديدة
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {rules.map((rule) => (
            <div key={rule.id} className="grid gap-2 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">الأولوية</label>
                <input
                  type="number"
                  value={rule.priority}
                  onChange={(e) => updateRuleLocal(rule.id, { priority: Number(e.target.value) })}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-rimal-secondary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">result_id</label>
                <input
                  value={rule.result_id}
                  onChange={(e) => updateRuleLocal(rule.id, { result_id: e.target.value })}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-rimal-secondary font-en"
                  dir="ltr"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">الاسم (عربي)</label>
                <input
                  value={rule.name_ar}
                  onChange={(e) => updateRuleLocal(rule.id, { name_ar: e.target.value })}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-rimal-secondary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Name (English)</label>
                <input
                  value={rule.name_en}
                  onChange={(e) => updateRuleLocal(rule.id, { name_en: e.target.value })}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-rimal-secondary font-en"
                  dir="ltr"
                />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs font-medium text-gray-600">شروط المطابقة (JSON)</label>
                <input
                  value={ruleJsonDrafts[rule.id] ?? "{}"}
                  onChange={(e) => setRuleJsonDrafts({ ...ruleJsonDrafts, [rule.id]: e.target.value })}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-rimal-secondary font-en"
                  dir="ltr"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">نص السبب (عربي)</label>
                <textarea
                  rows={2}
                  value={rule.reason_template_ar}
                  onChange={(e) => updateRuleLocal(rule.id, { reason_template_ar: e.target.value })}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-rimal-secondary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Reason text (English)</label>
                <textarea
                  rows={2}
                  value={rule.reason_template_en}
                  onChange={(e) => updateRuleLocal(rule.id, { reason_template_en: e.target.value })}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-rimal-secondary font-en"
                  dir="ltr"
                />
              </div>

              <div className="flex gap-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => saveRule(rule)}
                  className="flex items-center gap-1.5 rounded-lg bg-rimal-secondary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rimal-secondary-hover"
                >
                  <Save className="h-3.5 w-3.5" /> حفظ القاعدة
                </button>
                <button
                  type="button"
                  onClick={() => deleteRule(rule.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
