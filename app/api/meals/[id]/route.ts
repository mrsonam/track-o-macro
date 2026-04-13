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

function invalidIdResponse() {
  return NextResponse.json({ error: "Invalid meal id" }, { status: 400 });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return invalidIdResponse();
  }

  try {
    const result = await prisma.meal.deleteMany({
      where: { id, userId: session.user.id },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
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
}

export async function PATCH(request: Request, context: RouteContext) {
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

  let body: { rawInput?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawInput = body.rawInput?.trim();
  if (!rawInput) {
    return NextResponse.json({ error: "rawInput is required" }, { status: 400 });
  }

  const existing = await prisma.meal.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Meal not found" }, { status: 404 });
  }

  try {
    const userFoods = await loadUserFoodsForResolve(userId);
    const analyzed = await analyzeMealText(rawInput, { userFoods });
    const { lines, meal_label, assumptions, totals } = analyzed;

    await prisma.$transaction(async (tx) => {
      await tx.mealLineItem.deleteMany({ where: { mealId: id } });
      await tx.meal.update({
        where: { id },
        data: {
          rawInput,
          totalKcal: totals.kcal,
          totalProteinG: totals.protein_g,
          totalCarbsG: totals.carbs_g,
          totalFatG: totals.fat_g,
          totalFiberG: totals.fiber_g,
          totalSodiumMg: totals.sodium_mg,
          totalSugarG: totals.sugar_g,
          lineItems: {
            create: prismaLineCreates(lines, meal_label, assumptions ?? null),
          },
        },
      });
    });

    return NextResponse.json({
      mealId: id,
      meal_label,
      assumptions,
      lines,
      totals,
    });
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
}
