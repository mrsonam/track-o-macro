import type { RollingWeekSummaryData } from "@/lib/meals/rolling-week-summary-data";

export function parseRollingWeekInsightPayload(
  json: Record<string, unknown>,
): RollingWeekSummaryData | null {
  const mealCount = Number(json.mealCount);
  const daysInWindow = Number(json.daysInWindow);
  const daysWithLogs = Number(json.daysWithLogs);
  const totals = json.totals;
  const averages = json.averages;
  if (
    !Number.isFinite(mealCount) ||
    !totals ||
    typeof totals !== "object" ||
    !averages ||
    typeof averages !== "object"
  ) {
    return null;
  }
  const out: RollingWeekSummaryData = {
    mealCount,
    daysInWindow,
    daysWithLogs,
    totals: totals as RollingWeekSummaryData["totals"],
    averages: averages as RollingWeekSummaryData["averages"],
    drifts: json.drifts as RollingWeekSummaryData["drifts"],
    patterns: json.patterns as RollingWeekSummaryData["patterns"],
  };
  if (json.recovery14 != null && typeof json.recovery14 === "object") {
    out.recovery14 = json.recovery14 as RollingWeekSummaryData["recovery14"];
  }
  return out;
}
