import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import {
  HISTORY_MEALS_MAX_OFFSET,
  HISTORY_MEALS_PAGE_SIZE,
} from "@/lib/meals/history-meals-page";
import { normalizeMealTag } from "@/lib/meals/meal-tags";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const offsetRaw = url.searchParams.get("offset");
  const offset = Number.parseInt(offsetRaw ?? "0", 10);
  if (
    !Number.isFinite(offset) ||
    offset < 0 ||
    offset > HISTORY_MEALS_MAX_OFFSET
  ) {
    return NextResponse.json({ error: "Invalid offset" }, { status: 400 });
  }

  const q = url.searchParams.get("q")?.trim() ?? "";
  const tagRaw = url.searchParams.get("tag")?.trim() ?? "";
  const tag = normalizeMealTag(tagRaw);
  const place = url.searchParams.get("place")?.trim() ?? "";
  const fromIso = url.searchParams.get("from")?.trim();
  const toIso = url.searchParams.get("to")?.trim();

  const conditions: Prisma.MealWhereInput[] = [
    { userId: session.user.id },
  ];

  if (q.length > 0) {
    conditions.push({
      rawInput: { contains: q, mode: "insensitive" },
    });
  }
  if (tag) {
    conditions.push({ tags: { has: tag } });
  }
  if (place.length > 0) {
    conditions.push({
      placeLabel: { contains: place, mode: "insensitive" },
    });
  }
  if (fromIso || toIso) {
    if (!fromIso || !toIso) {
      return NextResponse.json(
        { error: "Both from and to (ISO datetimes) are required when filtering by date" },
        { status: 400 },
      );
    }
    const fromD = new Date(fromIso);
    const toD = new Date(toIso);
    if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) {
      return NextResponse.json({ error: "Invalid from or to" }, { status: 400 });
    }
    if (toD <= fromD) {
      return NextResponse.json(
        { error: "to must be after from" },
        { status: 400 },
      );
    }
    conditions.push({
      createdAt: { gte: fromD, lt: toD },
    });
  }

  const where: Prisma.MealWhereInput =
    conditions.length === 1 ? conditions[0]! : { AND: conditions };

  const take = HISTORY_MEALS_PAGE_SIZE;

  try {
    const rows = await prisma.meal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: take + 1,
      select: {
        id: true,
        rawInput: true,
        totalKcal: true,
        createdAt: true,
        tags: true,
        placeLabel: true,
      },
    });

    const dbHasMore = rows.length > take;
    const slice = dbHasMore ? rows.slice(0, take) : rows;
    const hasMore =
      dbHasMore && offset + take <= HISTORY_MEALS_MAX_OFFSET;

    return NextResponse.json({
      meals: slice.map((m) => ({
        id: m.id,
        rawInput: m.rawInput,
        totalKcal: Number(m.totalKcal),
        createdAt: m.createdAt.toISOString(),
        tags: m.tags,
        placeLabel: m.placeLabel,
      })),
      hasMore,
    });
  } catch (e) {
    if (isDbUnavailableError(e)) {
      return NextResponse.json(
        { error: "Database temporarily unavailable" },
        { status: 503 },
      );
    }
    throw e;
  }
}
