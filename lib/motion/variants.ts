import type { Transition, Variants } from "framer-motion";
import { DURATION, EASE_OUT } from "./tokens";

const easeOutTransition = (duration: number = DURATION.reveal, delay = 0): Transition => ({
  duration,
  ease: EASE_OUT,
  delay,
});

/** Scroll / list item reveal — opacity always 1 (transform-only entrance). */
export const fadeUpItem: Variants = {
  hidden: { opacity: 1, y: 12, scale: 0.99 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: easeOutTransition(),
  },
};

export const staggerOrchestrator = (stagger = 0.07, delayChildren = 0.03): Variants => ({
  idle: { opacity: 1 },
  run: {
    opacity: 1,
    transition: { staggerChildren: stagger, delayChildren },
  },
});

/** @deprecated Use staggerOrchestrator */
export const staggerContainer = staggerOrchestrator;

export const fadeUpStaggerChild: Variants = {
  idle: { opacity: 1, y: 10, scale: 0.99 },
  run: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: easeOutTransition(),
  },
};

export const modalPanel: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: easeOutTransition(DURATION.modal),
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.98,
    transition: easeOutTransition(DURATION.fast),
  },
};

export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DURATION.fast, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.14, ease: EASE_OUT } },
};

/** Mobile bottom sheet: slide up from below the viewport. */
export const sheetPanel: Variants = {
  hidden: { y: "100%" },
  show: {
    y: 0,
    transition: easeOutTransition(DURATION.modal),
  },
  exit: {
    y: "100%",
    transition: easeOutTransition(DURATION.fast),
  },
};

export const sheetPanelReduced: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: easeOutTransition(DURATION.fast),
  },
  exit: {
    opacity: 0,
    transition: easeOutTransition(DURATION.fast),
  },
};

export const pageEnter: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: easeOutTransition(DURATION.page),
  },
};

export const alertBanner: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: easeOutTransition(DURATION.ui),
  },
  exit: {
    opacity: 0,
    y: 6,
    scale: 0.98,
    transition: easeOutTransition(DURATION.fast),
  },
};

export const collapsePanel: Variants = {
  hidden: { opacity: 0, height: 0 },
  show: {
    opacity: 1,
    height: "auto",
    transition: easeOutTransition(DURATION.ui),
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: easeOutTransition(DURATION.fast),
  },
};

export const navLayoutTransition = {
  type: "spring" as const,
  bounce: 0.12,
  duration: 0.45,
};
