import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { OnboardingDraft } from "@/lib/profile/types";
import { buildTargetsFromDraft } from "@/lib/profile/build-targets-from-draft";
import { computeTargets } from "@/lib/profile/compute-profile-targets";
import type { GoalPace } from "@/lib/nutrition/tdee";
import { parseFoodAvoidList } from "@/lib/profile/preferences";

const draftSchema = z
  .object({
    onboardingFlowVersion: z.number().int().min(0).max(20).optional(),
    experience: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    goal: z.enum(["lose", "maintain", "gain"]).optional(),
    goalPace: z.enum(["gentle", "moderate", "aggressive"]).optional(),
    heightCm: z.number().min(80).max(250).optional(),
    weightKg: z.number().min(25).max(400).optional(),
    age: z.number().int().min(13).max(120).optional(),
    sex: z.enum(["male", "female", "unspecified"]).optional(),
    activityLevel: z
      .enum(["sedentary", "light", "moderate", "active", "very_active"])
      .optional(),
    loggingStyle: z
      .enum(["quick_estimates", "weigh_often", "mixed"])
      .optional(),
    dietaryPattern: z
      .enum([
        "omnivore",
        "vegetarian",
        "vegan",
        "pescatarian",
        "prefer_not_say",
      ])
      .optional(),
    foodAvoidText: z.string().max(2000).optional(),
    safetyAcknowledged: z.boolean().optional(),
    manualTargetKcal: z.number().min(800).max(10000).optional(),
    proteinGPerKg: z.number().min(0.5).max(4).optional(),
  })
  .partial();

const patchBodySchema = z.object({
  onboardingStep: z.number().int().min(0).max(30).optional(),
  draft: draftSchema.optional(),
  complete: z.boolean().optional(),
  heightCm: z.number().min(80).max(250).optional(),
  weightKg: z.number().min(25).max(400).optional(),
  age: z.number().int().min(13).max(120).optional(),
  sex: z.enum(["male", "female", "unspecified"]).optional(),
  activityLevel: z
    .enum(["sedentary", "light", "moderate", "active", "very_active"])
    .optional(),
  goalIntent: z.enum(["lose", "maintain", "gain"]).optional(),
  goalPace: z.enum(["gentle", "moderate", "aggressive"]).optional().nullable(),
  targetProteinG: z.number().min(20).max(500).optional().nullable(),
  loggingStyle: z
    .enum(["quick_estimates", "weigh_often", "mixed"])
    .optional()
    .nullable(),
  dietaryPattern: z
    .enum([
      "omnivore",
      "vegetarian",
      "vegan",
      "pescatarian",
      "prefer_not_say",
    ])
    .optional()
    .nullable(),
  foodAvoidList: z.array(z.string().max(48)).max(15).optional().nullable(),
  weeklyCoachingFocus: z
    .enum(["protein", "vegetables", "hydration", "steady_calories"])
    .optional()
    .nullable(),
  /** Epic 5 — optional user if–then plan shown on week cards */
  weeklyImplementationIntention: z.string().max(320).optional().nullable(),
  /** Epic 5 — recovery-friendly “active days in last 14” on home / trends */
  activeDays14Enabled: z.boolean().optional(),
  /** Epic 6 — optional smoothed weight sparkline on home body card */
  weightTrendOnHomeEnabled: z.boolean().optional(),
  /** Epic 6 — optional target weight (kg) for chart reference line */
  goalWeightKg: z.number().min(25).max(400).optional().nullable(),
  unitSystem: z.enum(["metric", "imperial"]).optional(),
  targetKcal: z.number().min(800).max(10000).optional().nullable(),
  /** Daily fluid goal (ml); null clears to app default */
  targetHydrationMl: z.number().int().min(500).max(8000).optional().nullable(),
});

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const existing = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  });

  const prevDraft = (existing?.draft ?? {}) as OnboardingDraft;
  const mergedDraft: OnboardingDraft = {
    ...prevDraft,
    ...(data.draft ?? {}),
  };

  const nextStep =
    data.onboardingStep !== undefined
      ? data.onboardingStep
      : (existing?.onboardingStep ?? 0);

  if (data.complete) {
    if (!mergedDraft.safetyAcknowledged) {
      return NextResponse.json(
        {
          error:
            "Please read and confirm the safety information before finishing setup.",
        },
        { status: 400 },
      );
    }

    if (!mergedDraft.loggingStyle || !mergedDraft.dietaryPattern) {
      return NextResponse.json(
        {
          error:
            "Please complete food and logging preferences before finishing setup.",
        },
        { status: 400 },
      );
    }

    const targets = buildTargetsFromDraft(mergedDraft);
    if (!targets) {
      return NextResponse.json(
        {
          error:
            "Missing height, weight, age, sex, activity, or goal — cannot compute calorie target.",
        },
        { status: 400 },
      );
    }

    const proteinDec =
      targets.targetProteinG != null
        ? new Prisma.Decimal(targets.targetProteinG)
        : null;

    const avoidParsed = parseFoodAvoidList(mergedDraft.foodAvoidText ?? "");
    const foodAvoidJson =
      avoidParsed.length > 0 ? avoidParsed : Prisma.JsonNull;

    const draftFinal = {
      ...mergedDraft,
      onboardingFlowVersion: 3,
    };

    const profile = await prisma.userProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        onboardingStep: nextStep,
        draft: draftFinal,
        onboardingCompletedAt: new Date(),
        heightCm: new Prisma.Decimal(mergedDraft.heightCm!),
        weightKg: new Prisma.Decimal(mergedDraft.weightKg!),
        age: mergedDraft.age!,
        sex: mergedDraft.sex!,
        activityLevel: mergedDraft.activityLevel!,
        goalIntent: mergedDraft.goal!,
        goalPace: targets.goalPaceForDb,
        targetProteinG: proteinDec,
        loggingStyle: mergedDraft.loggingStyle,
        dietaryPattern: mergedDraft.dietaryPattern,
        foodAvoidJson,
        bmrKcal: new Prisma.Decimal(targets.bmrKcal),
        tdeeKcal: new Prisma.Decimal(targets.tdeeKcal),
        targetKcal: new Prisma.Decimal(targets.targetKcal),
      },
      update: {
        onboardingStep: nextStep,
        draft: draftFinal,
        onboardingCompletedAt: new Date(),
        heightCm: new Prisma.Decimal(mergedDraft.heightCm!),
        weightKg: new Prisma.Decimal(mergedDraft.weightKg!),
        age: mergedDraft.age!,
        sex: mergedDraft.sex!,
        activityLevel: mergedDraft.activityLevel!,
        goalIntent: mergedDraft.goal!,
        goalPace: targets.goalPaceForDb,
        targetProteinG: proteinDec,
        loggingStyle: mergedDraft.loggingStyle,
        dietaryPattern: mergedDraft.dietaryPattern,
        foodAvoidJson,
        bmrKcal: new Prisma.Decimal(targets.bmrKcal),
        tdeeKcal: new Prisma.Decimal(targets.tdeeKcal),
        targetKcal: new Prisma.Decimal(targets.targetKcal),
      },
    });
    return NextResponse.json({ profile });
  }

  const hasPreferenceFields =
    data.loggingStyle !== undefined ||
    data.dietaryPattern !== undefined ||
    data.foodAvoidList !== undefined;

  const hasSettingsFields =
    data.heightCm !== undefined ||
    data.weightKg !== undefined ||
    data.age !== undefined ||
    data.sex !== undefined ||
    data.activityLevel !== undefined ||
    data.goalIntent !== undefined ||
    data.goalPace !== undefined ||
    data.targetProteinG !== undefined ||
    data.targetHydrationMl !== undefined ||
    data.weeklyCoachingFocus !== undefined ||
    data.weeklyImplementationIntention !== undefined ||
    data.activeDays14Enabled !== undefined ||
    data.weightTrendOnHomeEnabled !== undefined ||
    data.goalWeightKg !== undefined ||
    data.unitSystem !== undefined ||
    hasPreferenceFields;

  if (hasSettingsFields) {
    const h =
      data.heightCm ??
      (existing?.heightCm != null ? Number(existing.heightCm) : undefined);
    const w =
      data.weightKg ??
      (existing?.weightKg != null ? Number(existing.weightKg) : undefined);
    const a = data.age ?? existing?.age ?? undefined;
    const s = data.sex ?? existing?.sex ?? undefined;
    const act = data.activityLevel ?? existing?.activityLevel ?? undefined;
    const g = data.goalIntent ?? existing?.goalIntent ?? undefined;
    const goalPaceToSave: string | null | undefined =
      g == null
        ? undefined
        : g === "maintain"
          ? null
          : (data.goalPace != null
              ? data.goalPace
              : (existing?.goalPace as string | null)) ?? "moderate";
    const paceForCompute: GoalPace | undefined =
      g === "maintain" || g == null
        ? undefined
        : (goalPaceToSave as GoalPace) ?? "moderate";

    let bmrKcal = existing?.bmrKcal ?? null;
    let tdeeKcal = existing?.tdeeKcal ?? null;
    let targetKcal = data.targetKcal !== undefined 
      ? (data.targetKcal ? new Prisma.Decimal(data.targetKcal) : null)
      : existing?.targetKcal ?? null;

    if (
      h != null &&
      w != null &&
      a != null &&
      s != null &&
      act != null &&
      g != null &&
      data.targetKcal === undefined // Only recompute if not providing a manual override
    ) {
      const t = computeTargets({
        heightCm: h,
        weightKg: w,
        age: a,
        sex: s as "male" | "female" | "unspecified",
        activityLevel: act as
          | "sedentary"
          | "light"
          | "moderate"
          | "active"
          | "very_active",
        goalIntent: g as "lose" | "maintain" | "gain",
        goalPace: paceForCompute,
      });
      bmrKcal = new Prisma.Decimal(t.bmrKcal);
      tdeeKcal = new Prisma.Decimal(t.tdeeKcal);
      targetKcal = new Prisma.Decimal(t.targetKcal);
    }

    let nextTargetProtein: Prisma.Decimal | null | undefined;
    if (data.targetProteinG !== undefined) {
      nextTargetProtein =
        data.targetProteinG == null
          ? null
          : new Prisma.Decimal(data.targetProteinG);
    }

    let nextTargetHydrationMl: number | null | undefined;
    if (data.targetHydrationMl !== undefined) {
      nextTargetHydrationMl = data.targetHydrationMl;
    }

    let nextLoggingStyle: string | null | undefined;
    if (data.loggingStyle !== undefined) {
      nextLoggingStyle = data.loggingStyle;
    }

    let nextDietaryPattern: string | null | undefined;
    if (data.dietaryPattern !== undefined) {
      nextDietaryPattern = data.dietaryPattern;
    }

    let nextFoodAvoidJson: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
    if (data.foodAvoidList !== undefined) {
      nextFoodAvoidJson =
        data.foodAvoidList == null || data.foodAvoidList.length === 0
          ? Prisma.JsonNull
          : data.foodAvoidList;
    }

    let nextWeeklyCoachingFocus: string | null | undefined;
    if (data.weeklyCoachingFocus !== undefined) {
      nextWeeklyCoachingFocus = data.weeklyCoachingFocus;
    }

    let nextWeeklyImplementationIntention: string | null | undefined;
    if (data.weeklyImplementationIntention !== undefined) {
      const t = data.weeklyImplementationIntention?.trim();
      nextWeeklyImplementationIntention = t ? t : null;
    }

    const profile = await prisma.userProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        onboardingStep: nextStep,
        draft: mergedDraft,
        heightCm: h != null ? new Prisma.Decimal(h) : undefined,
        weightKg: w != null ? new Prisma.Decimal(w) : undefined,
        age: a,
        sex: s,
        activityLevel: act,
        goalIntent: g,
        goalPace: goalPaceToSave ?? undefined,
        targetProteinG: nextTargetProtein ?? undefined,
        loggingStyle: nextLoggingStyle ?? undefined,
        dietaryPattern: nextDietaryPattern ?? undefined,
        foodAvoidJson: nextFoodAvoidJson ?? undefined,
        weeklyCoachingFocus: nextWeeklyCoachingFocus ?? undefined,
        ...(nextWeeklyImplementationIntention !== undefined
          ? { weeklyImplementationIntention: nextWeeklyImplementationIntention }
          : {}),
        ...(data.activeDays14Enabled !== undefined
          ? { activeDays14Enabled: data.activeDays14Enabled }
          : {}),
        ...(data.weightTrendOnHomeEnabled !== undefined
          ? { weightTrendOnHomeEnabled: data.weightTrendOnHomeEnabled }
          : {}),
        ...(data.goalWeightKg !== undefined
          ? {
              goalWeightKg:
                data.goalWeightKg == null
                  ? null
                  : new Prisma.Decimal(data.goalWeightKg),
            }
          : {}),
        ...(nextTargetHydrationMl !== undefined
          ? { targetHydrationMl: nextTargetHydrationMl }
          : {}),
        bmrKcal: bmrKcal ?? undefined,
        tdeeKcal: tdeeKcal ?? undefined,
        targetKcal: targetKcal ?? undefined,
        unitSystem: data.unitSystem ?? undefined,
      },
      update: {
        onboardingStep: nextStep,
        draft: mergedDraft,
        ...(h != null ? { heightCm: new Prisma.Decimal(h) } : {}),
        ...(w != null ? { weightKg: new Prisma.Decimal(w) } : {}),
        ...(a != null ? { age: a } : {}),
        ...(s != null ? { sex: s } : {}),
        ...(act != null ? { activityLevel: act } : {}),
        ...(g != null ? { goalIntent: g } : {}),
        ...(goalPaceToSave !== undefined ? { goalPace: goalPaceToSave } : {}),
        ...(nextTargetProtein !== undefined
          ? { targetProteinG: nextTargetProtein }
          : {}),
        ...(nextLoggingStyle !== undefined
          ? { loggingStyle: nextLoggingStyle }
          : {}),
        ...(nextDietaryPattern !== undefined
          ? { dietaryPattern: nextDietaryPattern }
          : {}),
        ...(nextFoodAvoidJson !== undefined
          ? { foodAvoidJson: nextFoodAvoidJson }
          : {}),
        ...(nextWeeklyCoachingFocus !== undefined
          ? { weeklyCoachingFocus: nextWeeklyCoachingFocus }
          : {}),
        ...(nextWeeklyImplementationIntention !== undefined
          ? { weeklyImplementationIntention: nextWeeklyImplementationIntention }
          : {}),
        ...(data.activeDays14Enabled !== undefined
          ? { activeDays14Enabled: data.activeDays14Enabled }
          : {}),
        ...(data.weightTrendOnHomeEnabled !== undefined
          ? { weightTrendOnHomeEnabled: data.weightTrendOnHomeEnabled }
          : {}),
        ...(data.goalWeightKg !== undefined
          ? {
              goalWeightKg:
                data.goalWeightKg == null
                  ? null
                  : new Prisma.Decimal(data.goalWeightKg),
            }
          : {}),
        ...(nextTargetHydrationMl !== undefined
          ? { targetHydrationMl: nextTargetHydrationMl }
          : {}),
        ...(data.unitSystem !== undefined ? { unitSystem: data.unitSystem } : {}),
        ...(bmrKcal != null ? { bmrKcal } : {}),
        ...(tdeeKcal != null ? { tdeeKcal } : {}),
        ...(targetKcal != null ? { targetKcal } : {}),
      },
    });
    return NextResponse.json({ profile });
  }

  const intentionFallback =
    data.weeklyImplementationIntention !== undefined
      ? data.weeklyImplementationIntention?.trim()
        ? data.weeklyImplementationIntention.trim()
        : null
      : undefined;

  const profile = await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      onboardingStep: nextStep,
      draft: mergedDraft,
      ...(data.weeklyCoachingFocus !== undefined
        ? { weeklyCoachingFocus: data.weeklyCoachingFocus }
        : {}),
      ...(intentionFallback !== undefined
        ? { weeklyImplementationIntention: intentionFallback }
        : {}),
      ...(data.activeDays14Enabled !== undefined
        ? { activeDays14Enabled: data.activeDays14Enabled }
        : {}),
      ...(data.weightTrendOnHomeEnabled !== undefined
        ? { weightTrendOnHomeEnabled: data.weightTrendOnHomeEnabled }
        : {}),
      ...(data.targetHydrationMl !== undefined
        ? { targetHydrationMl: data.targetHydrationMl }
        : {}),
    },
    update: {
      onboardingStep: nextStep,
      draft: mergedDraft,
      ...(data.weeklyCoachingFocus !== undefined
        ? { weeklyCoachingFocus: data.weeklyCoachingFocus }
        : {}),
      ...(intentionFallback !== undefined
        ? { weeklyImplementationIntention: intentionFallback }
        : {}),
      ...(data.activeDays14Enabled !== undefined
        ? { activeDays14Enabled: data.activeDays14Enabled }
        : {}),
      ...(data.weightTrendOnHomeEnabled !== undefined
        ? { weightTrendOnHomeEnabled: data.weightTrendOnHomeEnabled }
        : {}),
      ...(data.targetHydrationMl !== undefined
        ? { targetHydrationMl: data.targetHydrationMl }
        : {}),
    },
  });

  return NextResponse.json({ profile });
}
