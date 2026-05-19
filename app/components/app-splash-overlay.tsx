"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import {
  SPLASH_FOOD_ICONS,
} from "@/lib/splash/splash-icons";
import { SPLASH_SCATTER_SLOTS } from "@/lib/splash/splash-layout";
import { SPLASH_SHELL_EXIT, SPLASH_TILE_ENTER } from "@/lib/splash/splash-motion";
import { EASE_OUT, STAGGER } from "@/lib/motion/tokens";
import { Z_INDEX } from "@/lib/ui/z-index";

function ScatteredFoodIcon({
  slotIndex,
  reduceMotion,
  stageReady,
}: {
  slotIndex: number;
  reduceMotion: boolean | null;
  stageReady: boolean;
}) {
  const layout = SPLASH_SCATTER_SLOTS[slotIndex]!;
  const item = SPLASH_FOOD_ICONS[layout.iconIndex]!;
  const { Icon } = item;

  return (
    <motion.div
      className="absolute"
      style={{ top: layout.top, left: layout.left }}
      initial={
        reduceMotion
          ? false
          : { opacity: 0, transform: "scale(0.9) translateY(10px)" }
      }
      animate={
        stageReady
          ? { opacity: 1, transform: "scale(1) translateY(0)" }
          : { opacity: 0, transform: "scale(0.9) translateY(10px)" }
      }
      transition={{
        ...SPLASH_TILE_ENTER,
        delay: reduceMotion ? 0 : Math.min(slotIndex * STAGGER.tight, 1.2),
      }}
    >
      <motion.div
        className={reduceMotion ? undefined : "splash-icon-bounce"}
        style={
          reduceMotion
            ? undefined
            : ({ "--splash-bounce-delay": `${layout.bounceDelay}s` } as CSSProperties)
        }
      >
        <motion.div
          className={`flex items-center justify-center rounded-2xl shadow-[0_14px_36px_-22px_rgba(23,20,18,0.5)] ${layout.tile} ${item.tileClass}`}
        >
          <Icon
            className={`${layout.icon} ${item.iconClass}`}
            strokeWidth={2.2}
            aria-hidden
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

type AppSplashOverlayProps = {
  reduceMotion: boolean | null;
};

/** Full-screen splash visuals; exit timing is owned by AppShell. */
export function AppSplashOverlay({ reduceMotion }: AppSplashOverlayProps) {
  const [stageReady, setStageReady] = useState(false);

  useEffect(() => {
    if (reduceMotion) {
      setStageReady(true);
      return;
    }
    const id = window.requestAnimationFrame(() => setStageReady(true));
    return () => window.cancelAnimationFrame(id);
  }, [reduceMotion]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading TrackOMacro"
      initial={{ opacity: 1 }}
      exit={
        reduceMotion
          ? { opacity: 0 }
          : {
              opacity: 0,
              transform: "scale(1.012)",
              filter: "blur(8px)",
            }
      }
      transition={SPLASH_SHELL_EXIT}
      className="fixed inset-0 overflow-hidden bg-[#fbfaf5] pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]"
      style={{ zIndex: Z_INDEX.splash }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "scale(1.04)" }}
        transition={SPLASH_SHELL_EXIT}
      >
        {SPLASH_SCATTER_SLOTS.map((_, slotIndex) => (
          <ScatteredFoodIcon
            key={slotIndex}
            slotIndex={slotIndex}
            reduceMotion={reduceMotion}
            stageReady={stageReady}
          />
        ))}
      </motion.div>

      <motion.div
        className="relative z-10 flex h-full flex-col items-center justify-center px-6"
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(-6px)" }}
        transition={{ ...SPLASH_SHELL_EXIT, delay: reduceMotion ? 0 : 0.04 }}
      >
        <motion.header
          className="flex flex-col items-center text-center"
          initial={reduceMotion ? false : { opacity: 0, transform: "translateY(-10px)" }}
          animate={{ opacity: 1, transform: "translateY(0)" }}
          transition={{ type: "spring", duration: 0.48, bounce: 0.12, delay: 0.15 }}
        >
          <motion.div
            className="relative flex h-[3.75rem] w-[3.75rem] items-center justify-center"
            initial={reduceMotion ? false : { transform: "scale(0.92)", opacity: 0 }}
            animate={{ transform: "scale(1)", opacity: 1 }}
            transition={{ type: "spring", duration: 0.44, bounce: 0.18, delay: 0.2 }}
          >
            <motion.div
              className={`splash-logo-loader absolute inset-0 rounded-full ${reduceMotion ? "splash-logo-loader--reduced" : ""}`}
              aria-hidden
              exit={reduceMotion ? undefined : { opacity: 0, transform: "scale(1.15)" }}
              transition={SPLASH_SHELL_EXIT}
            />
            <motion.div
              className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#171412] text-[#eaf7df] shadow-[0_16px_40px_-24px_rgba(23,20,18,0.85)]"
              exit={reduceMotion ? undefined : { opacity: 0, transform: "scale(0.94)" }}
              transition={SPLASH_SHELL_EXIT}
            >
              <Activity className="h-6 w-6" strokeWidth={2.4} aria-hidden />
            </motion.div>
          </motion.div>
          <p className="mt-3 text-xl font-black tracking-tight text-[#171412]">
            TrackOMacro
          </p>
          <p className="mt-2 max-w-[16rem] text-sm font-semibold text-zinc-500">
            Log meals in plain language
          </p>
        </motion.header>
      </motion.div>
    </motion.div>
  );
}
