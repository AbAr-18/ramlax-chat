"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Lead {
  id: string;
  name: string;
  phone: string;
  qualification_answers: { questionId: string; optionId: string; labelAr: string; labelEn: string }[] | null;
  recommended_option: string | null;
  lang: string;
  status: string;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: "new", label: "جديد" },
  { value: "contacted", label: "تم التواصل" },
  { value: "converted", label: "تحوّل" },
  { value: "rejected", label: "مرفوض" },
];

const STATUS_STYLES: Record<string, string> = {
  new: "bg-rimal-secondary/10 text-rimal-secondary",
  contacted: "bg-amber-50 text-amber-700",
  converted: "bg-rimal-primary/10 text-rimal-primary",
  rejected: "bg-gray-100 text-gray-500",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    setLeads((data as unknown as Lead[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () => (statusFilter === "all" ? leads : leads.filter((l) => l.status === statusFilter)),
    [leads, statusFilter]
  );

  async function updateStatus(id: string, status: string) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    await supabase.from("leads").update({ status }).eq("id", id);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-rimal-dark-text">
          العملاء المحتملون <span className="text-sm font-normal text-gray-400">({filtered.length})</span>
        </h1>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === "all" ? "bg-rimal-dark text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            الكل
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatusFilter(s.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === s.value ? "bg-rimal-dark text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-right text-xs font-semibold text-gray-500">
            <tr>
              <th className="px-4 py-3">الاسم</th>
              <th className="px-4 py-3">الجوال</th>
              <th className="px-4 py-3">الترشيح</th>
              <th className="px-4 py-3">اللغة</th>
              <th className="px-4 py-3">التاريخ</th>
              <th className="px-4 py-3">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  جارٍ التحميل...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  لا يوجد عملاء محتملون بعد.
                </td>
              </tr>
            ) : (
              filtered.map((lead) => (
                <tr key={lead.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-rimal-dark-text">{lead.name}</td>
                  <td className="px-4 py-3 font-en text-gray-600" dir="ltr">
                    {lead.phone}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{lead.recommended_option ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.lang === "ar" ? "عربي" : "English"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(lead.created_at).toLocaleString("ar-SA")}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                      className={`rounded-full border-0 px-2 py-1 text-xs font-semibold outline-none ${STATUS_STYLES[lead.status] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
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
