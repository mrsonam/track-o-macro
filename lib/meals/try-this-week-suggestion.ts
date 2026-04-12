/** One optional coaching line for rolling week cards (Epic 5). */

import type { WeeklyCoachingFocus } from "@/lib/meals/weekly-coaching-focus";
import { weeklyCoachingFocusTip } from "@/lib/meals/weekly-coaching-focus";

export type TryThisWeekInput = {
  daysWithLogs: number;
  daysInWindow: number;
  mealCount: number;
  avgKcalPerDay: number;
  avgProteinGPerDay: number;
  dailyTargetKcal: number | null;
  dailyTargetProteinG: number | null;
  /** User-chosen theme from Settings; used only when no heuristic matches. */
  weeklyCoachingFocus: WeeklyCoachingFocus | null;
};

export function tryThisWeekSuggestion(i: TryThisWeekInput): string | null {
  const {
    daysWithLogs,
    daysInWindow,
    mealCount,
    avgKcalPerDay,
    avgProteinGPerDay,
    dailyTargetKcal,
    dailyTargetProteinG,
    weeklyCoachingFocus,
  } = i;

  if (mealCount === 0) return null;

  if (
    dailyTargetProteinG != null &&
    dailyTargetProteinG > 0 &&
    avgProteinGPerDay < dailyTargetProteinG * 0.72
  ) {
    return "Add a little protein earlier in the day (breakfast or lunch)—small moves usually stick better than a big late catch-up.";
  }

  if (
    dailyTargetKcal != null &&
    dailyTargetKcal > 0 &&
    avgKcalPerDay > dailyTargetKcal * 1.12
  ) {
    return "Try one swap or a slightly smaller portion per meal instead of redoing the whole day—gentle tweaks add up.";
  }

  if (
    dailyTargetKcal != null &&
    dailyTargetKcal > 0 &&
    avgKcalPerDay < dailyTargetKcal * 0.78 &&
    daysWithLogs >= 3
  ) {
    return "Averages sat under your calorie goal—if that wasn't the plan, one intentional add-on on lighter days can steady the week.";
  }

  if (daysWithLogs < Math.min(4, daysInWindow)) {
    return "Pick one short logging moment on the days you care about (right after a meal works)—brief beats sporadic.";
  }

  if (weeklyCoachingFocus) {
    return weeklyCoachingFocusTip(weeklyCoachingFocus);
  }

  return null;
}
