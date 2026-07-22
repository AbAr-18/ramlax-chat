"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface SandBurstProps {
  active: boolean;
}

interface Grain {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
  light: boolean;
}

const GRAIN_COUNT = 34;

function makeGrains(): Grain[] {
  return Array.from({ length: GRAIN_COUNT }, (_, id) => ({
    id,
    left: Math.random() * 100,
    delay: Math.random() * 0.3,
    duration: 1.3 + Math.random() * 0.5,
    size: 2.5 + Math.random() * 3.5,
    drift: (Math.random() - 0.5) * 40,
    light: Math.random() > 0.5,
  }));
}

// تأثير حبيبات رمل تتساقط من الأعلى وتترسّب عند شريط الكتابة بالأسفل، لحظة فتح الشات
export default function SandBurst({ active }: SandBurstProps) {
  const [grains, setGrains] = useState<Grain[] | null>(null);

  useEffect(() => {
    if (!active) return;
    setGrains(makeGrains());
    const timeout = setTimeout(() => setGrains(null), 2400);
    return () => clearTimeout(timeout);
  }, [active]);

  if (!grains) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {grains.map((g) => (
        <motion.span
          key={g.id}
          initial={{ top: "-8%", x: 0, opacity: 0 }}
          animate={{ top: "96%", x: g.drift, opacity: [0, 1, 1, 0] }}
          transition={{
            top: { duration: g.duration, delay: g.delay, ease: "easeIn" },
            x: { duration: g.duration, delay: g.delay, ease: "easeIn" },
            opacity: { duration: g.duration, delay: g.delay, ease: "linear", times: [0, 0.12, 0.85, 1] },
          }}
          className="absolute rounded-full"
          style={{
            left: `${g.left}%`,
            width: g.size,
            height: g.size,
            backgroundColor: g.light ? "#EDA155" : "#D69046",
          }}
        />
      ))}
    </div>
  );
}
