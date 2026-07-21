"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface ConversationRow {
  id: string;
  lang: string;
  started_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender: "user" | "assistant";
  text: string | null;
  confidence: number | null;
  has_answer: boolean | null;
  created_at: string;
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select("id, lang, started_at")
      .order("started_at", { ascending: false })
      .limit(100);
    setConversations(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setMessagesLoading(true);
    const { data } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at");
    setMessages(data ?? []);
    setMessagesLoading(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-rimal-dark-text">
        المحادثات <span className="text-sm font-normal text-gray-400">(آخر 100)</span>
      </h1>

      <div className="flex flex-col gap-2">
        {loading ? (
          <p className="text-sm text-gray-400">جارٍ التحميل...</p>
        ) : conversations.length === 0 ? (
          <p className="text-sm text-gray-400">لا توجد محادثات مسجّلة بعد.</p>
        ) : (
          conversations.map((conv) => (
            <div key={conv.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => toggleExpand(conv.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-rimal-secondary/10 px-2 py-1 text-xs font-semibold text-rimal-secondary">
                    {conv.lang === "ar" ? "عربي" : "English"}
                  </span>
                  <span className="text-sm text-gray-600">
                    {new Date(conv.started_at).toLocaleString("ar-SA")}
                  </span>
                </div>
                {expandedId === conv.id ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {expandedId === conv.id && (
                <div className="flex flex-col gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3">
                  {messagesLoading ? (
                    <p className="text-xs text-gray-400">جارٍ التحميل...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-xs text-gray-400">لا توجد رسائل.</p>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`w-fit max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                          m.sender === "user"
                            ? "mr-0 self-end bg-rimal-secondary/10 text-rimal-dark-text"
                            : "self-start bg-white text-rimal-dark-text shadow-sm"
                        }`}
                      >
                        <p>{m.text ?? "(بدون إجابة)"}</p>
                        {m.sender === "assistant" && typeof m.confidence === "number" && (
                          <p className="mt-1 text-[10px] text-gray-400">ثقة: {m.confidence}%</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
