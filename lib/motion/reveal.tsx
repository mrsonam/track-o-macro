"use client";

import type { ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import { useAppMotion } from "./hooks";
import { DURATION, EASE_OUT, STAGGER } from "./tokens";
import { fadeUpItem, fadeUpStaggerChild, staggerOrchestrator } from "./variants";

export { useMotionInView, useRevealLatch } from "./hooks";
export { EASE_OUT, STAGGER, DURATION };
export const revealItem: Variants = fadeUpItem;
export const revealStaggerItem: Variants = fadeUpStaggerChild;

const DEFAULT_VIEWPORT = {
  once: true,
  amount: 0.08,
  margin: "0px 0px -4% 0px" as const,
};

const visibleEnter = (y: number, delay = 0): Variants => ({
  hidden: { opacity: 1, y, scale: 0.99 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATION.reveal, ease: EASE_OUT, delay },
  },
});

export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 12,
  amount = DEFAULT_VIEWPORT.amount,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  amount?: number;
}) {
  const { motionOn } = useAppMotion();

  if (!motionOn) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={visibleEnter(y, delay)}
      initial="show"
      whileInView="show"
      viewport={{ ...DEFAULT_VIEWPORT, amount }}
    >
      {children}
    </motion.div>
  );
}

export function RevealStagger({
  children,
  className = "",
  stagger = STAGGER.default,
  amount = DEFAULT_VIEWPORT.amount,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  amount?: number;
  as?: "div" | "ol";
}) {
  const { motionOn } = useAppMotion();

  if (!motionOn) {
    if (as === "ol") {
      return <ol className={className}>{children}</ol>;
    }
    return <div className={className}>{children}</div>;
  }

  const motionProps = {
    className,
    variants: staggerOrchestrator(stagger),
    initial: "run" as const,
    whileInView: "run" as const,
    viewport: { ...DEFAULT_VIEWPORT, amount },
  };

  if (as === "ol") {
    return <motion.ol {...motionProps}>{children}</motion.ol>;
  }

  return <motion.div {...motionProps}>{children}</motion.div>;
}


export function RevealItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { motionOn } = useAppMotion();

  if (!motionOn) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={fadeUpStaggerChild} initial="run">
      {children}
    </motion.div>
  );
}

export function RevealLine({ className = "h-px w-full" }: { className?: string }) {
  const { motionOn } = useAppMotion();

  if (!motionOn) {
    return <hr className={`border-0 bg-black/[0.06] ${className}`} />;
  }

  return (
    <motion.hr
      className={`origin-left border-0 bg-black/[0.06] ${className}`}
      initial={{ scaleX: 1, opacity: 1 }}
      whileInView={{ scaleX: 1, opacity: 1 }}
      viewport={DEFAULT_VIEWPORT}
    />
  );
}
