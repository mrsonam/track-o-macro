import type { AppleHealthDayRollup } from "@/lib/health/apple-day-rollup";

/** Short coaching-style lines for the day card (max ~2). */
export function appleHealthExplainLines(
  rollup: AppleHealthDayRollup | null | undefined,
): string[] {
  if (!rollup) return [];
  const lines: string[] = [];

  const parts: string[] = [];
  if (rollup.steps != null && rollup.steps > 0) {
    parts.push(`about ${Math.round(rollup.steps).toLocaleString()} steps`);
  }
  if (rollup.activeEnergyKcal != null && rollup.activeEnergyKcal > 0) {
    parts.push(
      `~${Math.round(rollup.activeEnergyKcal)} kcal active energy from Apple Health`,
    );
  }
  if (parts.length > 0) {
    lines.push(`Movement: ${parts.join(" · ")}.`);
  }

  if (rollup.sleepMinutes != null && rollup.sleepMinutes >= 30) {
    const h = rollup.sleepMinutes / 60;
    lines.push(
      `Sleep logged from Apple Health (~${h < 10 ? h.toFixed(1) : Math.round(h)} h).`,
    );
  }

  return lines.slice(0, 2);
}
