import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";

const MAX_RANGE_MS = 49 * 60 * 60 * 1000; // ~2 days — enough for any local "day" + DST edge cases

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");
  if (!fromRaw || !toRaw) {
    return NextResponse.json(
      { error: "Query params from and to (ISO datetimes) are required" },
      { status: 400 },
    );
  }

  const fromD = new Date(fromRaw);
  const toD = new Date(toRaw);
  if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) {
    return NextResponse.json({ error: "Invalid from or to date" }, { status: 400 });
  }
  if (toD <= fromD) {
    return NextResponse.json({ error: "to must be after from" }, { status: 400 });
  }
  if (toD.getTime() - fromD.getTime() > MAX_RANGE_MS) {
    return NextResponse.json({ error: "Range too large" }, { status: 400 });
  }

  try {
    const agg = await prisma.meal.aggregate({
      where: {
        userId: session.user.id,
        createdAt: { gte: fromD, lt: toD },
      },
      _sum: {
        totalKcal: true,
        totalProteinG: true,
        totalCarbsG: true,
        totalFatG: true,
        totalFiberG: true,
        totalSodiumMg: true,
        totalSugarG: true,
      },
      _count: { _all: true },
    });

    const kcal = Number(agg._sum.totalKcal ?? 0);
    const protein_g = Number(agg._sum.totalProteinG ?? 0);
    const carbs_g = Number(agg._sum.totalCarbsG ?? 0);
    const fat_g = Number(agg._sum.totalFatG ?? 0);
    const fiber_g = Number(agg._sum.totalFiberG ?? 0);
    const sodium_mg = Number(agg._sum.totalSodiumMg ?? 0);
    const sugar_g = Number(agg._sum.totalSugarG ?? 0);

    return NextResponse.json({
      from: fromD.toISOString(),
      to: toD.toISOString(),
      mealCount: agg._count._all,
      totals: {
        kcal: Math.round(kcal * 10) / 10,
        protein_g: Math.round(protein_g * 10) / 10,
        carbs_g: Math.round(carbs_g * 10) / 10,
        fat_g: Math.round(fat_g * 10) / 10,
        fiber_g: Math.round(fiber_g * 10) / 10,
        sodium_mg: Math.round(sodium_mg),
        sugar_g: Math.round(sugar_g * 10) / 10,
      },
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
    throw e;
  }
}
