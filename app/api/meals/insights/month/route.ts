import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import { calendarMonthMeta } from "@/lib/meals/local-month";
import { formatYmdInTimeZone } from "@/lib/body/weight-trend-series";
import { isValidIanaTimeZone } from "@/lib/meals/validate-iana-time-zone";

/** Reject absurd spans (calendar month is at most ~31 days). */
const MAX_MONTH_SPAN_MS = 40 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  await connection();
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const ym = url.searchParams.get("ym")?.trim() ?? "";
    const meta = calendarMonthMeta(ym);
    if (!meta) {
      return NextResponse.json(
        { error: "Query ym must be YYYY-MM (local calendar month)" },
        { status: 400 },
      );
    }

    const fromD = new Date(meta.fromIso);
    const toD = new Date(meta.toIso);
    if (toD.getTime() - fromD.getTime() > MAX_MONTH_SPAN_MS) {
      return NextResponse.json({ error: "Invalid month span" }, { status: 400 });
    }

    const { daysInMonth } = meta;
    if (daysInMonth < 28 || daysInMonth > 31) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
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
      const mealCount = agg._count._all;

      const avgKcalPerDay = Math.round((kcal / daysInMonth) * 10) / 10;
      const avgProteinPerDay = Math.round((protein_g / daysInMonth) * 10) / 10;
      const avgFiberPerDay = Math.round((fiber_g / daysInMonth) * 10) / 10;
      const avgSodiumPerDay = Math.round(sodium_mg / daysInMonth);
      const avgSugarPerDay = Math.round((sugar_g / daysInMonth) * 10) / 10;

      const tzRaw = url.searchParams.get("timeZone");
      const timeZone =
        tzRaw && isValidIanaTimeZone(tzRaw) ? tzRaw : "UTC";

      const targetKcalRaw = url.searchParams.get("targetKcal");
      const targetKcal =
        targetKcalRaw != null ? Number(targetKcalRaw) : null;
      const hasTarget =
        targetKcal != null && Number.isFinite(targetKcal) && targetKcal > 0;

      const [lineAgg, dayMeals] = await Promise.all([
        prisma.mealLineItem.groupBy({
          by: ["label"],
          where: {
            meal: {
              userId: session.user.id,
              createdAt: { gte: fromD, lt: toD },
            },
          },
          _sum: { kcal: true },
          _count: { id: true },
        }),
        prisma.meal.findMany({
          where: {
            userId: session.user.id,
            createdAt: { gte: fromD, lt: toD },
          },
          select: { createdAt: true, totalKcal: true },
        }),
      ]);

      const topFoods = lineAgg
        .map((row) => ({
          label: row.label,
          kcal: Number(row._sum.kcal ?? 0),
          lineCount: row._count.id,
        }))
        .filter((r) => r.kcal > 0)
        .sort((a, b) => b.kcal - a.kcal)
        .slice(0, 8);

      const byDay = new Map<string, number>();
      for (const m of dayMeals) {
        const key = formatYmdInTimeZone(m.createdAt, timeZone);
        const add = Number(m.totalKcal ?? 0);
        byDay.set(key, (byDay.get(key) ?? 0) + add);
      }
      const daysWithLogs = byDay.size;

      let daysNearTarget: number | null = null;
      if (hasTarget) {
        const lo = targetKcal! * 0.88;
        const hi = targetKcal! * 1.12;
        daysNearTarget = 0;
        for (const total of byDay.values()) {
          if (total >= lo && total <= hi) daysNearTarget++;
        }
      }

      return NextResponse.json({
        ym,
        from: fromD.toISOString(),
        to: toD.toISOString(),
        daysInMonth,
        mealCount,
        timeZone,
        totals: {
          kcal: Math.round(kcal * 10) / 10,
          protein_g: Math.round(protein_g * 10) / 10,
          carbs_g: Math.round(carbs_g * 10) / 10,
          fat_g: Math.round(fat_g * 10) / 10,
          fiber_g: Math.round(fiber_g * 10) / 10,
          sodium_mg: Math.round(sodium_mg),
          sugar_g: Math.round(sugar_g * 10) / 10,
        },
        averages: {
          kcalPerDay: avgKcalPerDay,
          proteinGPerDay: avgProteinPerDay,
          fiberGPerDay: avgFiberPerDay,
          sodiumMgPerDay: avgSodiumPerDay,
          sugarGPerDay: avgSugarPerDay,
        },
        topFoods,
        adherence: {
          daysWithLogs,
          daysInMonth,
          daysNearTarget,
          targetKcal: hasTarget ? targetKcal : null,
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
  } catch (e) {
    console.error("[api/meals/insights/month]", e);
    const message =
      e instanceof Error ? e.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
