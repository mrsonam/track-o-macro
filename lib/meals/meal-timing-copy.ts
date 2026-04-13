/**
 * Local-time meal bands (non-judgmental): morning / midday / evening / late night.
 * Hours use the viewer's IANA zone on the server via `timezone(tz, created_at)`.
 */

export type MealTimingBandsKcal = {
  morning_kcal: number;
  midday_kcal: number;
  evening_kcal: number;
  late_night_kcal: number;
  total_kcal: number;
};

const BAND_LABEL: Record<
  keyof Omit<MealTimingBandsKcal, "total_kcal">,
  string
> = {
  morning_kcal: "morning (about 5 a.m.–noon)",
  midday_kcal: "midday (about noon–5 p.m.)",
  evening_kcal: "early evening (about 5–9 p.m.)",
  late_night_kcal: "late evening or overnight (after about 9 p.m.)",
};

function bandShares(b: MealTimingBandsKcal) {
  const t = b.total_kcal;
  if (t <= 0) {
    return {
      morning_kcal: 0,
      midday_kcal: 0,
      evening_kcal: 0,
      late_night_kcal: 0,
    };
  }
  return {
    morning_kcal: (100 * b.morning_kcal) / t,
    midday_kcal: (100 * b.midday_kcal) / t,
    evening_kcal: (100 * b.evening_kcal) / t,
    late_night_kcal: (100 * b.late_night_kcal) / t,
  };
}

/** Rolling-window insight: where most calories landed across local hours. */
export function mealTimingBandLine(input: {
  bands: MealTimingBandsKcal;
  mealCount: number;
}): string | null {
  const { bands, mealCount } = input;
  if (mealCount < 3 || bands.total_kcal <= 0) return null;
  const shares = bandShares(bands);
  const entries = Object.entries(shares) as [
    keyof typeof shares,
    number,
  ][];
  entries.sort((a, b) => b[1] - a[1]);
  const [topKey, topPct] = entries[0]!;
  if (topPct < 36) return null;
  const label = BAND_LABEL[topKey];
  return `Most calories in this period sat in the ${label} — about ${Math.round(topPct)}% of the total (local time).`;
}

/** One or two short lines for a single logged day. */
export function dayMealTimingLines(input: {
  bands: MealTimingBandsKcal;
  mealCount: number;
}): string[] {
  const { bands, mealCount } = input;
  if (mealCount < 2 || bands.total_kcal <= 0) return [];
  const shares = bandShares(bands);
  const sorted = (
    Object.entries(shares) as [keyof typeof shares, number][]
  ).sort((a, b) => b[1] - a[1]);
  const [firstKey, firstPct] = sorted[0]!;
  const out: string[] = [];
  if (firstPct >= 42) {
    out.push(
      `Calories leaned toward ${BAND_LABEL[firstKey]} — about ${Math.round(firstPct)}% for the day (local time).`,
    );
  }
  const late = shares.late_night_kcal;
  if (late >= 22 && firstKey !== "late_night_kcal" && mealCount >= 2) {
    out.push(
      `Roughly ${Math.round(late)}% of the day’s calories fell in the broader overnight window (after 9 p.m. or before 5 a.m., local time).`,
    );
  }
  return out.slice(0, 2);
}
