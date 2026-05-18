import { prisma } from "@/lib/prisma";
import {
  mapMealToDayPreview,
  type DayMealPreview,
} from "@/lib/meals/day-meal-preview";

type RangeSlot = { index: number; fromD: Date; toD: Date };

/**
 * One query for all meals in the union of day windows, then bucket by range index.
 * Rolling week slots do not overlap.
 */
export async function loadMealsForRanges(
  userId: string,
  slots: RangeSlot[],
): Promise<Map<number, DayMealPreview[]>> {
  const byIndex = new Map<number, DayMealPreview[]>();
  if (slots.length === 0) return byIndex;

  for (const { index } of slots) {
    byIndex.set(index, []);
  }

  let minFrom = slots[0]!.fromD;
  let maxTo = slots[0]!.toD;
  for (const { fromD, toD } of slots) {
    if (fromD < minFrom) minFrom = fromD;
    if (toD > maxTo) maxTo = toD;
  }

  const rows = await prisma.meal.findMany({
    where: {
      userId,
      createdAt: { gte: minFrom, lt: maxTo },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rawInput: true,
      totalKcal: true,
      totalProteinG: true,
      createdAt: true,
    },
  });

  for (const row of rows) {
    const t = row.createdAt.getTime();
    const meal = mapMealToDayPreview(row);
    for (const { index, fromD, toD } of slots) {
      if (t >= fromD.getTime() && t < toD.getTime()) {
        byIndex.get(index)!.push(meal);
        break;
      }
    }
  }

  return byIndex;
}
