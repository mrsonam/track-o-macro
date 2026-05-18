"use client";

import type { ComponentProps, ReactNode } from "react";
import { motion } from "framer-motion";
import { useAppMotion } from "./hooks";
import { DURATION, EASE_OUT } from "./tokens";
import { fadeUpItem, pageEnter } from "./variants";

type MotionBentoProps = {
  children: ReactNode;
  className?: string;
  /** Extra delay before reveal (seconds) */
  delay?: number;
  /** Stagger index — multiplies 0.05s */
  index?: number;
  /** Skip scroll reveal; animate on mount (hero / above-fold) */
  mount?: boolean;
};

/** Wraps dashboard cards — scroll reveal with optional mount animation. */
export function MotionBento({
  children,
  className = "",
  delay = 0,
  index = 0,
  mount = false,
}: MotionBentoProps) {
  const { motionOn } = useAppMotion();
  const totalDelay = delay + index * 0.05;

  if (!motionOn) {
    return <div className={className}>{children}</div>;
  }

  if (mount) {
    return (
      <motion.div
        className={className}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: DURATION.reveal, ease: EASE_OUT, delay: totalDelay }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.12, margin: "0px 0px -5% 0px" }}
      transition={{ duration: DURATION.reveal, ease: EASE_OUT, delay: totalDelay }}
    >
      {children}
    </motion.div>
  );
}

/** Main route template — soft page enter on navigation. */
export function MotionPage({ children }: { children: ReactNode }) {
  const { motionOn } = useAppMotion();

  if (!motionOn) {
    return <>{children}</>;
  }

  return (
    <motion.div initial="hidden" animate="show" variants={pageEnter}>
      {children}
    </motion.div>
  );
}

type MotionPressableProps = Omit<ComponentProps<typeof motion.button>, "children"> & {
  children?: ReactNode;
  as?: "button" | "div";
};

/** Hover lift + press scale — use on primary CTAs. */
export function MotionPressable({
  as = "button",
  className = "",
  children,
  whileHover,
  whileTap,
  transition,
  ...rest
}: MotionPressableProps) {
  const { motionOn } = useAppMotion();
  const motionClass = `motion-press ${className}`;
  const motionProps = {
    whileHover: whileHover ?? { y: -1 },
    whileTap: whileTap ?? { scale: 0.97 },
    transition: transition ?? { duration: DURATION.press, ease: EASE_OUT },
  };

  if (!motionOn) {
    const staticClass = `motion-press ${className}`;
    if (as === "div") {
      return (
        <div className={staticClass} {...(rest as ComponentProps<"div">)}>
          {children}
        </div>
      );
    }
    return (
      <button type="button" className={staticClass} {...(rest as ComponentProps<"button">)}>
        {children}
      </button>
    );
  }

  if (as === "div") {
    return (
      <motion.div className={motionClass} {...motionProps} {...(rest as ComponentProps<typeof motion.div>)}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.button
      type="button"
      className={motionClass}
      {...motionProps}
      {...(rest as ComponentProps<typeof motion.button>)}
    >
      {children}
    </motion.button>
  );
}

/** List row entrance — use inside RevealStagger. */
export function MotionListItem({
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
    <motion.div className={className} variants={fadeUpItem}>
      {children}
    </motion.div>
  );
}

/** Auth / onboarding shell entrance — once per mount. */
export function MotionEntrance({
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
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: DURATION.modal, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
