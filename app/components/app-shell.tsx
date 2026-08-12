"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AppSplashOverlay } from "@/app/components/app-splash-overlay";
import { SPLASH_MIN_VISIBLE_MS } from "@/lib/splash/splash-icons";
import { SPLASH_APP_REVEAL } from "@/lib/splash/splash-motion";
import { EASE_OUT } from "@/lib/motion/tokens";

function isDocumentLoaded() {
  return typeof document !== "undefined" && document.readyState === "complete";
}

/**
 * Coordinates splash exit with app reveal: page loads underneath, then crossfades in.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [showSplash, setShowSplash] = useState(true);
  const [appRevealed, setAppRevealed] = useState(false);
  /** After reveal animation, drop transform so `position: fixed` nav pins to the viewport. */
  const [revealSettled, setRevealSettled] = useState(false);

  const beginReveal = useCallback(() => {
    setAppRevealed(true);
    setShowSplash(false);
  }, []);

  useEffect(() => {
    let minElapsed = false;
    let loadComplete = isDocumentLoaded();

    const tryReveal = () => {
      if (minElapsed && loadComplete) beginReveal();
    };

    const minTimer = window.setTimeout(() => {
      minElapsed = true;
      tryReveal();
    }, SPLASH_MIN_VISIBLE_MS);

    const onLoad = () => {
      loadComplete = true;
      tryReveal();
    };

    if (!loadComplete) {
      window.addEventListener("load", onLoad, { once: true });
    } else {
      tryReveal();
    }

    return () => {
      window.clearTimeout(minTimer);
      window.removeEventListener("load", onLoad);
    };
  }, [reduceMotion, beginReveal]);

  useEffect(() => {
    if (!showSplash) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showSplash]);

  const revealTransition = reduceMotion
    ? { duration: 0.2, ease: EASE_OUT }
    : SPLASH_APP_REVEAL;

  return (
    <>
      <motion.div
        className="flex min-h-dvh min-h-full flex-1 flex-col"
        initial={false}
        animate={
          revealSettled || reduceMotion
            ? { opacity: appRevealed ? 1 : 0 }
            : appRevealed
              ? { opacity: 1, transform: "scale(1)" }
              : { opacity: 0, transform: "scale(0.992)" }
        }
        transition={revealTransition}
        onAnimationComplete={() => {
          if (appRevealed) setRevealSettled(true);
        }}
        style={{ pointerEvents: appRevealed ? undefined : "none" }}
        aria-hidden={!appRevealed}
        inert={!appRevealed ? true : undefined}
      >
        {children}
      </motion.div>

      <AnimatePresence
        onExitComplete={() => {
          document.body.style.overflow = "";
        }}
      >
        {showSplash ? (
          <AppSplashOverlay key="splash" reduceMotion={reduceMotion} />
        ) : null}
      </AnimatePresence>
    </>
  );
}
