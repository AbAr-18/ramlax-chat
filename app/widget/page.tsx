"use client";

import { useEffect } from "react";
import ChatWidget from "@/components/chat/ChatWidget";

/**
 * صفحة معزولة تعرض ChatWidget فقط بخلفية شفافة، لتُضمَّن داخل iframe عبر /public/embed.js
 * في أي موقع خارجي (راجع README.md لطريقتي الدمج).
 */
export default function WidgetEmbedPage() {
  useEffect(() => {
    const original = document.body.style.background;
    document.body.style.background = "transparent";
    return () => {
      document.body.style.background = original;
    };
  }, []);

  return (
    <div className="h-screen w-screen bg-transparent">
      <ChatWidget />
    </div>
  );
}
