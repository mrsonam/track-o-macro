"use client";

import { BarChart3, ChefHat, Sparkles, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import type { FeatureIconId } from "./landing-content";
import { DURATION, LANDING_EASE_OUT, useLandingMotion } from "./reveal";

const FEATURE_ICONS: Record<FeatureIconId, LucideIcon> = {
  sparkles: Sparkles,
  "chef-hat": ChefHat,
  "bar-chart-3": BarChart3,
};

export function LandingFeatureRow({
  icon,
  title,
  body,
  index,
}: {
  icon: FeatureIconId;
  title: string;
  body: string;
  index: number;
}) {
  const Icon = FEATURE_ICONS[icon];
  const { motionOn } = useLandingMotion();

  const row = (
    <div className="group flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:gap-6 sm:p-8">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--protein-tint)] text-[color:var(--accent-secondary)] transition-colors duration-200 group-hover:bg-[color:var(--accent-secondary)] group-hover:text-white"
        aria-hidden
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="landing-kicker mb-1 text-[color:var(--accent-secondary)]">
          {String(index + 1).padStart(2, "0")}
        </p>
        <h3 className="text-lg font-black tracking-tight text-[color:var(--foreground)]">
          {title}
        </h3>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-zinc-600">{body}</p>
      </div>
    </div>
  );

  if (!motionOn) {
    return row;
  }

  return (
    <motion.div
      whileHover={{ x: 2 }}
      transition={{ duration: DURATION.press, ease: LANDING_EASE_OUT }}
    >
      {row}
    </motion.div>
  );
}
