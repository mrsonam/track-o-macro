/**
 * Non-judgmental copy for Epic 4 pattern insights (weekend vs weekday, late calories).
 */

export function weekendDriftLine(input: {
  weekendAvgKcal: number | null;
  weekdayAvgKcal: number | null;
  weekendDays: number;
  weekdayDays: number;
}): string | null {
  const w = input.weekendAvgKcal;
  const d = input.weekdayAvgKcal;
  if (
    w == null ||
    d == null ||
    input.weekendDays < 1 ||
    input.weekdayDays < 1
  ) {
    return null;
  }
  if (w <= 0 && d <= 0) return null;

  const diff = w - d;
  const absRatio = d > 0 ? Math.abs(w / d - 1) : w > 0 ? 1 : 0;
  if (Math.abs(diff) < 120 && absRatio < 0.12) return null;

  if (w > d) {
    return `Weekend days in this window averaged about ${Math.round(w)} kcal per day vs ${Math.round(d)} on weekdays — a bit higher on days off.`;
  }
  return `Weekday averages were about ${Math.round(d)} kcal per day vs ${Math.round(w)} on weekend days in this window.`;
}

export function lateEatingLine(input: {
  kcalFrom21Local: number;
  totalKcal: number;
  mealCount: number;
}): string | null {
  if (input.mealCount < 2 || input.totalKcal <= 0) return null;
  const pct = (100 * input.kcalFrom21Local) / input.totalKcal;
  if (pct < 22) return null;
  return `About ${Math.round(pct)}% of calories were logged after 9:00 p.m. (your local time) in this period.`;
}

/** When protein is concentrated in one logged meal (2+ meals that day). */
export function proteinDistributionLine(input: {
  mealCount: number;
  drivers?: {
    protein?: { rawInput: string; value: number };
  } | null;
  totalProteinG: number;
}): string | null {
  const d = input.drivers?.protein;
  if (!d || input.mealCount < 2 || input.totalProteinG <= 0) return null;
  const v = Number(d.value);
  if (v <= 0) return null;
  const share = (100 * v) / input.totalProteinG;
  if (share < 44) return null;
  const short = shortenMealLabel(d.rawInput, 48);
  return `About ${Math.round(share)}% of today’s protein came from “${short}.”`;
}

export function whatDroveDayLine(input: {
  mealCount: number;
  drivers?: {
    kcal?: { rawInput: string; value: number };
  } | null;
  totalKcal: number;
}): string | null {
  const d = input.drivers?.kcal;
  if (!d || input.mealCount < 1 || input.totalKcal <= 0) return null;
  const share = (100 * d.value) / input.totalKcal;
  const short = shortenMealLabel(d.rawInput, 52);
  if (input.mealCount === 1) {
    return `Today’s log was “${short}.”`;
  }
  if (share >= 38) {
    return `Largest share of today’s calories came from “${short}” (~${Math.round(share)}%).`;
  }
  return null;
}

function shortenMealLabel(raw: string, max: number) {
  const t = raw.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}
