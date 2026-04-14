import { prisma } from "@/lib/prisma";
import { queryMealTimingBands } from "@/lib/meals/meal-timing-bands-query";
import { isValidIanaTimeZone } from "@/lib/meals/validate-iana-time-zone";

const MAX_SINGLE_RANGE_MS = 49 * 60 * 60 * 1000;

type RangeInput = { from: string; to: string };

export function validateMealSummaryRange(fromRaw: string, toRaw: string): {
  ok: true;
  fromD: Date;
  toD: Date;
} | { ok: false; message: string } {
  const fromD = new Date(fromRaw);
  const toD = new Date(toRaw);
  if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) {
    return { ok: false, message: "Invalid from or to date" };
  }
  if (toD <= fromD) {
    return { ok: false, message: "to must be after from" };
  }
  if (toD.getTime() - fromD.getTime() > MAX_SINGLE_RANGE_MS) {
    return { ok: false, message: "Range too large for one slot" };
  }
  return { ok: true, fromD, toD };
}

export type MealSummaryBatchOk = {
  ok: true;
  mealCount: number;
  totals: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sodium_mg: number;
    sugar_g: number;
    added_sugar_g?: number | null;
  };
  timing?: {
    morning_kcal: number;
    midday_kcal: number;
    evening_kcal: number;
    late_night_kcal: number;
    total_kcal: number;
  };
  drivers: {
    kcal?: { rawInput: string; value: number };
    sodium?: { rawInput: string; value: number };
    sugar?: { rawInput: string; value: number };
    protein?: { rawInput: string; value: number };
  };
  hydrationTotalMl?: number;
};

export type MealSummaryBatchRow =
  | MealSummaryBatchOk
  | { ok: false; error: string };

export async function mealSummaryBatchForUser(
  userId: string,
  ranges: RangeInput[],
  body: {
    includeTiming: boolean;
    includeHydration: boolean;
    timeZone: string | null;
  },
): Promise<{ results: MealSummaryBatchRow[] }> {
  const includeTiming = body.includeTiming === true;
  const includeHydration = body.includeHydration !== false;
  const timeZone =
    typeof body.timeZone === "string" && isValidIanaTimeZone(body.timeZone)
      ? body.timeZone
      : null;

  const results = await Promise.all(
    ranges.map(async (r) => {
      const v = validateMealSummaryRange(r.from, r.to);
      if (!v.ok) {
        return { ok: false as const, error: v.message };
      }
      const { fromD, toD } = v;
      try {
        const [agg, fluidAgg] = await Promise.all([
          prisma.meal.aggregate({
            where: {
              userId,
              createdAt: { gte: fromD, lt: toD },
            },
            _sum: {
              totalKcal: true,
              totalProteinG: true,
              totalCarbsG: true,
              totalFatG: true,
              totalFiberG: true,
              totalSodiumMg: true,
              totalSugarG: true,
              totalAddedSugarG: true,
            },
            _count: { _all: true },
          }),
          includeHydration
            ? prisma.fluidLog.aggregate({
                where: {
                  userId,
                  loggedAt: { gte: fromD, lt: toD },
                },
                _sum: { volumeMl: true },
              })
            : Promise.resolve({ _sum: { volumeMl: null } }),
        ]);

        const hydrationTotalMl = includeHydration
          ? Math.round(Number(fluidAgg._sum.volumeMl ?? 0) * 10) / 10
          : undefined;

        const kcal = Number(agg._sum.totalKcal ?? 0);
        const protein_g = Number(agg._sum.totalProteinG ?? 0);
        const carbs_g = Number(agg._sum.totalCarbsG ?? 0);
        const fat_g = Number(agg._sum.totalFatG ?? 0);
        const fiber_g = Number(agg._sum.totalFiberG ?? 0);
        const sodium_mg = Number(agg._sum.totalSodiumMg ?? 0);
        const sugar_g = Number(agg._sum.totalSugarG ?? 0);
        const addedSugarSum = agg._sum.totalAddedSugarG;
        const added_sugar_g =
          addedSugarSum != null
            ? Math.round(Number(addedSugarSum) * 10) / 10
            : null;

        const drivers: MealSummaryBatchOk["drivers"] = {};

        if (agg._count._all > 0) {
          const [topKcal, topSodium, topSugar, topProtein] = await Promise.all([
            prisma.meal.findFirst({
              where: { userId, createdAt: { gte: fromD, lt: toD } },
              orderBy: { totalKcal: "desc" },
              select: { rawInput: true, totalKcal: true },
            }),
            prisma.meal.findFirst({
              where: { userId, createdAt: { gte: fromD, lt: toD } },
              orderBy: { totalSodiumMg: "desc" },
              select: { rawInput: true, totalSodiumMg: true },
            }),
            prisma.meal.findFirst({
              where: { userId, createdAt: { gte: fromD, lt: toD } },
              orderBy: { totalSugarG: "desc" },
              select: { rawInput: true, totalSugarG: true },
            }),
            prisma.meal.findFirst({
              where: { userId, createdAt: { gte: fromD, lt: toD } },
              orderBy: { totalProteinG: "desc" },
              select: { rawInput: true, totalProteinG: true },
            }),
          ]);

          if (topKcal) {
            drivers.kcal = {
              rawInput: topKcal.rawInput,
              value: Number(topKcal.totalKcal),
            };
          }
          if (topSodium) {
            drivers.sodium = {
              rawInput: topSodium.rawInput,
              value: Number(topSodium.totalSodiumMg),
            };
          }
          if (topSugar) {
            drivers.sugar = {
              rawInput: topSugar.rawInput,
              value: Number(topSugar.totalSugarG),
            };
          }
          if (topProtein && Number(topProtein.totalProteinG ?? 0) > 0) {
            drivers.protein = {
              rawInput: topProtein.rawInput,
              value: Number(topProtein.totalProteinG),
            };
          }
        }

        let timing: MealSummaryBatchOk["timing"] | undefined;
        if (includeTiming && timeZone) {
          const br = await queryMealTimingBands(userId, fromD, toD, timeZone);
          if (br) {
            timing = {
              morning_kcal: br.morning_kcal,
              midday_kcal: br.midday_kcal,
              evening_kcal: br.evening_kcal,
              late_night_kcal: br.late_night_kcal,
              total_kcal: br.total_kcal,
            };
          }
        }

        return {
          ok: true as const,
          mealCount: agg._count._all,
          totals: {
            kcal: Math.round(kcal * 10) / 10,
            protein_g: Math.round(protein_g * 10) / 10,
            carbs_g: Math.round(carbs_g * 10) / 10,
            fat_g: Math.round(fat_g * 10) / 10,
            fiber_g: Math.round(fiber_g * 10) / 10,
            sodium_mg: Math.round(sodium_mg),
            sugar_g: Math.round(sugar_g * 10) / 10,
            ...(added_sugar_g != null ? { added_sugar_g } : {}),
          },
          ...(timing ? { timing } : {}),
          drivers,
          ...(hydrationTotalMl !== undefined ? { hydrationTotalMl } : {}),
        };
      } catch {
        return { ok: false as const, error: "Query failed" };
      }
    }),
  );

  return { results };
}
