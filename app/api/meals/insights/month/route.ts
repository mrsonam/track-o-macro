import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import { calendarMonthMeta } from "@/lib/meals/local-month";

/** Reject absurd spans (calendar month is at most ~31 days). */
const MAX_MONTH_SPAN_MS = 40 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
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
        },
        _count: { _all: true },
      });

      const kcal = Number(agg._sum.totalKcal ?? 0);
      const protein_g = Number(agg._sum.totalProteinG ?? 0);
      const carbs_g = Number(agg._sum.totalCarbsG ?? 0);
      const fat_g = Number(agg._sum.totalFatG ?? 0);
      const mealCount = agg._count._all;

      const avgKcalPerDay =
        Math.round((kcal / daysInMonth) * 10) / 10;
      const avgProteinPerDay =
        Math.round((protein_g / daysInMonth) * 10) / 10;

      return NextResponse.json({
        ym,
        from: fromD.toISOString(),
        to: toD.toISOString(),
        daysInMonth,
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
