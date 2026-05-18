"use client";

import { motion } from "framer-motion";
import { LANDING_EASE_OUT, useLandingMotion } from "./reveal";

const previewLines = ["2 eggs 120g", "spinach 80g", "sourdough 45g"] as const;

const previewMacros = [
  { l: "Kcal", v: "412", tint: "landing-tint-protein" },
  { l: "Protein", v: "28g", tint: "landing-tint-protein" },
  { l: "Carbs", v: "34g", tint: "landing-tint-carb" },
  { l: "Fat", v: "14g", tint: "landing-tint-fat" },
] as const;

const shellClass =
  "landing-live-preview landing-reveal relative overflow-hidden rounded-[2rem] border border-black/[0.08] bg-white p-5 shadow-[0_28px_80px_-48px_rgba(23,20,18,0.5)] sm:p-6";

export function LandingLivePreview() {
  const { motionOn } = useLandingMotion();

  const inner = (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Live preview</p>
        <span
          className="flex items-center gap-1.5 rounded-full bg-[color:var(--protein-tint)] px-2.5 py-0.5 text-[10px] font-bold text-[color:var(--accent-secondary)]"
          role="status"
          aria-live="polite"
        >
          <span className="landing-analyzing-dot" aria-hidden />
          Demo: analyzing meal
        </span>
      </div>
      <div className="space-y-2 rounded-2xl bg-[color:var(--warm-neutral)] p-4 font-mono text-sm">
        {previewLines.map((line) => (
          <p key={line} className="text-zinc-600">
            {line}
          </p>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {previewMacros.map((m) => (
          <div
            key={m.l}
            className={`rounded-xl border border-black/[0.08] px-3 py-2 text-center ${m.tint}`}
          >
            <p className="text-[9px] font-black uppercase text-zinc-500">{m.l}</p>
            <p className="font-mono text-lg font-black tabular-nums">{m.v}</p>
          </div>
        ))}
      </div>
    </>
  );

  if (!motionOn) {
    return <div className={shellClass}>{inner}</div>;
  }

  return (
    <motion.div
      className={shellClass}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.16, ease: LANDING_EASE_OUT }}
    >
      {inner}
    </motion.div>
  );
}
