"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { DURATION, LANDING_EASE_OUT, useLandingMotion } from "./reveal";

const featureCardHover = {
  transform: "translate3d(0,-4px,0)",
  boxShadow: "0 20px 50px -36px rgba(23,20,18,0.35)",
  borderColor: "rgba(79,157,69,0.25)",
  transition: { duration: DURATION.press, ease: LANDING_EASE_OUT },
} as const;

const featureCardTap = {
  transform: "translate3d(0,-2px,0) scale(0.98)",
  transition: { duration: 0.12, ease: LANDING_EASE_OUT },
} as const;

const featureIconHover = {
  backgroundColor: "#4f9d45",
  color: "#ffffff",
  transition: { duration: DURATION.press, ease: LANDING_EASE_OUT },
} as const;

const featureCardInteractionVariants = {
  hover: featureCardHover,
  tap: featureCardTap,
};

const featureIconVariants = {
  hover: featureIconHover,
};

export function LandingFeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  const { motionOn } = useLandingMotion();

  if (!motionOn) {
    return (
      <article className="landing-feature-card landing-feature-card-static group h-full cursor-default rounded-[1.75rem] border border-black/[0.08] bg-white/70 p-6 transition-[border-color,box-shadow,transform] duration-200 hover:border-[#4f9d45]/25 hover:shadow-[0_20px_50px_-36px_rgba(23,20,18,0.35)]">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf7df] text-[#4f9d45] transition-colors duration-200 group-hover:bg-[#4f9d45] group-hover:text-white">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <h3 className="text-lg font-black tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">{body}</p>
      </article>
    );
  }

  return (
    <motion.article
      variants={featureCardInteractionVariants}
      whileHover="hover"
      whileTap="tap"
      className="landing-feature-card h-full cursor-default rounded-[1.75rem] border border-black/[0.08] bg-white/70 p-6"
      style={{
        boxShadow: "0 0 0 rgba(23,20,18,0)",
        borderColor: "rgba(0,0,0,0.08)",
      }}
    >
      <motion.div
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl"
        style={{ backgroundColor: "#eaf7df", color: "#4f9d45" }}
        variants={featureIconVariants}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </motion.div>
      <h3 className="text-lg font-black tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{body}</p>
    </motion.article>
  );
}
