/** Epic 1 story 7 — how the user typically logs (sets expectations for portion UX later). */
export type LoggingStyle = "quick_estimates" | "weigh_often" | "mixed";

/** Epic 1 story 6 — dietary pattern (for future tips / defaults, not judgment). */
export type DietaryPattern =
  | "omnivore"
  | "vegetarian"
  | "vegan"
  | "pescatarian"
  | "prefer_not_say";

export const LOGGING_STYLE_LABELS: Record<
  LoggingStyle,
  { title: string; desc: string }
> = {
  quick_estimates: {
    title: "Quick estimates",
    desc: "Eyeball portions or use rough descriptions most of the time.",
  },
  weigh_often: {
    title: "I weigh or measure a lot",
    desc: "Food scale, cups, or labels—numbers matter to you.",
  },
  mixed: {
    title: "A mix of both",
    desc: "Sometimes detailed, sometimes quick—it depends on the meal.",
  },
};

export const DIETARY_PATTERN_LABELS: Record<
  DietaryPattern,
  { title: string; desc: string }
> = {
  omnivore: { title: "Omnivore", desc: "No specific dietary pattern." },
  vegetarian: {
    title: "Vegetarian",
    desc: "No meat or fish; may include dairy and eggs.",
  },
  vegan: { title: "Vegan", desc: "Plant-based; no animal products." },
  pescatarian: {
    title: "Pescatarian",
    desc: "Fish/seafood; typically no other meat.",
  },
  prefer_not_say: {
    title: "Prefer not to say",
    desc: "We won’t use this for tips until you add it later.",
  },
};

const MAX_AVOID_ITEMS = 15;
const MAX_AVOID_LEN = 48;

/** Parse comma/newline-separated avoid list; normalize for storage. */
export function parseFoodAvoidList(raw: string): string[] {
  const parts = raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const t = p.slice(0, MAX_AVOID_LEN);
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= MAX_AVOID_ITEMS) break;
  }
  return out;
}

export function loggingStyleBlurb(style: LoggingStyle | null | undefined): string {
  if (!style) return "";
  if (style === "quick_estimates") {
    return "You said you usually log with quick estimates—we’ll keep portion language practical.";
  }
  if (style === "weigh_often") {
    return "You prefer weighing or measuring—mention grams or units when you log for tighter matches.";
  }
  return "You use a mix of detail and estimates—either style works here.";
}
