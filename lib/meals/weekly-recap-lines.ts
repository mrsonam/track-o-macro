/**
 * Plain-language wins / friction for the rolling week recap (Epic 5).
 * Heuristics only—not medical advice.
 */

export type WeeklyRecapInput = {
  daysWithLogs: number;
  daysInWindow: number;
  mealCount: number;
  avgKcalPerDay: number;
  avgProteinGPerDay: number;
  dailyTargetKcal: number | null;
  dailyTargetProteinG: number | null;
  weekendAvgKcal?: number | null;
  weekdayAvgKcal?: number | null;
};

export function weeklyRecapLines(input: WeeklyRecapInput): {
  wins: string[];
  friction: string[];
} {
  const wins: string[] = [];
  const friction: string[] = [];

  if (input.mealCount === 0) {
    return { wins: [], friction: [] };
  }

  const {
    daysWithLogs,
    daysInWindow,
    avgKcalPerDay,
    avgProteinGPerDay,
    dailyTargetKcal,
    dailyTargetProteinG,
    weekendAvgKcal,
    weekdayAvgKcal,
  } = input;

  const ratio = daysInWindow > 0 ? daysWithLogs / daysInWindow : 0;
  if (ratio >= 0.85) {
    wins.push(
      `${daysWithLogs} of ${daysInWindow} days had a log—solid visibility without needing a perfect streak.`,
    );
  } else if (daysWithLogs >= 4) {
    wins.push(
      `${daysWithLogs} logging days this week—enough signal to notice patterns.`,
    );
  }

  if (dailyTargetKcal != null && dailyTargetKcal > 0) {
    const off = Math.abs(avgKcalPerDay - dailyTargetKcal) / dailyTargetKcal;
    if (off < 0.1 && wins.length < 2) {
      wins.push("Average calories landed close to your daily target.");
    } else if (avgKcalPerDay > dailyTargetKcal * 1.14) {
      friction.push(
        "Calories averaged above your goal on most days—small steady swaps often beat a full restart.",
      );
    } else if (
      avgKcalPerDay < dailyTargetKcal * 0.75 &&
      daysWithLogs >= 3
    ) {
      friction.push(
        "Calories averaged under your goal—check that lined up with how you felt and what you intended.",
      );
    }
  }

  if (dailyTargetProteinG != null && dailyTargetProteinG > 0) {
    if (avgProteinGPerDay >= dailyTargetProteinG * 0.9 && wins.length < 2) {
      wins.push("Protein averaged near your daily goal.");
    } else if (avgProteinGPerDay < dailyTargetProteinG * 0.68) {
      friction.push(
        "Protein averaged under your goal—earlier-in-the-day sources are usually easier to keep than late catch-ups.",
      );
    }
  }

  if (
    weekendAvgKcal != null &&
    weekdayAvgKcal != null &&
    weekdayAvgKcal > 0 &&
    weekendAvgKcal > weekdayAvgKcal + 220
  ) {
    friction.push(
      "Weekend days ran higher in calories than weekdays—fine if that was the plan; worth noticing if it was not.",
    );
  }

  if (daysWithLogs > 0 && daysWithLogs < 4) {
    friction.push(
      "Logging showed up on fewer days—when you want more rhythm, one regular meal slot you actually log can help.",
    );
  }

  return {
    wins: wins.slice(0, 2),
    friction: friction.slice(0, 2),
  };
}
