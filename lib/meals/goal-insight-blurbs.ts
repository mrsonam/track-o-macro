/** Neutral copy for comparing rolling averages to profile targets. */

export function calorieGoalBlurb(avg: number, target: number): string {
  if (target <= 0) return "";
  const pct = Math.round(((avg - target) / target) * 100);
  const abs = Math.abs(pct);
  if (abs < 8) return "Near your daily calorie goal on average.";
  if (pct < 0) return `About ${abs}% below your daily goal on average.`;
  return `About ${abs}% above your daily goal on average.`;
}

export function proteinGoalBlurb(
  avgGPerDay: number,
  targetG: number,
  period: "week" | "month" = "week",
): string {
  if (targetG <= 0) return "";
  const pct = Math.round(((avgGPerDay - targetG) / targetG) * 100);
  const abs = Math.abs(pct);
  const span = period === "month" ? "this month" : "this week";
  if (abs < 8) return `Near your protein goal on average ${span}.`;
  if (pct < 0) {
    return `About ${abs}% below your protein goal on average ${span}.`;
  }
  return `About ${abs}% above your protein goal on average ${span}.`;
}
