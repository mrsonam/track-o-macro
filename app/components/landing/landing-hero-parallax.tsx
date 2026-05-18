"use client";

import type { ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLandingMotion } from "./reveal";

/** Subtle scroll depth on hero visual — decorative, GPU transform string. */
export function LandingHeroParallax({ children }: { children: ReactNode }) {
  const { motionOn } = useLandingMotion();
  const { scrollY } = useScroll();
  const transform = useTransform(
    scrollY,
    [0, 420],
    ["translate3d(0,0,0) scale(1)", "translate3d(0,24px,0) scale(0.985)"],
  );

  if (!motionOn) {
    return <div className="flex justify-center lg:justify-end">{children}</div>;
  }

  return (
    <motion.div className="flex justify-center lg:justify-end" style={{ transform }}>
      {children}
    </motion.div>
  );
}
