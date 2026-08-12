import { Prisma, type PrismaClient } from "@prisma/client";
import { DEMO_PREPARED_MEALS, type PreparedMealKey } from "@/lib/demo/constants";
import { round1, type DemoDayPlan } from "@/lib/demo/generate-day";

export type PersistDemoDayParams = {
  userId: string;
  date: Date;
  day: DemoDayPlan;
  weightKg: number | null;
  preparedMealIds: Record<PreparedMealKey, string>;
};

/** Writes one generated demo day (meals, fluids, optional weight) to the database. Additive only. */
export async function persistDemoDay(
  prisma: PrismaClient,
  { userId, date, day, weightKg, preparedMealIds }: PersistDemoDayParams,
): Promise<void> {
  for (const meal of day.meals) {
    const at = new Date(date);
    at.setUTCHours(meal.hour, meal.minute, 0, 0);
    const totalKcal = meal.lines.reduce((s, l) => s + l.kcal, 0);
    const totalProteinG = meal.lines.reduce((s, l) => s + l.proteinG, 0);
    const totalCarbsG = meal.lines.reduce((s, l) => s + l.carbsG, 0);
    const totalFatG = meal.lines.reduce((s, l) => s + l.fatG, 0);
    const totalFiberG = meal.lines.reduce((s, l) => s + l.fiberG, 0);
    const totalSodiumMg = meal.lines.reduce((s, l) => s + l.sodiumMg, 0);
    const totalSugarG = meal.lines.reduce((s, l) => s + l.sugarG, 0);

    await prisma.meal.create({
      data: {
        userId,
        rawInput: meal.rawInput,
        totalKcal: new Prisma.Decimal(round1(totalKcal)),
        totalProteinG: new Prisma.Decimal(round1(totalProteinG)),
        totalCarbsG: new Prisma.Decimal(round1(totalCarbsG)),
        totalFatG: new Prisma.Decimal(round1(totalFatG)),
        totalFiberG: new Prisma.Decimal(round1(totalFiberG)),
        totalSodiumMg: new Prisma.Decimal(Math.round(totalSodiumMg)),
        totalSugarG: new Prisma.Decimal(round1(totalSugarG)),
        createdAt: at,
        lineItems: {
          create: meal.lines.map((l) => ({
            label: l.label,
            kcal: new Prisma.Decimal(l.kcal),
            proteinG: new Prisma.Decimal(l.proteinG),
            carbsG: new Prisma.Decimal(l.carbsG),
            fatG: new Prisma.Decimal(l.fatG),
            fiberG: new Prisma.Decimal(l.fiberG),
            sodiumMg: new Prisma.Decimal(l.sodiumMg),
            sugarG: new Prisma.Decimal(l.sugarG),
            source: "estimate",
            detail: Prisma.JsonNull,
          })),
        },
      },
    });
  }

  if (day.preparedPortion) {
    const { preparedMealKey, portionGrams, hour, minute } = day.preparedPortion;
    const batch = DEMO_PREPARED_MEALS[preparedMealKey];
    const preparedMealId = preparedMealIds[preparedMealKey];
    const ratio = portionGrams / batch.preparedGrams;
    const kcal = round1(batch.batchTotalKcal * ratio);
    const proteinG = round1(batch.batchTotalProteinG * ratio);
    const carbsG = round1(batch.batchTotalCarbsG * ratio);
    const fatG = round1(batch.batchTotalFatG * ratio);
    const fiberG = round1(batch.batchTotalFiberG * ratio);
    const sodiumMg = Math.round(batch.batchTotalSodiumMg * ratio);
    const sugarG = round1(batch.batchTotalSugarG * ratio);
    const label = `${batch.title} (${Math.round(portionGrams)}g portion)`;
    const at = new Date(date);
    at.setUTCHours(hour, minute, 0, 0);

    await prisma.meal.create({
      data: {
        userId,
        rawInput: `${label}, prepared batch (${Math.round(batch.preparedGrams)}g total)`,
        totalKcal: new Prisma.Decimal(kcal),
        totalProteinG: new Prisma.Decimal(proteinG),
        totalCarbsG: new Prisma.Decimal(carbsG),
        totalFatG: new Prisma.Decimal(fatG),
        totalFiberG: new Prisma.Decimal(fiberG),
        totalSodiumMg: new Prisma.Decimal(sodiumMg),
        totalSugarG: new Prisma.Decimal(sugarG),
        createdAt: at,
        lineItems: {
          create: [
            {
              label,
              quantity: new Prisma.Decimal(portionGrams),
              unit: "g",
              kcal: new Prisma.Decimal(kcal),
              proteinG: new Prisma.Decimal(proteinG),
              carbsG: new Prisma.Decimal(carbsG),
              fatG: new Prisma.Decimal(fatG),
              fiberG: new Prisma.Decimal(fiberG),
              sodiumMg: new Prisma.Decimal(sodiumMg),
              sugarG: new Prisma.Decimal(sugarG),
              source: "custom",
              detail: {
                kind: "prepared_meal_portion",
                preparedMealId,
                portionGrams,
                preparedGrams: batch.preparedGrams,
                batchTitle: batch.title,
              },
            },
          ],
        },
      },
    });
  }

  for (const fluid of day.fluids) {
    const at = new Date(date);
    at.setUTCHours(fluid.hour, fluid.minute, 0, 0);
    await prisma.fluidLog.create({
      data: {
        userId,
        volumeMl: new Prisma.Decimal(fluid.volumeMl),
        kind: fluid.kind,
        note: fluid.note,
        loggedAt: at,
      },
    });
  }

  if (weightKg != null) {
    const at = new Date(date);
    at.setUTCHours(7, 15, 0, 0);
    await prisma.weightLog.create({
      data: { userId, weightKg: new Prisma.Decimal(weightKg), loggedAt: at },
    });
    await prisma.userProfile.update({
      where: { userId },
      data: { weightKg: new Prisma.Decimal(weightKg) },
    });
  }
}
