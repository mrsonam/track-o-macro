/**
 * Seeds (or re-seeds) the public demo account: demo@trackomacro.app.
 * Wipes existing demo data and rebuilds 60 days of history ending today.
 *
 * Run: npm run seed:demo
 */

import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { subDays } from "date-fns";
import {
  DEMO_BACKFILL_DAYS,
  DEMO_EMAIL,
  DEMO_GOAL_WEIGHT_KG,
  DEMO_HEIGHT_CM,
  DEMO_PASSWORD,
  DEMO_PREPARED_MEALS,
  DEMO_PROFILE,
  DEMO_SAVED_MEALS,
  DEMO_START_WEIGHT_KG,
  type PreparedMealKey,
} from "@/lib/demo/constants";
import {
  generateDemoDay,
  shouldLogWeightOnDate,
  weightKgForBackfillDay,
} from "@/lib/demo/generate-day";
import { persistDemoDay } from "@/lib/demo/persist-day";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    create: { email: DEMO_EMAIL, passwordHash, isDemo: true },
    update: { passwordHash, isDemo: true },
  });
  const userId = user.id;

  await prisma.$transaction(async (tx) => {
    await tx.mealLineItem.deleteMany({ where: { meal: { userId } } });
    await tx.meal.deleteMany({ where: { userId } });
    await tx.fluidLog.deleteMany({ where: { userId } });
    await tx.weightLog.deleteMany({ where: { userId } });
    await tx.savedMeal.deleteMany({ where: { userId } });
    await tx.preparedMeal.deleteMany({ where: { userId } });
  });

  const now = new Date();

  await prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      onboardingCompletedAt: now,
      onboardingStep: 99,
      heightCm: new Prisma.Decimal(DEMO_HEIGHT_CM),
      weightKg: new Prisma.Decimal(DEMO_START_WEIGHT_KG),
      goalWeightKg: new Prisma.Decimal(DEMO_GOAL_WEIGHT_KG),
      age: DEMO_PROFILE.age,
      sex: DEMO_PROFILE.sex,
      activityLevel: DEMO_PROFILE.activityLevel,
      goalIntent: DEMO_PROFILE.goalIntent,
      goalPace: DEMO_PROFILE.goalPace,
      unitSystem: DEMO_PROFILE.unitSystem,
      targetKcal: new Prisma.Decimal(DEMO_PROFILE.targetKcal),
      targetProteinG: new Prisma.Decimal(DEMO_PROFILE.targetProteinG),
      loggingStyle: DEMO_PROFILE.loggingStyle,
      dietaryPattern: DEMO_PROFILE.dietaryPattern,
    },
    update: {
      onboardingCompletedAt: now,
      onboardingStep: 99,
      heightCm: new Prisma.Decimal(DEMO_HEIGHT_CM),
      goalWeightKg: new Prisma.Decimal(DEMO_GOAL_WEIGHT_KG),
      goalIntent: DEMO_PROFILE.goalIntent,
      goalPace: DEMO_PROFILE.goalPace,
      targetKcal: new Prisma.Decimal(DEMO_PROFILE.targetKcal),
      targetProteinG: new Prisma.Decimal(DEMO_PROFILE.targetProteinG),
    },
  });

  const preparedMealIds = {} as Record<PreparedMealKey, string>;
  for (const key of Object.keys(DEMO_PREPARED_MEALS) as PreparedMealKey[]) {
    const batch = DEMO_PREPARED_MEALS[key];
    const created = await prisma.preparedMeal.create({
      data: {
        userId,
        title: batch.title,
        recipeRawInput: batch.recipeRawInput,
        preparedGrams: new Prisma.Decimal(batch.preparedGrams),
        batchTotalKcal: new Prisma.Decimal(batch.batchTotalKcal),
        batchTotalProteinG: new Prisma.Decimal(batch.batchTotalProteinG),
        batchTotalCarbsG: new Prisma.Decimal(batch.batchTotalCarbsG),
        batchTotalFatG: new Prisma.Decimal(batch.batchTotalFatG),
        batchTotalFiberG: new Prisma.Decimal(batch.batchTotalFiberG),
        batchTotalSodiumMg: new Prisma.Decimal(batch.batchTotalSodiumMg),
        batchTotalSugarG: new Prisma.Decimal(batch.batchTotalSugarG),
      },
    });
    preparedMealIds[key] = created.id;
  }

  for (const saved of DEMO_SAVED_MEALS) {
    await prisma.savedMeal.create({
      data: { userId, title: saved.title, rawInput: saved.rawInput },
    });
  }

  let lastWeightKg = DEMO_START_WEIGHT_KG;
  for (let dayIndex = 0; dayIndex < DEMO_BACKFILL_DAYS; dayIndex++) {
    const date = subDays(now, DEMO_BACKFILL_DAYS - 1 - dayIndex);
    date.setUTCHours(0, 0, 0, 0);

    const day = generateDemoDay(date);
    const weightKg = shouldLogWeightOnDate(date)
      ? weightKgForBackfillDay(dayIndex, DEMO_BACKFILL_DAYS)
      : null;
    if (weightKg != null) lastWeightKg = weightKg;

    await persistDemoDay(prisma, { userId, date, day, weightKg, preparedMealIds });
  }

  await prisma.userProfile.update({
    where: { userId },
    data: { weightKg: new Prisma.Decimal(lastWeightKg) },
  });

  console.log(
    `Done. ${DEMO_EMAIL}: seeded ${DEMO_BACKFILL_DAYS} days of history, ${
      Object.keys(preparedMealIds).length
    } prepared meals, ${DEMO_SAVED_MEALS.length} saved meals.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
