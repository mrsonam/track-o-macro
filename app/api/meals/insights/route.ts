import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import { isValidIanaTimeZone } from "@/lib/meals/validate-iana-time-zone";

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
      },
      _count: { _all: true },
    });

    const kcal = Number(agg._sum.totalKcal ?? 0);
    const protein_g = Number(agg._sum.totalProteinG ?? 0);
    const carbs_g = Number(agg._sum.totalCarbsG ?? 0);
    const fat_g = Number(agg._sum.totalFatG ?? 0);
    const mealCount = agg._count._all;

    const avgKcalPerDay = Math.round((kcal / windowDays) * 10) / 10;
    const avgProteinPerDay = Math.round((protein_g / windowDays) * 10) / 10;

    // Weekend Drift Analysis (Sat/Sun vs Mon-Fri)
    const tzRaw = url.searchParams.get("timeZone");
    const timeZone = tzRaw && isValidIanaTimeZone(tzRaw) ? tzRaw : "UTC";

    const dayBuckets = await prisma.$queryRaw<{ day_of_week: number; kcal: number }[]>`
      SELECT 
        EXTRACT(DOW FROM timezone(${timeZone}, m.created_at))::int as day_of_week,
        SUM(m.total_kcal)::float as kcal
      FROM meals m
      WHERE m.user_id = ${session.user.id}::uuid
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

    // Number of days in this window that fall on weekend vs weekday
    let weekendsCount = 0;
    let weekdaysCount = 0;
    for (let i = 0; i < windowDays; i++) {
      const d = new Date(fromD.getTime() + i * 24 * 60 * 60 * 1000);
      const dow = d.getDay(); // 0 is Sunday, 6 is Saturday
      if (dow === 0 || dow === 6) weekendsCount++;
      else weekdaysCount++;
    }

    // Days with logs calculation
    let daysWithLogs = 0;
    if (mealCount > 0) {
      const countRows = await prisma.$queryRaw<{ c: bigint }[]>`
        SELECT COUNT(*)::bigint AS c
        FROM (
          SELECT DISTINCT DATE(timezone(${timeZone}, m.created_at)) AS d
          FROM meals m
          WHERE m.user_id = ${session.user.id}::uuid
            AND m.created_at >= ${fromD}
            AND m.created_at < ${toD}
        ) AS subq
      `;
      daysWithLogs = Number(countRows[0]?.c ?? 0);
    }

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
      },
      averages: {
        kcalPerDay: avgKcalPerDay,
        proteinGPerDay: avgProteinPerDay,
      },
      drifts: {
        weekendAvgKcal: weekendsCount > 0 ? Math.round(weekendKcal / weekendsCount) : null,
        weekdayAvgKcal: weekdaysCount > 0 ? Math.round(weekdayKcal / weekdaysCount) : null,
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
