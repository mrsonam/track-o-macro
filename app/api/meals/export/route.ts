import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import { formatMealsCsv } from "@/lib/meals/format-meals-csv";

const MAX_ROWS = 5000;
/** Max calendar span for `from` / `to` range exports (inclusive start, exclusive end ISO). */
const MAX_RANGE_MS = 400 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");

  let createdAtFilter: { gte: Date; lt: Date } | undefined;
  if (fromRaw || toRaw) {
    if (!fromRaw || !toRaw) {
      return NextResponse.json(
        { error: "Both from and to (ISO datetimes) are required for a range export" },
        { status: 400 },
      );
    }
    const fromD = new Date(fromRaw);
    const toLt = new Date(toRaw);
    if (Number.isNaN(fromD.getTime()) || Number.isNaN(toLt.getTime())) {
      return NextResponse.json({ error: "Invalid from or to" }, { status: 400 });
    }
    if (toLt <= fromD) {
      return NextResponse.json(
        { error: "to must be after from (exclusive end boundary)" },
        { status: 400 },
      );
    }
    if (toLt.getTime() - fromD.getTime() > MAX_RANGE_MS) {
      return NextResponse.json(
        { error: "Export range cannot exceed 400 days" },
        { status: 400 },
      );
    }
    createdAtFilter = { gte: fromD, lt: toLt };
  }

  try {
    const meals = await prisma.meal.findMany({
      where: {
        userId: session.user.id,
        ...(createdAtFilter
          ? { createdAt: createdAtFilter }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS,
      select: {
        id: true,
        rawInput: true,
        totalKcal: true,
        totalProteinG: true,
        totalCarbsG: true,
        totalFatG: true,
        createdAt: true,
        tags: true,
        placeLabel: true,
      },
    });

    const rows = meals.map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      rawInput: m.rawInput,
      totalKcal: Number(m.totalKcal),
      totalProteinG:
        m.totalProteinG != null ? Number(m.totalProteinG) : null,
      totalCarbsG: m.totalCarbsG != null ? Number(m.totalCarbsG) : null,
      totalFatG: m.totalFatG != null ? Number(m.totalFatG) : null,
      tags: m.tags,
      placeLabel: m.placeLabel,
    }));

    const csv = formatMealsCsv(rows);
    const day = new Date().toISOString().slice(0, 10);
    const filename = createdAtFilter
      ? `calorie-meals-range-${day}.csv`
      : `calorie-meals-${day}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
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
