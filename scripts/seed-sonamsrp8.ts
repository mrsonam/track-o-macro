/**
 * One-off: clear meals / fluids / weight logs for sonamsrp8@gmail.com and seed ~30 days
 * of variable intake + macros, fluids, and weight 98kg → 93kg (goal 80kg, height 168cm).
 *
 * Run: npx tsx scripts/seed-sonamsrp8.ts
 */

import { Prisma, PrismaClient } from "@prisma/client";
import { subDays } from "date-fns";

const EMAIL = "sonamsrp8@gmail.com";

const START_WEIGHT_KG = 98;
const CURRENT_WEIGHT_KG = 93;
const GOAL_WEIGHT_KG = 80;
const HEIGHT_CM = 168;
const DAYS = 30;

const prisma = new PrismaClient();

function jitter(day: number, salt: number): number {
  const x = Math.sin(day * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function dayTargetKcal(dayIndex: number): number {
  const base = 1550 + Math.floor(jitter(dayIndex, 1) * 550);
  const wave = Math.sin((dayIndex / DAYS) * Math.PI * 2) * 120;
  return Math.round(Math.min(2400, Math.max(1250, base + wave)));
}

function splitMacros(kcal: number, salt: number): {
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
} {
  const pRatio = 0.22 + jitter(salt, 2) * 0.12;
  const cRatio = 0.38 + jitter(salt, 3) * 0.12;
  const fRatio = Math.max(0.18, 1 - pRatio - cRatio);
  return {
    proteinG: round1((kcal * pRatio) / 4),
    carbsG: round1((kcal * cRatio) / 4),
    fatG: round1((kcal * fRatio) / 9),
    fiberG: round1(6 + jitter(salt, 4) * 12),
  };
}

function weightOnDay(dayIndex: number): number {
  const t = dayIndex / (DAYS - 1);
  return round1(START_WEIGHT_KG + (CURRENT_WEIGHT_KG - START_WEIGHT_KG) * t);
}

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true },
  });

  if (!user) {
    console.error(`No user found with email ${EMAIL}`);
    process.exit(1);
  }

  const userId = user.id;

  await prisma.$transaction(async (tx) => {
    await tx.mealLineItem.deleteMany({
      where: { meal: { userId } },
    });
    await tx.meal.deleteMany({ where: { userId } });
    await tx.fluidLog.deleteMany({ where: { userId } });
    await tx.weightLog.deleteMany({ where: { userId } });
    await tx.savedMeal.deleteMany({ where: { userId } });
  });

  const now = new Date();

  await prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      onboardingCompletedAt: now,
      onboardingStep: 99,
      heightCm: new Prisma.Decimal(HEIGHT_CM),
      weightKg: new Prisma.Decimal(CURRENT_WEIGHT_KG),
      age: 32,
      sex: "unspecified",
      activityLevel: "moderate",
      goalIntent: "lose",
      goalPace: "moderate",
      goalWeightKg: new Prisma.Decimal(GOAL_WEIGHT_KG),
      unitSystem: "metric",
      targetKcal: new Prisma.Decimal(1950),
      targetProteinG: new Prisma.Decimal(120),
      loggingStyle: "quick_estimates",
      dietaryPattern: "omnivore",
    },
    update: {
      heightCm: new Prisma.Decimal(HEIGHT_CM),
      weightKg: new Prisma.Decimal(CURRENT_WEIGHT_KG),
      goalWeightKg: new Prisma.Decimal(GOAL_WEIGHT_KG),
      goalIntent: "lose",
      goalPace: "moderate",
      targetKcal: new Prisma.Decimal(1950),
      targetProteinG: new Prisma.Decimal(120),
    },
  });

  type LineIn = {
    label: string;
    kcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  };

  function buildMeal(
    userIdInner: string,
    rawInput: string,
    createdAt: Date,
    lines: LineIn[],
  ) {
    const totalKcal = lines.reduce((s, l) => s + l.kcal, 0);
    const totalProteinG = lines.reduce((s, l) => s + l.proteinG, 0);
    const totalCarbsG = lines.reduce((s, l) => s + l.carbsG, 0);
    const totalFatG = lines.reduce((s, l) => s + l.fatG, 0);
    const totalFiberG = lines.reduce((s, l) => s + l.fiberG, 0);

    return prisma.meal.create({
      data: {
        userId: userIdInner,
        rawInput,
        totalKcal: new Prisma.Decimal(round1(totalKcal)),
        totalProteinG: new Prisma.Decimal(round1(totalProteinG)),
        totalCarbsG: new Prisma.Decimal(round1(totalCarbsG)),
        totalFatG: new Prisma.Decimal(round1(totalFatG)),
        totalFiberG: new Prisma.Decimal(round1(totalFiberG)),
        totalSodiumMg: new Prisma.Decimal(
          Math.round(1400 + jitter(createdAt.getUTCDate(), 5) * 700),
        ),
        totalSugarG: new Prisma.Decimal(round1(18 + jitter(createdAt.getUTCDate(), 6) * 25)),
        createdAt,
        lineItems: {
          create: lines.map((l) => ({
            label: l.label,
            kcal: new Prisma.Decimal(l.kcal),
            proteinG: new Prisma.Decimal(l.proteinG),
            carbsG: new Prisma.Decimal(l.carbsG),
            fatG: new Prisma.Decimal(l.fatG),
            fiberG: new Prisma.Decimal(l.fiberG),
            sodiumMg: new Prisma.Decimal(Math.round(180 + l.kcal * 0.35)),
            sugarG: new Prisma.Decimal(round1(Math.max(0, l.kcal * 0.025))),
            source: "estimate",
            detail: Prisma.JsonNull,
          })),
        },
      },
    });
  }

  for (let dayIndex = 0; dayIndex < DAYS; dayIndex++) {
    const dayStart = subDays(now, DAYS - 1 - dayIndex);
    dayStart.setUTCHours(0, 0, 0, 0);

    const target = dayTargetKcal(dayIndex);
    const nMeals = jitter(dayIndex, 7) > 0.35 ? 3 : 2;

    const parts =
      nMeals === 3 ? [0.26, 0.36, 0.38] : [0.44, 0.56];

    const mealHours = nMeals === 3 ? [8, 12, 19] : [8, 18];

    for (let mi = 0; mi < nMeals; mi++) {
      const frac = parts[mi]!;
      let mealKcal = Math.round(target * frac);
      const hour = mealHours[mi]!;
      const createdAt = new Date(dayStart);
      createdAt.setUTCHours(hour, mi === 1 ? 20 : 10, 0, 0);

      const k1 = Math.round(mealKcal * 0.58);
      const k2 = mealKcal - k1;

      let label1: string;
      let label2: string;
      let rawLabel: string;

      if (nMeals === 3) {
        if (mi === 0) {
          rawLabel = "Breakfast";
          label1 = "Oatmeal, milk, banana, walnuts";
          label2 = "Espresso, orange juice";
        } else if (mi === 1) {
          rawLabel = "Lunch";
          label1 = "Grilled chicken breast, mixed greens, vinaigrette";
          label2 = "Brown rice, black beans";
        } else {
          rawLabel = "Dinner";
          label1 = "Salmon fillet, roasted potatoes, asparagus";
          label2 = "Greek yogurt, berries";
        }
      } else if (mi === 0) {
        rawLabel = "Breakfast";
        label1 = "Scrambled eggs, whole grain toast, avocado";
        label2 = "Latte, fruit";
      } else {
        rawLabel = "Dinner";
        label1 = "Lean beef stir-fry, jasmine rice, peppers";
        label2 = "Side salad, olive oil";
      }

      const macro1 = splitMacros(k1, dayIndex * 100 + mi * 10 + 1);
      const macro2 = splitMacros(k2, dayIndex * 100 + mi * 10 + 2);

      const lines: LineIn[] = [
        {
          label: label1,
          kcal: k1,
          proteinG: macro1.proteinG,
          carbsG: macro1.carbsG,
          fatG: macro1.fatG,
          fiberG: macro1.fiberG * 0.5,
        },
        {
          label: label2,
          kcal: k2,
          proteinG: macro2.proteinG,
          carbsG: macro2.carbsG,
          fatG: macro2.fatG,
          fiberG: macro2.fiberG * 0.5,
        },
      ];

      const rawInput = `${rawLabel}: ${label1}; ${label2}`;

      await buildMeal(userId, rawInput, createdAt, lines);
    }

    const fluidBase = 1600 + Math.floor(jitter(dayIndex, 13) * 900);
    const partsF = [0.42, 0.28, 0.22, 0.08];
    const kinds = ["water", "tea", "coffee", "water"] as const;
    for (let fi = 0; fi < 4; fi++) {
      const ml = Math.round(fluidBase * partsF[fi]!);
      if (ml < 40) continue;
      const t = new Date(dayStart);
      t.setUTCHours(7 + fi * 5, (fi + 1) * 7, 0, 0);
      await prisma.fluidLog.create({
        data: {
          userId,
          volumeMl: new Prisma.Decimal(ml),
          kind: kinds[fi]!,
          note: fi === 0 ? "Morning" : fi === 3 ? "Evening" : null,
          loggedAt: t,
        },
      });
    }

    const w = weightOnDay(dayIndex);
    const wt = new Date(dayStart);
    wt.setUTCHours(7, 15, 0, 0);
    await prisma.weightLog.create({
      data: {
        userId,
        weightKg: new Prisma.Decimal(w),
        loggedAt: wt,
      },
    });
  }

  console.log(
    `Done. ${EMAIL}: cleared meals/fluids/weights; seeded ${DAYS} days (2–3 meals/day, variable kcal). Profile ${HEIGHT_CM}cm, ${CURRENT_WEIGHT_KG}kg, goal ${GOAL_WEIGHT_KG}kg.`,
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
