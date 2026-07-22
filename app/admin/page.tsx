"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/admin/categories");
      } else {
        router.replace("/admin/login");
      }
    }

    redirect();
  }, [router]);

  return null;
}
