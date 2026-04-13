/** One optional coaching line for rolling week cards (Epic 5) + if–then pairing. */

import type { WeeklyCoachingFocus } from "@/lib/meals/weekly-coaching-focus";
import {
  weeklyCoachingFocusTip,
} from "@/lib/meals/weekly-coaching-focus";

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

export type TryThisWeekResult = {
  /** Heuristic or theme-based nudge */
  text: string | null;
  /** Short if–then line (deterministic, tone-safe — not AI) */
  ifThen: string | null;
};

function ifThenForFocus(f: WeeklyCoachingFocus): string {
  switch (f) {
    case "protein":
      return "If I’m leaning on this theme, I’ll anchor protein at breakfast or lunch in one repeatable way.";
    case "vegetables":
      return "If I’m leaning on this theme, I’ll add one vegetable portion where it’s easiest that day.";
    case "hydration":
      return "If I’m leaning on this theme, I’ll pair a glass of water with something I already do.";
    case "steady_calories":
      return "If I’m leaning on this theme, I’ll keep main meals in a similar ballpark on busy days.";
  }
}

export function computeTryThisWeek(i: TryThisWeekInput): TryThisWeekResult {
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

  if (mealCount === 0) return { text: null, ifThen: null };

  if (
    dailyTargetProteinG != null &&
    dailyTargetProteinG > 0 &&
    avgProteinGPerDay < dailyTargetProteinG * 0.72
  ) {
    return {
      text: "Add a little protein earlier in the day (breakfast or lunch)—small moves usually stick better than a big late catch-up.",
      ifThen:
        "If a meal is light on protein, I’ll add one small source I already keep around (yogurt, egg, fish, or tofu).",
    };
  }

  if (
    dailyTargetKcal != null &&
    dailyTargetKcal > 0 &&
    avgKcalPerDay > dailyTargetKcal * 1.12
  ) {
    return {
      text: "Try one swap or a slightly smaller portion per meal instead of redoing the whole day—gentle tweaks add up.",
      ifThen:
        "If I’m trending above my calorie guide, I’ll adjust the next meal or snack one step—not restart the whole day.",
    };
  }

  if (
    dailyTargetKcal != null &&
    dailyTargetKcal > 0 &&
    avgKcalPerDay < dailyTargetKcal * 0.78 &&
    daysWithLogs >= 3
  ) {
    return {
      text: "Averages sat under your calorie goal—if that wasn't the plan, one intentional add-on on lighter days can steady the week.",
      ifThen:
        "If I feel low on energy on lighter days, I’ll add one planned snack or side with my next meal.",
    };
  }

  if (daysWithLogs < Math.min(4, daysInWindow)) {
    return {
      text: "Pick one short logging moment on the days you care about (right after a meal works)—brief beats sporadic.",
      ifThen:
        "If I forget to log, I’ll jot one line after the next meal I care about.",
    };
  }

  if (weeklyCoachingFocus) {
    return {
      text: weeklyCoachingFocusTip(weeklyCoachingFocus),
      ifThen: ifThenForFocus(weeklyCoachingFocus),
    };
  }

  return { text: null, ifThen: null };
}

export function tryThisWeekSuggestion(i: TryThisWeekInput): string | null {
  return computeTryThisWeek(i).text;
}
