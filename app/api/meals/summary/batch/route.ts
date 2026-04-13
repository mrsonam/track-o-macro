import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";

const MAX_RANGES = 14;
const MAX_SINGLE_RANGE_MS = 49 * 60 * 60 * 1000;

type RangeInput = { from?: string; to?: string };

function validateRange(fromRaw: string, toRaw: string): {
  ok: true;
  fromD: Date;
  toD: Date;
} | { ok: false; message: string } {
  const fromD = new Date(fromRaw);
  const toD = new Date(toRaw);
  if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) {
    return { ok: false, message: "Invalid from or to date" };
  }
  if (toD <= fromD) {
    return { ok: false, message: "to must be after from" };
  }
  if (toD.getTime() - fromD.getTime() > MAX_SINGLE_RANGE_MS) {
    return { ok: false, message: "Range too large for one slot" };
  }
  return { ok: true, fromD, toD };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { ranges?: RangeInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ranges = body.ranges;
  if (!Array.isArray(ranges) || ranges.length === 0) {
    return NextResponse.json(
      { error: "ranges must be a non-empty array" },
      { status: 400 },
    );
  }
  if (ranges.length > MAX_RANGES) {
    return NextResponse.json(
      { error: `At most ${MAX_RANGES} ranges allowed` },
      { status: 400 },
    );
  }

  for (const r of ranges) {
    if (typeof r.from !== "string" || typeof r.to !== "string") {
      return NextResponse.json(
        { error: "Each range needs from and to ISO strings" },
        { status: 400 },
      );
    }
    const v = validateRange(r.from, r.to);
    if (!v.ok) {
      return NextResponse.json({ error: v.message }, { status: 400 });
    }
  }

  const userId = session.user.id;

  try {
    const results = await Promise.all(
      ranges.map(async (r) => {
        const v = validateRange(r.from!, r.to!);
        if (!v.ok) {
          return { ok: false as const, error: v.message };
        }
        const { fromD, toD } = v;
        try {
          const agg = await prisma.meal.aggregate({
            where: {
              userId,
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

          const drivers: {
            kcal?: { rawInput: string; value: number };
            sodium?: { rawInput: string; value: number };
            sugar?: { rawInput: string; value: number };
          } = {};

          if (agg._count._all > 0) {
            const [topKcal, topSodium, topSugar] = await Promise.all([
              prisma.meal.findFirst({
                where: { userId, createdAt: { gte: fromD, lt: toD } },
                orderBy: { totalKcal: "desc" },
                select: { rawInput: true, totalKcal: true },
              }),
              prisma.meal.findFirst({
                where: { userId, createdAt: { gte: fromD, lt: toD } },
                orderBy: { totalSodiumMg: "desc" },
                select: { rawInput: true, totalSodiumMg: true },
              }),
              prisma.meal.findFirst({
                where: { userId, createdAt: { gte: fromD, lt: toD } },
                orderBy: { totalSugarG: "desc" },
                select: { rawInput: true, totalSugarG: true },
              }),
            ]);

            if (topKcal) {
              drivers.kcal = {
                rawInput: topKcal.rawInput,
                value: Number(topKcal.totalKcal),
              };
            }
            if (topSodium) {
              drivers.sodium = {
                rawInput: topSodium.rawInput,
                value: Number(topSodium.totalSodiumMg),
              };
            }
            if (topSugar) {
              drivers.sugar = {
                rawInput: topSugar.rawInput,
                value: Number(topSugar.totalSugarG),
              };
            }
          }

          return {
            ok: true as const,
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
            drivers,
          };
        } catch {
          return { ok: false as const, error: "Query failed" };
        }
      }),
    );

    return NextResponse.json({ results });
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
