import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import { isValidIanaTimeZone } from "@/lib/meals/validate-iana-time-zone";
import {
  lateEatingLine,
  weekendDriftLine,
} from "@/lib/meals/pattern-insights-copy";
import { mealTimingBandLine } from "@/lib/meals/meal-timing-copy";
import { queryMealTimingBands } from "@/lib/meals/meal-timing-bands-query";

/** Allowed rolling calendar windows for averages + `daysInWindow`. */
const WINDOW_DAYS_ALLOWED = new Set([7, 14]);

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

  const windowDaysRaw = url.searchParams.get("windowDays");
  let windowDays = 7;
  if (windowDaysRaw != null) {
    const n = Number(windowDaysRaw);
    if (!WINDOW_DAYS_ALLOWED.has(n)) {
      return NextResponse.json(
        { error: "windowDays must be 7 or 14" },
        { status: 400 },
      );
    }
    windowDays = n;
  }
  const maxRangeMs = (windowDays + 2) * 24 * 60 * 60 * 1000;
  if (toD.getTime() - fromD.getTime() > maxRangeMs) {
    return NextResponse.json({ error: "Range too large for this window" }, { status: 400 });
  }

  const tzRaw = url.searchParams.get("timeZone");
  const timeZone = tzRaw && isValidIanaTimeZone(tzRaw) ? tzRaw : "UTC";
  const userId = session.user.id;

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
        totalAddedSugarG: true,
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
    const addedSugarAgg = agg._sum.totalAddedSugarG;
    const added_sugar_g =
      addedSugarAgg != null
        ? Math.round(Number(addedSugarAgg) * 10) / 10
        : null;
    const mealCount = agg._count._all;

    const avgKcalPerDay = Math.round((kcal / windowDays) * 10) / 10;
    const avgProteinPerDay = Math.round((protein_g / windowDays) * 10) / 10;
    const avgFiberPerDay = Math.round((fiber_g / windowDays) * 10) / 10;
    const avgSodiumPerDay = Math.round(sodium_mg / windowDays);
    const avgSugarPerDay = Math.round((sugar_g / windowDays) * 10) / 10;
    const avgAddedSugarPerDay =
      added_sugar_g != null
        ? Math.round((added_sugar_g / windowDays) * 10) / 10
        : null;

    const dayBuckets = await prisma.$queryRaw<{ day_of_week: number; kcal: number }[]>`
      SELECT 
        EXTRACT(DOW FROM timezone(${timeZone}, m.created_at))::int as day_of_week,
        SUM(m.total_kcal)::float as kcal
      FROM meals m
      WHERE m.user_id = ${userId}::uuid
        AND m.created_at >= ${fromD}
        AND m.created_at < ${toD}
      GROUP BY day_of_week
    `;

    const weekendKcal = dayBuckets
      .filter((b) => b.day_of_week === 0 || b.day_of_week === 6)
      .reduce((s, b) => s + b.kcal, 0);
    const weekdayKcal = dayBuckets
      .filter((b) => b.day_of_week >= 1 && b.day_of_week <= 5)
      .reduce((s, b) => s + b.kcal, 0);

    const dowRows = await prisma.$queryRaw<{ weekend_days: bigint; weekday_days: bigint }[]>`
      SELECT 
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM day::timestamp)::int IN (0, 6))::bigint AS weekend_days,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM day::timestamp)::int BETWEEN 1 AND 5)::bigint AS weekday_days
      FROM generate_series(
        (timezone(${timeZone}::text, ${fromD}::timestamptz))::date,
        (timezone(${timeZone}::text, ${toD}::timestamptz - interval '1 microsecond'))::date,
        interval '1 day'
      ) AS day
    `;

    const weekendsCount = Number(dowRows[0]?.weekend_days ?? 0);
    const weekdaysCount = Number(dowRows[0]?.weekday_days ?? 0);

    const bandsRow = await queryMealTimingBands(
      userId,
      fromD,
      toD,
      timeZone,
    );
    const lateKcal = Number(bandsRow?.kcal_from_21_local ?? 0);
    const windowTotalKcal = Number(bandsRow?.total_kcal ?? 0);

    let daysWithLogs = 0;
    if (mealCount > 0) {
      const countRows = await prisma.$queryRaw<{ c: bigint }[]>`
        SELECT COUNT(*)::bigint AS c
        FROM (
          SELECT DISTINCT DATE(timezone(${timeZone}, m.created_at)) AS d
          FROM meals m
          WHERE m.user_id = ${userId}::uuid
            AND m.created_at >= ${fromD}
            AND m.created_at < ${toD}
        ) AS subq
      `;
      daysWithLogs = Number(countRows[0]?.c ?? 0);
    }

    const weekendAvgKcal =
      weekendsCount > 0 ? Math.round(weekendKcal / weekendsCount) : null;
    const weekdayAvgKcal =
      weekdaysCount > 0 ? Math.round(weekdayKcal / weekdaysCount) : null;

    return NextResponse.json({
      from: fromD.toISOString(),
      to: toD.toISOString(),
      daysInWindow: windowDays,
      daysWithLogs,
      mealCount,
      totals: {
        kcal: Math.round(kcal * 10) / 10,
        protein_g: Math.round(protein_g * 10) / 10,
        carbs_g: Math.round(carbs_g * 10) / 10,
        fat_g: Math.round(fat_g * 10) / 10,
        fiber_g: Math.round(fiber_g * 10) / 10,
        sodium_mg: Math.round(sodium_mg),
        sugar_g: Math.round(sugar_g * 10) / 10,
        ...(added_sugar_g != null ? { added_sugar_g } : {}),
      },
      averages: {
        kcalPerDay: avgKcalPerDay,
        proteinGPerDay: avgProteinPerDay,
        fiberGPerDay: avgFiberPerDay,
        sodiumMgPerDay: avgSodiumPerDay,
        sugarGPerDay: avgSugarPerDay,
        ...(avgAddedSugarPerDay != null
          ? { addedSugarGPerDay: avgAddedSugarPerDay }
          : {}),
      },
      drifts: {
        weekendAvgKcal,
        weekdayAvgKcal,
      },
      patterns: (() => {
        const mtLine =
          bandsRow && bandsRow.total_kcal > 0
            ? mealTimingBandLine({
                bands: {
                  morning_kcal: bandsRow.morning_kcal,
                  midday_kcal: bandsRow.midday_kcal,
                  evening_kcal: bandsRow.evening_kcal,
                  late_night_kcal: bandsRow.late_night_kcal,
                  total_kcal: bandsRow.total_kcal,
                },
                mealCount,
              })
            : null;

        const dominantIsLateNight =
          bandsRow &&
          bandsRow.total_kcal > 0 &&
          (() => {
            const { morning_kcal, midday_kcal, evening_kcal, late_night_kcal } =
              bandsRow;
            const mx = Math.max(
              morning_kcal,
              midday_kcal,
              evening_kcal,
              late_night_kcal,
            );
            return late_night_kcal === mx && mx > 0;
          })();

        let lateLine = lateEatingLine({
          kcalFrom21Local: lateKcal,
          totalKcal: windowTotalKcal,
          mealCount,
        });
        if (dominantIsLateNight && mtLine) {
          lateLine = null;
        }

        return {
          weekendDriftLine: weekendDriftLine({
            weekendAvgKcal,
            weekdayAvgKcal,
            weekendDays: weekendsCount,
            weekdayDays: weekdaysCount,
          }),
          mealTimingBandLine: mtLine,
          lateEatingLine: lateLine,
        };
      })(),
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
