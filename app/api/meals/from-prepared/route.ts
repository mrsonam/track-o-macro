import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isOnboardingComplete } from "@/lib/profile/require-onboarding";
import { isDbUnavailableError } from "@/lib/db-errors";
import { prismaLineCreates } from "@/lib/meals/line-items-create";
import type { ResolvedLine } from "@/lib/nutrition/resolve-ingredient";

function jsonError(error: string, status: number, code?: string) {
  return NextResponse.json(code ? { error, code } : { error }, { status });
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return jsonError("Unauthorized", 401);
    }
    const userId = session.user.id;
    let ok: boolean;
    try {
      ok = await isOnboardingComplete(userId);
    } catch (e) {
      if (isDbUnavailableError(e)) {
        return jsonError(
          "Database temporarily unavailable",
          503,
          "DATABASE_UNAVAILABLE",
        );
      }
      throw e;
    }
    if (!ok) {
      return jsonError("Complete onboarding first", 403, "ONBOARDING_REQUIRED");
    }

    let body: { preparedMealId?: string; portionGrams?: number };
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON", 400, "INVALID_JSON");
    }

    const preparedMealId =
      typeof body.preparedMealId === "string" ? body.preparedMealId.trim() : "";
    const portionGrams =
      typeof body.portionGrams === "number" ? body.portionGrams : NaN;

    if (!preparedMealId) {
      return jsonError("preparedMealId is required", 400, "VALIDATION_REQUIRED");
    }
    if (!Number.isFinite(portionGrams) || portionGrams <= 0 || portionGrams > 50_000) {
      return jsonError(
        "portionGrams must be a positive number",
        400,
        "VALIDATION_REQUIRED",
      );
    }

    const p = await prisma.preparedMeal.findFirst({
      where: { id: preparedMealId, userId },
    });
    if (!p) {
      return jsonError("Prepared meal not found", 404, "NOT_FOUND");
    }

    const preparedG = Number(p.preparedGrams);
    if (!Number.isFinite(preparedG) || preparedG <= 0) {
      return jsonError("Invalid stored prepared weight", 500, "DATA_ERROR");
    }

    const ratio = portionGrams / preparedG;

    const scaleOpt = (v: { toString(): string } | null | undefined) => {
      if (v == null) return null;
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      return round1(n * ratio);
    };

    const kcal = round1(Number(p.batchTotalKcal) * ratio);
    const protein_g = scaleOpt(p.batchTotalProteinG) ?? 0;
    const carbs_g = scaleOpt(p.batchTotalCarbsG) ?? 0;
    const fat_g = scaleOpt(p.batchTotalFatG) ?? 0;
    const fiber_g = scaleOpt(p.batchTotalFiberG);
    const sodium_mg = p.batchTotalSodiumMg != null
      ? Math.round(Number(p.batchTotalSodiumMg) * ratio)
      : null;
    const sugar_g = scaleOpt(p.batchTotalSugarG);
    const added_sugar_g = scaleOpt(p.batchTotalAddedSugarG);

    const label = `${p.title} (${Math.round(portionGrams)}g portion)`;
    const rawInput = `${label}, prepared batch (${Math.round(preparedG)}g total)`;

    const line: ResolvedLine = {
      label,
      quantity: portionGrams,
      unit: "g",
      kcal,
      protein_g,
      carbs_g,
      fat_g,
      ...(fiber_g != null ? { fiber_g } : {}),
      ...(sodium_mg != null ? { sodium_mg } : {}),
      ...(sugar_g != null ? { sugar_g } : {}),
      ...(added_sugar_g != null ? { added_sugar_g } : {}),
      fdc_id: null,
      source: "custom",
      detail: {
        kind: "prepared_meal_portion",
        preparedMealId: p.id,
        portionGrams,
        preparedGrams: preparedG,
        batchTitle: p.title,
      },
    };

    const meal = await prisma.meal.create({
      data: {
        userId,
        rawInput,
        totalKcal: kcal,
        totalProteinG: protein_g,
        totalCarbsG: carbs_g,
        totalFatG: fat_g,
        totalFiberG: fiber_g ?? null,
        totalSodiumMg: sodium_mg ?? null,
        totalSugarG: sugar_g ?? null,
        totalAddedSugarG: added_sugar_g ?? null,
        lineItems: {
          create: prismaLineCreates([line], p.title, null),
        },
      },
      select: { id: true },
    });

    return NextResponse.json({
      mealId: meal.id,
      rawInput,
      lines: [line],
      totals: {
        kcal,
        protein_g,
        carbs_g,
        fat_g,
        fiber_g: fiber_g ?? 0,
        sodium_mg: sodium_mg ?? 0,
        sugar_g: sugar_g ?? 0,
        added_sugar_g: added_sugar_g,
      },
    });
  } catch (e) {
    if (isDbUnavailableError(e)) {
      return jsonError(
        "Database temporarily unavailable",
        503,
        "DATABASE_UNAVAILABLE",
      );
    }
    console.error("[api/meals/from-prepared]", e);
    return jsonError("Unexpected server error", 500, "UNHANDLED");
  }
}
