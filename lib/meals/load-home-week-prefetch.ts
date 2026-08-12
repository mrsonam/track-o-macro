import { isDbUnavailableError } from "@/lib/db-errors";
import type { RollingWeekSummaryData } from "@/lib/meals/rolling-week-summary-data";
import type { MealDaySummary } from "@/lib/meals/meal-day-summary";
import { mealSummaryBatchForUser } from "@/lib/meals/meal-summary-batch-core";
import { computeRollingMealInsightsPayload } from "@/lib/meals/meal-insights-rolling-core";
import { parseRollingWeekInsightPayload } from "@/lib/meals/parse-rolling-week-insight-payload";
import { getRequestTimeZoneHeader } from "@/lib/meals/request-time-zone";
import {
  rolling7DateKeysInTimeZone,
  rolling7WindowBoundsUtcForZone,
  rolling14WindowBoundsUtcForZone,
  zonedDayBoundsIsoFromYmd,
} from "@/lib/meals/zoned-rolling-window";

export type HomeWeekPrefetch = {
  timeZone: string;
  dateKeys: string[];
  summariesByKey: Record<string, MealDaySummary | null>;
  weekInsights: RollingWeekSummaryData | null;
};

export async function loadHomeWeekPrefetch(
  userId: string,
  activeDays14Enabled: boolean,
): Promise<HomeWeekPrefetch | null> {
  try {
    const timeZone = await getRequestTimeZoneHeader();
    const dateKeys = rolling7DateKeysInTimeZone(timeZone);
    const ranges = dateKeys.map((k) => {
      const { fromIso, toIso } = zonedDayBoundsIsoFromYmd(k, timeZone);
      return { from: fromIso, to: toIso };
    });

    const { fromIso, toIso } = rolling7WindowBoundsUtcForZone(timeZone);
    const r14 = activeDays14Enabled ? rolling14WindowBoundsUtcForZone(timeZone) : null;

    // These three queries are independent of each other, so run them concurrently
    // instead of one after another; each round trip to the DB adds real latency.
    const [{ results }, insightJson, insight14Json] = await Promise.all([
      mealSummaryBatchForUser(userId, ranges, {
        includeTiming: true,
        includeHydration: true,
        includeMeals: true,
        timeZone,
      }),
      computeRollingMealInsightsPayload(
        userId,
        new Date(fromIso),
        new Date(toIso),
        7,
        timeZone,
      ),
      r14
        ? computeRollingMealInsightsPayload(
            userId,
            new Date(r14.fromIso),
            new Date(r14.toIso),
            14,
            timeZone,
          )
        : Promise.resolve(null),
    ]);

    const summariesByKey: Record<string, MealDaySummary | null> = {};
    dateKeys.forEach((k, i) => {
      const r = results[i];
      if (!r || !("ok" in r) || !r.ok) {
        summariesByKey[k] = null;
        return;
      }
      summariesByKey[k] = {
        mealCount: r.mealCount,
        totals: r.totals,
        ...(r.timing ? { timing: r.timing } : {}),
        ...(r.drivers ? { drivers: r.drivers } : {}),
        ...(typeof r.hydrationTotalMl === "number"
          ? { hydrationTotalMl: r.hydrationTotalMl }
          : {}),
        ...(r.appleHealth ? { appleHealth: r.appleHealth } : {}),
        ...(r.meals ? { meals: r.meals } : {}),
      };
    });

    let weekInsights = parseRollingWeekInsightPayload(insightJson);

    if (weekInsights && insight14Json) {
      const dw = Number(insight14Json.daysWithLogs);
      if (Number.isFinite(dw)) {
        weekInsights = {
          ...weekInsights,
          recovery14: { daysWithLogs: dw, daysInWindow: 14 },
        };
      }
    }

    return {
      timeZone,
      dateKeys,
      summariesByKey,
      weekInsights,
    };
  } catch (e) {
    if (isDbUnavailableError(e)) {
      throw e;
    }
    return null;
  }
}
