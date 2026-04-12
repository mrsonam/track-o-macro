import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isOnboardingComplete } from "@/lib/profile/require-onboarding";
import { analyzeMealText } from "@/lib/meals/analyze-meal-text";
import { loadUserFoodsForResolve } from "@/lib/meals/load-user-foods";
import { prismaLineCreates } from "@/lib/meals/line-items-create";
import { isDbUnavailableError } from "@/lib/db-errors";

export const maxDuration = 60;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_RAW = 8000;

function invalidIdResponse() {
  return NextResponse.json({ error: "Invalid meal id" }, { status: 400 });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let onboardingComplete: boolean;
  try {
    onboardingComplete = await isOnboardingComplete(userId);
  } catch (e) {
    if (isDbUnavailableError(e)) {
      return NextResponse.json(
        {
          error: "Database temporarily unavailable",
          code: "DATABASE_UNAVAILABLE",
        },
        { status: 503 },
      );
    }
    throw e;
  }

  if (!onboardingComplete) {
    return NextResponse.json(
      { error: "Complete onboarding first", code: "ONBOARDING_REQUIRED" },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return invalidIdResponse();
  }

  let body: { partA?: string; partB?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const partA = body.partA?.trim();
  const partB = body.partB?.trim();
  if (!partA || !partB) {
    return NextResponse.json(
      { error: "partA and partB are required" },
      { status: 400 },
    );
  }
  if (partA.length > MAX_RAW || partB.length > MAX_RAW) {
    return NextResponse.json({ error: "Meal text is too long" }, { status: 400 });
  }

  const existing = await prisma.meal.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Meal not found" }, { status: 404 });
  }

  let analyzedA: Awaited<ReturnType<typeof analyzeMealText>>;
  let analyzedB: Awaited<ReturnType<typeof analyzeMealText>>;
  try {
    const userFoods = await loadUserFoodsForResolve(userId);
    analyzedA = await analyzeMealText(partA, { userFoods });
    analyzedB = await analyzeMealText(partB, { userFoods });
  } catch (e) {
    if (isDbUnavailableError(e)) {
      return NextResponse.json(
        {
          error: "Database temporarily unavailable",
          code: "DATABASE_UNAVAILABLE",
        },
        { status: 503 },
      );
    }
    const message = e instanceof Error ? e.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const {
    lines: linesA,
    meal_label: labelA,
    assumptions: assA,
    totals: totalsA,
  } = analyzedA;
  const {
    lines: linesB,
    meal_label: labelB,
    assumptions: assB,
    totals: totalsB,
  } = analyzedB;

  try {
    const out = await prisma.$transaction(async (tx) => {
      const mealA = await tx.meal.create({
        data: {
          userId,
          rawInput: partA,
          totalKcal: totalsA.kcal,
          totalProteinG: totalsA.protein_g,
          totalCarbsG: totalsA.carbs_g,
          totalFatG: totalsA.fat_g,
          lineItems: {
            create: prismaLineCreates(linesA, labelA, assA ?? null),
          },
        },
        select: { id: true },
      });
      const mealB = await tx.meal.create({
        data: {
          userId,
          rawInput: partB,
          totalKcal: totalsB.kcal,
          totalProteinG: totalsB.protein_g,
          totalCarbsG: totalsB.carbs_g,
          totalFatG: totalsB.fat_g,
          lineItems: {
            create: prismaLineCreates(linesB, labelB, assB ?? null),
          },
        },
        select: { id: true },
      });
      const del = await tx.meal.deleteMany({ where: { id, userId } });
      if (del.count !== 1) {
        throw new Error("Meal changed while splitting");
      }
      return { mealAId: mealA.id, mealBId: mealB.id };
    });

    return NextResponse.json(out);
  } catch (e) {
    if (e instanceof Error && e.message === "Meal changed while splitting") {
      return NextResponse.json(
        { error: "Could not split — meal may have been deleted." },
        { status: 409 },
      );
    }
    if (isDbUnavailableError(e)) {
      return NextResponse.json(
        {
          error: "Database temporarily unavailable",
          code: "DATABASE_UNAVAILABLE",
        },
        { status: 503 },
      );
    }
    throw e;
  }
}
