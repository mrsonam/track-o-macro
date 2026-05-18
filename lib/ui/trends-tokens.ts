import { dash } from "@/lib/ui/dashboard-tokens";

/** Shared Tailwind classes for the Trends page (light PWA, green signal palette). */
export const trends = {
  panel:
    "bento-card scroll-mt-28 border-black/10 bg-white/85 transition-[border-color,box-shadow] duration-200 hover:border-accent-secondary/20",
  stickyNav:
    "sticky top-0 z-20 -mx-4 border-b border-black/[0.06] bg-[#fbfaf5]/92 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6",
  labelEyebrow: dash.labelEyebrow,
  labelSection: dash.labelSection,
  monoKpi: "font-mono text-lg font-black tabular-nums tracking-tight text-foreground sm:text-xl",
} as const;

export type TrendsSectionAccent = "signal" | "carb" | "neutral";

export const trendsSectionAccent = {
  signal: {
    label: "text-signal-deep",
    rule: "from-accent-secondary/40",
    icon: "text-accent-secondary",
    chip: "border-accent-secondary/20 bg-protein-tint text-signal-deep",
  },
  carb: {
    label: "text-sky-900",
    rule: "from-sky-800/30",
    icon: "text-sky-800",
    chip: "border-sky-200 bg-carb-sky text-sky-900",
  },
  neutral: {
    label: "text-zinc-700",
    rule: "from-black/12",
    icon: "text-zinc-600",
    chip: "border-black/10 bg-warm-neutral text-zinc-800",
  },
} as const satisfies Record<
  TrendsSectionAccent,
  { label: string; rule: string; icon: string; chip: string }
>;
