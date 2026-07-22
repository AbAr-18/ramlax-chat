"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  CalendarDays,
  Compass,
  GraduationCap,
  Handshake,
  Home,
  Mail,
  MessageCircleQuestion,
  Rocket,
  Star,
  Target,
} from "lucide-react";
import type { Language } from "@/lib/types/chat.types";
import { t } from "@/lib/i18n/translations";

interface ChatSidebarProps {
  lang: Language;
  isOpen: boolean;
  onNavClick: (query: string) => void;
  onNewConversation: () => void;
}

const AVATAR_POSE_POSITION: Record<"idle" | "wave", string> = {
  idle: "0% 0%",
  wave: "50% 0%",
};

export default function ChatSidebar({ lang, isOpen, onNavClick, onNewConversation }: ChatSidebarProps) {
  const dict = t(lang);
  const nav = dict.sidebarNav;
  const [activeKey, setActiveKey] = useState("home");
  const [rated, setRated] = useState(false);
  const [avatarPose, setAvatarPose] = useState<"idle" | "wave">("idle");
  const wasOpenRef = useRef(false);

  // حركة ترحيبية للصورة الرمزية في مكانها لحظة فتح الشات
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setAvatarPose("wave");
      const timeout = setTimeout(() => setAvatarPose("idle"), 1800);
      wasOpenRef.current = true;
      return () => clearTimeout(timeout);
    }
    if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen]);

  const items: { key: string; label: string; icon: typeof Home; query: string | null }[] = [
    { key: "home", label: nav.home, icon: Home, query: null },
    { key: "faq", label: nav.faq, icon: MessageCircleQuestion, query: nav.faq },
    { key: "incubator", label: nav.incubator, icon: Building2, query: nav.incubator },
    { key: "accelerator", label: nav.accelerator, icon: Rocket, query: nav.accelerator },
    { key: "workspaces", label: nav.workspaces, icon: Compass, query: nav.workspaces },
    { key: "courses", label: nav.courses, icon: GraduationCap, query: nav.courses },
    { key: "events", label: nav.events, icon: CalendarDays, query: nav.events },
    { key: "sectors", label: nav.sectors, icon: Target, query: nav.sectors },
    { key: "partnerships", label: nav.partnerships, icon: Handshake, query: nav.partnerships },
    { key: "contact", label: nav.contact, icon: Mail, query: nav.contact },
  ];

  function handleItemClick(item: (typeof items)[number]) {
    setActiveKey(item.key);
    if (item.key === "home") {
      onNewConversation();
      return;
    }
    if (item.query) onNavClick(item.query);
  }

  return (
    <aside className="hidden min-h-0 w-64 shrink-0 flex-col border-s border-gray-200 bg-gray-50/60 sm:flex">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-gray-200 px-4 py-3">
        <motion.div
          animate={isOpen && avatarPose === "wave" ? { scale: [1, 1.12, 1] } : { scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white shadow-sm"
        >
          <AnimatePresence initial={false}>
            <motion.span
              key={avatarPose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
              style={{
                backgroundImage: "url(/mascot/ramla-sprites.png)",
                backgroundSize: "300% 200%",
                backgroundPosition: AVATAR_POSE_POSITION[avatarPose],
                backgroundRepeat: "no-repeat",
              }}
            />
          </AnimatePresence>
        </motion.div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-bold text-rimal-dark-text">{dict.brandName}</span>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-green-600">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
            {dict.statusOnline}
          </span>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeKey === item.key;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-rimal-secondary text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-rimal-dark-text"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-gray-200 p-3">
        <button
          type="button"
          onClick={() => setRated(true)}
          disabled={rated}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-rimal-primary/40 bg-rimal-primary/5 px-3 py-2.5 text-xs font-semibold text-rimal-primary-hover-dark transition-colors hover:bg-rimal-primary/10 disabled:cursor-default disabled:opacity-70"
        >
          <Star className="h-3.5 w-3.5" />
          {rated ? dict.rateThanks : dict.rateExperience}
        </button>
      </div>
    </aside>
  );
}
