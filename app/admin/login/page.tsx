"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError("بيانات الدخول غير صحيحة، حاول مرة أخرى.");
      return;
    }
    router.replace("/admin/categories");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col items-center gap-2 pb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rimal-badge text-xl font-bold text-white">
            ر
          </div>
          <h1 className="text-lg font-bold text-rimal-dark-text">لوحة إدارة رملة</h1>
          <p className="text-xs text-gray-500">سجّل الدخول للمتابعة</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600" htmlFor="email">
            البريد الإلكتروني
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 focus-within:border-rimal-secondary">
            <Mail className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm outline-none"
              dir="ltr"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600" htmlFor="password">
            كلمة المرور
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 focus-within:border-rimal-secondary">
            <Lock className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm outline-none"
              dir="ltr"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-rimal-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rimal-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
        </button>
      </form>
    </div>
  );
}
