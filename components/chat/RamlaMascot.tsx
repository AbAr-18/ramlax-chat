"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useAnimationControls, useMotionValue } from "framer-motion";

interface RamlaMascotProps {
  isOpen: boolean;
  onClick: () => void;
  ariaLabel: string;
}

const SPRITE_SRC = "/mascot/ramla-sprites.png";
// شبكة 3×2 من أوضاع حقيقية مرسومة (وقفة، تلويح، إبهام للأعلى، قلب، ابتسامة مغمضة، احتفال)
const SPRITE_COLS = 3;
const SPRITE_ROWS = 2;
const CELL_ASPECT = 544 / 3 / (459 / 2); // نسبة عرض/ارتفاع الخلية الواحدة، موحّدة لكل الأوضاع

type Pose = "idle" | "wave" | "thumbsup" | "heart" | "blink" | "celebrate";

const POSE_POSITION: Record<Pose, string> = {
  idle: "0% 0%",
  wave: "50% 0%",
  thumbsup: "100% 0%",
  heart: "0% 100%",
  blink: "50% 100%",
  celebrate: "100% 100%",
};

// دورة سكون واحدة تمر على الأوضاع الحقيقية بالتتابع (وقفة، رمشة، إعجاب) بمصدر
// تحكم وحيد حتى لا يتصادم أكثر من مؤقت على نفس الحالة. كل مدة تراعي وقت
// التلاشي (crossfade) عشان الوضعية توصل كاملة قبل ما تختفي.
const IDLE_SEQUENCE: { pose: Pose; hold: number }[] = [
  { pose: "idle", hold: 3000 },
  { pose: "blink", hold: 1750 },
  { pose: "thumbsup", hold: 3000 },
  { pose: "blink", hold: 1750 },
];

const CLICK_REACTIONS: Pose[] = ["celebrate", "thumbsup", "heart"];

// تجوّل حر لكن محصور بشريط أسفل الشاشة فقط (مثل شخصية تمشي على الأرض) حتى لا
// تتوسط محتوى الصفحة وتصير مزعجة
const ROAM_X: [number, number] = [6, 84]; // vw
const ROAM_Y: [number, number] = [72, 86]; // vh

function randomBetween([min, max]: [number, number]) {
  return min + Math.random() * (max - min);
}

export default function RamlaMascot({ isOpen, onClick, ariaLabel }: RamlaMascotProps) {
  const [pose, setPose] = useState<Pose>("idle");
  const reactingRef = useRef(false);
  const bounceControls = useAnimationControls();

  const x = useMotionValue(`${randomBetween(ROAM_X)}vw`);
  const y = useMotionValue(`${randomBetween(ROAM_Y)}vh`);

  // تجوّل حر وبطيء داخل الشريط: يمشي لنقطة عشوائية ثم يقف شوي، ويكرر
  useEffect(() => {
    let cancelled = false;
    async function roamLoop() {
      while (!cancelled) {
        if (reactingRef.current) {
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }
        const targetX = `${randomBetween(ROAM_X)}vw`;
        const targetY = `${randomBetween(ROAM_Y)}vh`;
        await Promise.all([
          animate(x, targetX, { duration: 4 + Math.random() * 3, ease: "easeInOut" }),
          animate(y, targetY, { duration: 4 + Math.random() * 3, ease: "easeInOut" }),
        ]);
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 3000 + Math.random() * 3000));
      }
    }
    void roamLoop();
    return () => {
      cancelled = true;
    };
  }, [x, y]);

  // مصدر وحيد للتحكم بالوضعية أثناء السكون
  useEffect(() => {
    let cancelled = false;
    async function idleLoop() {
      let i = 0;
      while (!cancelled) {
        if (!reactingRef.current) {
          const step = IDLE_SEQUENCE[i % IDLE_SEQUENCE.length];
          setPose(step.pose);
          await new Promise((r) => setTimeout(r, step.hold));
          i++;
        } else {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    }
    void idleLoop();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleClick() {
    reactingRef.current = true;
    const reaction = CLICK_REACTIONS[Math.floor(Math.random() * CLICK_REACTIONS.length)];
    setPose(reaction);
    void bounceControls.start({
      scaleY: [1, 0.82, 1.12, 0.97, 1],
      scaleX: [1, 1.14, 0.94, 1.02, 1],
      transition: { duration: 0.5, ease: "easeOut" },
    });
    setTimeout(() => {
      setPose("idle");
      reactingRef.current = false;
    }, 3000);
    onClick();
  }

  return (
    <motion.div style={{ x, y }} className="fixed left-0 top-0 z-50">
      <motion.div
        animate={isOpen ? { opacity: 0, scale: 0.5 } : { opacity: 1, y: [0, -6, 0] }}
        transition={
          isOpen
            ? { duration: 0.2 }
            : { opacity: { duration: 0.2 }, y: { duration: 3.2, repeat: Infinity, ease: "easeInOut" } }
        }
      >
        <button
          type="button"
          onClick={handleClick}
          aria-label={ariaLabel}
          style={{ filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.25))" }}
          className={`relative block w-20 sm:w-24 ${isOpen ? "pointer-events-none" : "pointer-events-auto"}`}
        >
          <motion.div
            animate={bounceControls}
            initial={{ scaleX: 1, scaleY: 1 }}
            className="relative w-full overflow-hidden"
            style={{ aspectRatio: CELL_ASPECT }}
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={pose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, scaleY: [1, 1.03, 1] }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: 0.22, ease: "easeInOut" },
                  scaleY: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
                }}
                className="absolute inset-0"
                style={{
                  transformOrigin: "50% 100%",
                  backgroundImage: `url(${SPRITE_SRC})`,
                  backgroundSize: `${SPRITE_COLS * 100}% ${SPRITE_ROWS * 100}%`,
                  backgroundPosition: POSE_POSITION[pose],
                  backgroundRepeat: "no-repeat",
                }}
              />
            </AnimatePresence>
          </motion.div>
        </button>
      </motion.div>
    </motion.div>
  );
}
