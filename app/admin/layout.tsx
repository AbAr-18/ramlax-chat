"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { LayoutGrid, BookOpen, ListChecks, Users, MessageSquare, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/admin/categories", label: "التصنيفات", icon: LayoutGrid },
  { href: "/admin/knowledge-base", label: "قاعدة المعرفة", icon: BookOpen },
  { href: "/admin/qualification", label: "التأهيل والترشيح", icon: ListChecks },
  { href: "/admin/leads", label: "العملاء المحتملون", icon: Users },
  { href: "/admin/conversations", label: "المحادثات", icon: MessageSquare },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [session, setSession] = useState<Session | null | "loading">("loading");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === "loading") return;
    if (!session && !isLoginPage) router.replace("/admin/login");
    if (session && isLoginPage) router.replace("/admin/categories");
  }, [session, isLoginPage, router]);

  if (isLoginPage) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 font-sans">
        {children}
      </div>
    );
  }

  if (session === "loading" || !session) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-gray-50 font-sans text-sm text-gray-500"
      >
        جارٍ التحقق من الجلسة...
      </div>
    );
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  return (
    <div dir="rtl" className="flex min-h-screen bg-gray-50 font-sans">
      <aside className="flex w-60 shrink-0 flex-col bg-rimal-dark text-white">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rimal-primary text-sm font-bold">
            ر
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold">لوحة إدارة رملة</span>
            <span className="text-[11px] text-white/50">Rimal X Admin</span>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-rimal-primary text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          className="mx-3 mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
