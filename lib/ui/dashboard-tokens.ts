/** Semantic Tailwind classes for Today dashboard surfaces (maps to globals.css tokens). */
export const dash = {
  textInk: "text-foreground",
  textSignal: "text-accent-secondary",
  textSignalDeep: "text-signal-deep",
  textMuted: "text-zinc-500",
  textMutedBody: "text-zinc-600",
  bgProtein: "bg-protein-tint",
  bgProteinSoft: "bg-protein-soft",
  bgWarm: "bg-warm-neutral",
  bgCarb: "bg-carb-sky",
  borderSignal: "border-accent-secondary/20",
  borderSignalStrong: "border-accent-secondary/35",
  ringSignal: "ring-accent-secondary/20",
  labelSection:
    "text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500",
  labelEyebrow:
    "text-[10px] font-black uppercase tracking-[0.28em] text-signal-deep",
  monoData: "font-mono font-black tabular-nums text-foreground",
} as const;
