/**
 * Epic 5 — optional bridge copy between the user's weekly if–then plan
 * and heuristic "Try this week" lines. Deterministic, tone-guarded, not AI.
 */

/** One-tap starters for Settings (deterministic, not generated). */
export const IMPLEMENTATION_INTENTION_STARTERS: readonly string[] = [
  "If I skip breakfast, then I log my first meal before 2pm.",
  "If I feel rushed after dinner, then I jot one line before I leave the table.",
  "If protein feels light by lunch, then I add one small source I already keep at home.",
];

export type TryThisWeekSnippet = {
  text: string | null;
  ifThen: string | null;
};

function mentionsProtein(s: string): boolean {
  return (
    /\bprotein\b/i.test(s) ||
    /\begg(?:s)?\b/i.test(s) ||
    /\bmeat\b/i.test(s) ||
    /\bchicken\b/i.test(s) ||
    /\bfish\b/i.test(s) ||
    /\btofu\b/i.test(s) ||
    /\byogurt\b/i.test(s)
  );
}

function mentionsLoggingRhythm(plan: string, bundle: string): boolean {
  const p = plan.toLowerCase();
  const b = bundle.toLowerCase();
  const planCare =
    /\blog\b|\btrack\b|\bjot\b|\bwrite\b|\bforget\b|\bremember\b|\bmiss\b/.test(
      p,
    );
  const bundleCare =
    /\blog\b|\btrack\b|\bforget\b|\bmeal\b|\brhythm\b|\bday\b/.test(b);
  return planCare && bundleCare;
}

function mentionsCalories(plan: string, bundle: string): boolean {
  const p = plan.toLowerCase();
  const b = bundle.toLowerCase();
  const planCare =
    /\bcalor|\bkcal\b|\benergy\b|\bportion\b|\bswap\b/.test(p);
  const bundleCare =
    /\bcalor|\bkcal\b|\bportion\b|\bswap\b|\bgoal\b/.test(b);
  return planCare && bundleCare;
}

/**
 * When both a user-authored plan and a heuristic suggestion exist, returns one
 * short line that connects them without prescribing or grading.
 */
export function computePlanSuggestionBridge(
  planTrimmed: string,
  tryWeek: TryThisWeekSnippet,
): string | null {
  const text = tryWeek.text?.trim() ?? "";
  if (!planTrimmed || !text) return null;

  const bundle = `${tryWeek.text ?? ""} ${tryWeek.ifThen ?? ""}`;

  if (mentionsProtein(planTrimmed) && mentionsProtein(bundle)) {
    return "Optional: your note and this week’s protein signal are pointing a similar direction—use either, both, or neither.";
  }

  if (mentionsLoggingRhythm(planTrimmed, bundle)) {
    return "Optional: your plan and the rhythm note below both talk about showing up—pick what feels helpful.";
  }

  if (mentionsCalories(planTrimmed, bundle)) {
    return "Optional: your plan and the calorie pattern below can overlap—treat both as tools, not a score.";
  }

  return "The suggestion below is patterns-only; it doesn’t replace or judge the plan you wrote.";
}
