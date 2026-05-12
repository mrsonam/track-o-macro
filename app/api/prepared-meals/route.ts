import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isOnboardingComplete } from "@/lib/profile/require-onboarding";
import { isDbUnavailableError } from "@/lib/db-errors";

function jsonError(error: string, status: number, code?: string) {
  return NextResponse.json(code ? { error, code } : { error }, { status });
}

function toDec(n: number): Prisma.Decimal {
  return new Prisma.Decimal(Number.isFinite(n) ? n.toFixed(4) : "0");
}

function readFinite(body: Record<string, unknown>, key: string): number | null {
  const v = body[key];
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

export async function GET() {
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

    const rows = await prisma.preparedMeal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        preparedGrams: true,
        batchTotalKcal: true,
        batchTotalProteinG: true,
        batchTotalCarbsG: true,
        batchTotalFatG: true,
        batchTotalFiberG: true,
        batchTotalSodiumMg: true,
        batchTotalSugarG: true,
        batchTotalAddedSugarG: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        preparedGrams: Number(r.preparedGrams),
        batchTotalKcal: Number(r.batchTotalKcal),
        batchTotalProteinG: Number(r.batchTotalProteinG),
        batchTotalCarbsG: Number(r.batchTotalCarbsG),
        batchTotalFatG: Number(r.batchTotalFatG),
        batchTotalFiberG:
          r.batchTotalFiberG != null ? Number(r.batchTotalFiberG) : null,
        batchTotalSodiumMg:
          r.batchTotalSodiumMg != null ? Number(r.batchTotalSodiumMg) : null,
        batchTotalSugarG:
          r.batchTotalSugarG != null ? Number(r.batchTotalSugarG) : null,
        batchTotalAddedSugarG:
          r.batchTotalAddedSugarG != null
            ? Number(r.batchTotalAddedSugarG)
            : null,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[api/prepared-meals GET]", e);
    return jsonError("Unexpected server error", 500, "UNHANDLED");
  }
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

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonError("Invalid JSON", 400, "INVALID_JSON");
    }

    const title =
      typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
    const recipeRawInput =
      typeof body.recipeRawInput === "string"
        ? body.recipeRawInput.trim().slice(0, 20000)
        : "";
    const preparedGrams = readFinite(body, "preparedGrams");
    const totals = body.batchTotals as Record<string, unknown> | undefined;

    if (!title) {
      return jsonError("title is required", 400, "VALIDATION_REQUIRED");
    }
    if (!recipeRawInput) {
      return jsonError("recipeRawInput is required", 400, "VALIDATION_REQUIRED");
    }
    if (preparedGrams == null || preparedGrams <= 0 || preparedGrams > 500_000) {
      return jsonError(
        "preparedGrams must be a positive number (grams)",
        400,
        "VALIDATION_REQUIRED",
      );
    }
    if (!totals || typeof totals !== "object") {
      return jsonError("batchTotals is required", 400, "VALIDATION_REQUIRED");
    }

    const kcal = readFinite(totals, "kcal");
    const protein_g = readFinite(totals, "protein_g");
    const carbs_g = readFinite(totals, "carbs_g");
    const fat_g = readFinite(totals, "fat_g");
    if (kcal == null || kcal < 0 || !Number.isFinite(kcal)) {
      return jsonError("batchTotals.kcal is required", 400, "VALIDATION_REQUIRED");
    }
    if (
      protein_g == null ||
      carbs_g == null ||
      fat_g == null ||
      protein_g < 0 ||
      carbs_g < 0 ||
      fat_g < 0
    ) {
      return jsonError(
        "batchTotals protein_g, carbs_g, fat_g are required",
        400,
        "VALIDATION_REQUIRED",
      );
    }

    const fiber_g = readFinite(totals, "fiber_g");
    const sodium_mg = readFinite(totals, "sodium_mg");
    const sugar_g = readFinite(totals, "sugar_g");
    const added_sugar_g = readFinite(totals, "added_sugar_g");

    let lineItemsJson: Prisma.InputJsonValue | undefined;
    if (Array.isArray(body.lines)) {
      const lines = body.lines.slice(0, 80);
      lineItemsJson = lines as unknown as Prisma.InputJsonValue;
    }

    const row = await prisma.preparedMeal.create({
      data: {
        userId,
        title,
        recipeRawInput,
        preparedGrams: toDec(preparedGrams),
        batchTotalKcal: toDec(kcal),
        batchTotalProteinG: toDec(protein_g),
        batchTotalCarbsG: toDec(carbs_g),
        batchTotalFatG: toDec(fat_g),
        batchTotalFiberG:
          fiber_g != null && fiber_g >= 0 ? toDec(fiber_g) : null,
        batchTotalSodiumMg:
          sodium_mg != null && sodium_mg >= 0 ? toDec(sodium_mg) : null,
        batchTotalSugarG:
          sugar_g != null && sugar_g >= 0 ? toDec(sugar_g) : null,
        batchTotalAddedSugarG:
          added_sugar_g != null && added_sugar_g >= 0
            ? toDec(added_sugar_g)
            : null,
        lineItemsJson: lineItemsJson ?? undefined,
      },
      select: {
        id: true,
        title: true,
        preparedGrams: true,
        batchTotalKcal: true,
        batchTotalProteinG: true,
        batchTotalCarbsG: true,
        batchTotalFatG: true,
        batchTotalFiberG: true,
        batchTotalSodiumMg: true,
        batchTotalSugarG: true,
        batchTotalAddedSugarG: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      item: {
        id: row.id,
        title: row.title,
        preparedGrams: Number(row.preparedGrams),
        batchTotalKcal: Number(row.batchTotalKcal),
        batchTotalProteinG: Number(row.batchTotalProteinG),
        batchTotalCarbsG: Number(row.batchTotalCarbsG),
        batchTotalFatG: Number(row.batchTotalFatG),
        batchTotalFiberG:
          row.batchTotalFiberG != null ? Number(row.batchTotalFiberG) : null,
        batchTotalSodiumMg:
          row.batchTotalSodiumMg != null ? Number(row.batchTotalSodiumMg) : null,
        batchTotalSugarG:
          row.batchTotalSugarG != null ? Number(row.batchTotalSugarG) : null,
        batchTotalAddedSugarG:
          row.batchTotalAddedSugarG != null
            ? Number(row.batchTotalAddedSugarG)
            : null,
        createdAt: row.createdAt.toISOString(),
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
    console.error("[api/prepared-meals POST]", e);
    return jsonError("Unexpected server error", 500, "UNHANDLED");
  }
}
