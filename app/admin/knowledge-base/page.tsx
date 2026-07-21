"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface Category {
  id: string;
  name_ar: string;
  name_en: string;
}

interface KnowledgeEntry {
  id: string;
  category_id: string | null;
  keywords_ar: string[];
  keywords_en: string[];
  question_ar: string;
  question_en: string;
  answer_ar: string;
  answer_en: string;
  citation_ar: string | null;
  citation_en: string | null;
  confidence: number;
  is_active: boolean;
}

type FormState = Omit<KnowledgeEntry, "id" | "keywords_ar" | "keywords_en"> & {
  id?: string;
  keywords_ar: string;
  keywords_en: string;
};

const EMPTY_FORM: FormState = {
  category_id: null,
  question_ar: "",
  question_en: "",
  answer_ar: "",
  answer_en: "",
  citation_ar: "",
  citation_en: "",
  confidence: 90,
  is_active: true,
  keywords_ar: "",
  keywords_en: "",
};

function toFormState(entry: KnowledgeEntry): FormState {
  return {
    ...entry,
    keywords_ar: entry.keywords_ar.join(", "),
    keywords_en: entry.keywords_en.join(", "),
  };
}

function splitKeywords(value: string): string[] {
  return value
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: kb }, { data: cats }] = await Promise.all([
      supabase.from("knowledge_base").select("*").order("question_ar"),
      supabase.from("categories").select("id, name_ar, name_en").order("sort_order"),
    ]);
    setEntries(kb ?? []);
    setCategories(cats ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name_ar ?? "بدون تصنيف";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.question_ar.toLowerCase().includes(q) ||
        e.question_en.toLowerCase().includes(q) ||
        e.keywords_ar.some((k) => k.toLowerCase().includes(q)) ||
        e.keywords_en.some((k) => k.toLowerCase().includes(q))
    );
  }, [entries, search]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);

    const payload = {
      category_id: form.category_id || null,
      question_ar: form.question_ar.trim(),
      question_en: form.question_en.trim(),
      answer_ar: form.answer_ar.trim(),
      answer_en: form.answer_en.trim(),
      citation_ar: form.citation_ar?.trim() || null,
      citation_en: form.citation_en?.trim() || null,
      confidence: Math.max(0, Math.min(100, Number(form.confidence))),
      is_active: form.is_active,
      keywords_ar: splitKeywords(form.keywords_ar),
      keywords_en: splitKeywords(form.keywords_en),
    };

    if (form.id) {
      await supabase.from("knowledge_base").update(payload).eq("id", form.id);
    } else {
      await supabase.from("knowledge_base").insert(payload);
    }

    setSaving(false);
    setForm(null);
    void load();
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا السؤال نهائيًا؟")) return;
    await supabase.from("knowledge_base").delete().eq("id", id);
    void load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-rimal-dark-text">
          قاعدة المعرفة <span className="text-sm font-normal text-gray-400">({entries.length} سؤال)</span>
        </h1>
        <button
          type="button"
          onClick={() => setForm(EMPTY_FORM)}
          className="flex items-center gap-1.5 rounded-lg bg-rimal-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rimal-primary-hover"
        >
          <Plus className="h-4 w-4" /> سؤال جديد
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 sm:w-80">
        <Search className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالسؤال أو كلمة مفتاحية..."
          className="w-full text-sm outline-none"
        />
      </div>

      {form && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-rimal-secondary/30 bg-white p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-rimal-dark-text">
              {form.id ? "تعديل سؤال" : "إضافة سؤال جديد"}
            </h2>
            <button type="button" onClick={() => setForm(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">التصنيف</label>
              <select
                value={form.category_id ?? ""}
                onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rimal-secondary"
              >
                <option value="">بدون تصنيف</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">الثقة (0-100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.confidence}
                onChange={(e) => setForm({ ...form, confidence: Number(e.target.value) })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rimal-secondary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">السؤال (عربي)</label>
              <input
                required
                value={form.question_ar}
                onChange={(e) => setForm({ ...form, question_ar: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rimal-secondary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Question (English)</label>
              <input
                required
                value={form.question_en}
                onChange={(e) => setForm({ ...form, question_en: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rimal-secondary font-en"
                dir="ltr"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">الجواب (عربي)</label>
              <textarea
                required
                rows={3}
                value={form.answer_ar}
                onChange={(e) => setForm({ ...form, answer_ar: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rimal-secondary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Answer (English)</label>
              <textarea
                required
                rows={3}
                value={form.answer_en}
                onChange={(e) => setForm({ ...form, answer_en: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rimal-secondary font-en"
                dir="ltr"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">كلمات مفتاحية (عربي، مفصولة بفاصلة)</label>
              <input
                value={form.keywords_ar}
                onChange={(e) => setForm({ ...form, keywords_ar: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rimal-secondary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Keywords (English, comma-separated)</label>
              <input
                value={form.keywords_en}
                onChange={(e) => setForm({ ...form, keywords_en: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rimal-secondary font-en"
                dir="ltr"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">المصدر (عربي)</label>
              <input
                value={form.citation_ar ?? ""}
                onChange={(e) => setForm({ ...form, citation_ar: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rimal-secondary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Citation (English)</label>
              <input
                value={form.citation_en ?? ""}
                onChange={(e) => setForm({ ...form, citation_en: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rimal-secondary font-en"
                dir="ltr"
              />
            </div>
          </div>

          <label className="flex w-fit items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 accent-rimal-primary"
            />
            نشط (يظهر في ردود الشات)
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-rimal-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rimal-primary-hover disabled:opacity-60"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-right text-xs font-semibold text-gray-500">
            <tr>
              <th className="px-4 py-3">السؤال</th>
              <th className="px-4 py-3">التصنيف</th>
              <th className="px-4 py-3">الثقة</th>
              <th className="px-4 py-3">الحالة</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  جارٍ التحميل...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  لا توجد نتائج مطابقة.
                </td>
              </tr>
            ) : (
              filtered.map((entry) => (
                <tr key={entry.id} className="border-t border-gray-100 align-top">
                  <td className="max-w-xs px-4 py-3">
                    <p className="font-medium text-rimal-dark-text">{entry.question_ar}</p>
                    <p className="font-en text-xs text-gray-400" dir="ltr">
                      {entry.question_en}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{categoryName(entry.category_id)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        entry.confidence < 55 ? "bg-amber-50 text-amber-700" : "bg-rimal-primary/10 text-rimal-primary"
                      }`}
                    >
                      {entry.confidence}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        entry.is_active ? "bg-rimal-secondary/10 text-rimal-secondary" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {entry.is_active ? "نشط" : "غير نشط"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setForm(toFormState(entry))}
                        className="rounded-lg p-1.5 text-rimal-secondary transition-colors hover:bg-rimal-secondary/10"
                        title="تعديل"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
