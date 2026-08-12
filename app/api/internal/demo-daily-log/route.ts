import { NextResponse } from "next/server";
import { addDays, differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { isDbUnavailableError } from "@/lib/db-errors";
import { DEMO_PREPARED_MEALS, type PreparedMealKey } from "@/lib/demo/constants";
import {
  generateDemoDay,
  nextMaintenanceWeightKg,
  shouldLogWeightOnDate,
} from "@/lib/demo/generate-day";
import { persistDemoDay } from "@/lib/demo/persist-day";

const MAX_BACKFILL_DAYS = 14;

function jsonError(error: string, status: number, code?: string) {
  return NextResponse.json(code ? { error, code } : { error }, { status });
}

/**
 * Daily Vercel Cron target: appends any demo-account days missing since the last
 * recorded meal, up to and including today. Never deletes existing rows, so
 * visitor-added data in the demo account is left untouched.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization")?.trim();
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const demoUser = await prisma.user.findFirst({
      where: { isDemo: true },
      select: { id: true },
    });
    if (!demoUser) {
      return NextResponse.json({ ok: true, skipped: "not_seeded" });
    }
    const userId = demoUser.id;

    const lastMeal = await prisma.meal.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (!lastMeal) {
      return NextResponse.json({ ok: true, skipped: "no_history" });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const lastDay = new Date(lastMeal.createdAt);
    lastDay.setUTCHours(0, 0, 0, 0);

    const missingDays = Math.min(
      MAX_BACKFILL_DAYS,
      Math.max(0, differenceInCalendarDays(today, lastDay)),
    );
    if (missingDays === 0) {
      return NextResponse.json({ ok: true, skipped: "up_to_date" });
    }

    const preparedMeals = await prisma.preparedMeal.findMany({
      where: { userId },
      select: { id: true, title: true },
    });
    const preparedMealIds = {} as Record<PreparedMealKey, string>;
    for (const key of Object.keys(DEMO_PREPARED_MEALS) as PreparedMealKey[]) {
      const match = preparedMeals.find(
        (p) => p.title === DEMO_PREPARED_MEALS[key].title,
      );
      if (match) preparedMealIds[key] = match.id;
    }

    for (let i = 1; i <= missingDays; i++) {
      const date = addDays(lastDay, i);
      const day = generateDemoDay(date);
      const weightKg = shouldLogWeightOnDate(date)
        ? nextMaintenanceWeightKg(date)
        : null;
      await persistDemoDay(prisma, { userId, date, day, weightKg, preparedMealIds });
    }

    return NextResponse.json({ ok: true, loggedDays: missingDays });
  } catch (e) {
    if (isDbUnavailableError(e)) {
      return jsonError(
        "Database temporarily unavailable",
        503,
        "DATABASE_UNAVAILABLE",
      );
    }
    console.error("[api/internal/demo-daily-log]", e);
    return jsonError("Unexpected server error", 500, "UNHANDLED");
  }
}
