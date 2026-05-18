"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { useHydrated } from "@/lib/hooks/use-hydrated";

/** True when client is ready and user allows motion. */
export function useAppMotion() {
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const motionOn = hydrated && !reduceMotion;
  return {
    hydrated,
    reduceMotion: !!reduceMotion,
    motionOn,
    /** Scroll reveals stay visible until hydrated; avoids SSR → client opacity:0 swap. */
    revealReady: motionOn,
  };
}

function isInViewport(node: HTMLElement) {
  const rect = node.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < vh * 0.98 && rect.bottom > 0;
}

type RevealLatchOptions = {
  amount?: number;
  /** Viewport margin passed to `useInView` (e.g. `"0px 0px -2% 0px"`). */
  margin?: NonNullable<Parameters<typeof useInView>[1]>["margin"];
};

/**
 * Scroll-reveal latch: triggers once, never hides again.
 * Prefer `whileInView` + `revealReady` on landing; latch kept for legacy callers.
 */
export function useRevealLatch<T extends HTMLElement = HTMLDivElement>({
  amount = 0.05,
  margin = "0px",
}: RevealLatchOptions = {}) {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { once: true, amount, margin });
  const [latched, setLatched] = useState(false);

  useLayoutEffect(() => {
    if (inView) {
      setLatched(true);
      return;
    }
    const node = ref.current;
    if (node && isInViewport(node)) {
      setLatched(true);
    }
  }, [inView]);

  return { ref, latched };
}

type MotionInViewOptions = RevealLatchOptions;

/** @deprecated Prefer whileInView + revealReady */
export function useMotionInView<T extends HTMLElement = HTMLDivElement>(
  options: MotionInViewOptions = {},
) {
  const { ref, latched } = useRevealLatch<T>(options);
  const { motionOn } = useAppMotion();
  return { ref, active: !motionOn || latched, motionOn, inView: latched };
}
