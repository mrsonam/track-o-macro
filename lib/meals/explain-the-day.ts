import type { MealDaySummary } from "@/lib/meals/meal-day-summary";
import {
  proteinDistributionLine,
  whatDroveDayLine,
} from "@/lib/meals/pattern-insights-copy";
import { dayMealTimingLines } from "@/lib/meals/meal-timing-copy";

type ExplainInput = {
  summary: MealDaySummary;
  totalKcal: number;
  dailyTargetKcal: number | null;
  dailyTargetProteinG: number | null;
};

/**
 * Richer, non-judgmental blurbs for the day card (targets, drivers, micros, timing).
 * Capped at five lines so the UI stays scannable.
 */
export function explainTheDayLines(input: ExplainInput): string[] {
  const { summary, totalKcal, dailyTargetKcal, dailyTargetProteinG } = input;
  const lines: string[] = [];

  const drove = whatDroveDayLine({
    mealCount: summary.mealCount,
    drivers: summary.drivers,
    totalKcal,
  });
  if (drove) lines.push(drove);

  const p = summary.totals.protein_g ?? 0;
  const proteinDist = proteinDistributionLine({
    mealCount: summary.mealCount,
    drivers: summary.drivers,
    totalProteinG: p,
  });
  if (proteinDist) lines.push(proteinDist);

  const pt = dailyTargetProteinG;
  if (pt != null && pt > 0 && p > 0) {
    const pct = (100 * p) / pt;
    if (pct >= 88 && pct <= 118) {
      lines.push(
        `Protein came in close to your ${Math.round(pt)} g guide (${Math.round(p)} g logged).`,
      );
    } else if (pct < 75) {
      lines.push(
        `Protein was under your usual ${Math.round(pt)} g guide (${Math.round(p)} g) — easy to adjust another day.`,
      );
    } else if (pct > 128) {
      lines.push(
        `Protein ran above your ${Math.round(pt)} g guide (${Math.round(p)} g logged).`,
      );
    }
  }

  const fiber = summary.totals.fiber_g ?? 0;
  if (fiber > 0 && fiber < 18) {
    lines.push(
      `Fiber from logged items was modest (${Math.round(fiber)} g) — whole grains or veg can lift it when you want.`,
    );
  } else if (fiber >= 28) {
    lines.push(
      `Fiber from logged items was solid (${Math.round(fiber)} g).`,
    );
  }

  const sug = summary.totals.sugar_g ?? 0;
  const add = summary.totals.added_sugar_g;
  if (add != null && sug > 0) {
    lines.push(
      `Sugars: about ${Math.round(sug)} g total, including ~${Math.round(add)} g as added sugars where USDA listed them.`,
    );
  } else if (sug > 30 && add == null) {
    lines.push(
      `Total sugars from logged items were about ${Math.round(sug)} g (added sugars were not listed separately on these lines).`,
    );
  }

  const tk = dailyTargetKcal;
  if (tk != null && tk > 0 && totalKcal > 0) {
    const gap = totalKcal - tk;
    if (Math.abs(gap) < tk * 0.06) {
      lines.push(`Calories landed near your ${Math.round(tk)} kcal target for the day.`);
    }
  }

  if (summary.timing && summary.timing.total_kcal > 0) {
    lines.push(
      ...dayMealTimingLines({
        bands: summary.timing,
        mealCount: summary.mealCount,
      }),
    );
  }

  return lines.filter(Boolean).slice(0, 5);
}
