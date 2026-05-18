import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import { mapMealToDayPreview } from "@/lib/meals/day-meal-preview";
import { validateMealSummaryRange } from "@/lib/meals/meal-summary-batch-core";

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

  const v = validateMealSummaryRange(fromRaw, toRaw);
  if (!v.ok) {
    return NextResponse.json({ error: v.message }, { status: 400 });
  }

  try {
    const meals = await prisma.meal.findMany({
      where: {
        userId: session.user.id,
        createdAt: { gte: v.fromD, lt: v.toD },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        rawInput: true,
        totalKcal: true,
        totalProteinG: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      meals: meals.map(mapMealToDayPreview),
    });
  } catch (e) {
    if (isDbUnavailableError(e)) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 },
      );
    }
    throw e;
  }
}
