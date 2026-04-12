import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isOnboardingComplete } from "@/lib/profile/require-onboarding";
import { analyzeMealText } from "@/lib/meals/analyze-meal-text";
import { loadUserFoodsForResolve } from "@/lib/meals/load-user-foods";
import { prismaLineCreates } from "@/lib/meals/line-items-create";
import { isDbUnavailableError } from "@/lib/db-errors";

export const maxDuration = 60;

function jsonError(
  error: string,
  status: number,
  code?: string,
): NextResponse {
  return NextResponse.json(
    code ? { error, code } : { error },
    { status },
  );
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return jsonError("Unauthorized", 401);
    }
    const userId = session.user.id;

    let onboardingComplete: boolean;
    try {
      onboardingComplete = await isOnboardingComplete(userId);
    } catch (e) {
      if (isDbUnavailableError(e)) {
        return jsonError(
          "Database temporarily unavailable",
          503,
          "DATABASE_UNAVAILABLE",
        );
      }
      const message =
        e instanceof Error ? e.message : "Could not verify onboarding status";
      return jsonError(message, 500, "ONBOARDING_CHECK_FAILED");
    }

    if (!onboardingComplete) {
      return jsonError(
        "Complete onboarding first",
        403,
        "ONBOARDING_REQUIRED",
      );
    }

    let body: { rawInput?: string };
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON", 400, "INVALID_JSON");
    }

    const rawInput = body.rawInput?.trim();
    if (!rawInput) {
      return jsonError("rawInput is required", 400, "VALIDATION_REQUIRED");
    }

    try {
      const userFoods = await loadUserFoodsForResolve(userId);
      const { lines, meal_label, assumptions, totals } =
        await analyzeMealText(rawInput, { userFoods });

      const meal = await prisma.meal.create({
        data: {
          userId,
          rawInput,
          totalKcal: totals.kcal,
          totalProteinG: totals.protein_g,
          totalCarbsG: totals.carbs_g,
          totalFatG: totals.fat_g,
          lineItems: {
            create: prismaLineCreates(lines, meal_label, assumptions ?? null),
          },
        },
        select: { id: true },
      });

      return NextResponse.json({
        mealId: meal.id,
        meal_label,
        assumptions,
        lines,
        totals,
      });
    } catch (e) {
      if (isDbUnavailableError(e)) {
        return jsonError(
          "Database temporarily unavailable",
          503,
          "DATABASE_UNAVAILABLE",
        );
      }
      const message = e instanceof Error ? e.message : "Analysis failed";
      return jsonError(message, 500, "ANALYSIS_FAILED");
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected server error";
    console.error("[api/meals/analyze]", e);
    return jsonError(message, 500, "UNHANDLED");
  }
}
