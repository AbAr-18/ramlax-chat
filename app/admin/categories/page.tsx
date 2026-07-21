"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface Category {
  id: string;
  name_ar: string;
  name_en: string;
  sort_order: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAr, setNewAr] = useState("");
  const [newEn, setNewEn] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    setCategories(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newAr.trim() || !newEn.trim()) return;
    const nextSort = categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order)) + 1 : 1;
    await supabase.from("categories").insert({ name_ar: newAr.trim(), name_en: newEn.trim(), sort_order: nextSort });
    setNewAr("");
    setNewEn("");
    void load();
  }

  function updateLocal(id: string, patch: Partial<Category>) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  async function handleSave(cat: Category) {
    setSavingId(cat.id);
    await supabase
      .from("categories")
      .update({ name_ar: cat.name_ar, name_en: cat.name_en, sort_order: cat.sort_order })
      .eq("id", cat.id);
    setSavingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا التصنيف؟ سيُفقد ارتباط أي أسئلة تابعة له.")) return;
    await supabase.from("categories").delete().eq("id", id);
    void load();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-rimal-dark-text">التصنيفات</h1>

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">الاسم (عربي)</label>
          <input
            value={newAr}
            onChange={(e) => setNewAr(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rimal-secondary"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Name (English)</label>
          <input
            value={newEn}
            onChange={(e) => setNewEn(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rimal-secondary font-en"
            dir="ltr"
          />
        </div>
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-lg bg-rimal-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rimal-primary-hover"
        >
          <Plus className="h-4 w-4" /> إضافة تصنيف
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-right text-xs font-semibold text-gray-500">
            <tr>
              <th className="px-4 py-3">الترتيب</th>
              <th className="px-4 py-3">الاسم (عربي)</th>
              <th className="px-4 py-3">Name (English)</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  جارٍ التحميل...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  لا توجد تصنيفات بعد.
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={cat.sort_order}
                      onChange={(e) => updateLocal(cat.id, { sort_order: Number(e.target.value) })}
                      className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-rimal-secondary"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      value={cat.name_ar}
                      onChange={(e) => updateLocal(cat.id, { name_ar: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-rimal-secondary"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      value={cat.name_en}
                      onChange={(e) => updateLocal(cat.id, { name_en: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-rimal-secondary font-en"
                      dir="ltr"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSave(cat)}
                        disabled={savingId === cat.id}
                        className="rounded-lg p-1.5 text-rimal-secondary transition-colors hover:bg-rimal-secondary/10"
                        title="حفظ"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id)}
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
