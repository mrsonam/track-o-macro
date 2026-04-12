import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import {
  HISTORY_MEALS_MAX_OFFSET,
  HISTORY_MEALS_PAGE_SIZE,
} from "@/lib/meals/history-meals-page";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const offsetRaw = url.searchParams.get("offset");
  let offset = Number.parseInt(offsetRaw ?? "0", 10);
  if (
    !Number.isFinite(offset) ||
    offset < 0 ||
    offset > HISTORY_MEALS_MAX_OFFSET
  ) {
    return NextResponse.json({ error: "Invalid offset" }, { status: 400 });
  }

  const take = HISTORY_MEALS_PAGE_SIZE;

  try {
    const rows = await prisma.meal.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: take + 1,
      select: {
        id: true,
        rawInput: true,
        totalKcal: true,
        createdAt: true,
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
