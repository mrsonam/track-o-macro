import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import { isValidIanaTimeZone } from "@/lib/meals/validate-iana-time-zone";
import {
  buildSmoothedTrend,
  collapseLogsToDaily,
  DEFAULT_WEIGHT_EMA_ALPHA,
} from "@/lib/body/weight-trend-series";

/**
 * GET — daily weight points + EMA-smoothed curve for charts.
 * Query: `timeZone` (IANA), `days` (7–365, default 120), `alpha` (optional EMA 0.05–0.6).
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const tzRaw = url.searchParams.get("timeZone");
  const timeZone =
    tzRaw && isValidIanaTimeZone(tzRaw) ? tzRaw : "UTC";

  let days = Number(url.searchParams.get("days"));
  if (!Number.isFinite(days) || days < 7) days = 120;
  if (days > 365) days = 365;

  let alpha = Number(url.searchParams.get("alpha"));
  if (!Number.isFinite(alpha)) alpha = DEFAULT_WEIGHT_EMA_ALPHA;
  alpha = Math.min(0.6, Math.max(0.05, alpha));

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - days);

  try {
    const [rows, profile] = await Promise.all([
      prisma.weightLog.findMany({
        where: {
          userId: session.user.id,
          loggedAt: { gte: from },
        },
        orderBy: { loggedAt: "asc" },
        select: { loggedAt: true, weightKg: true },
      }),
      prisma.userProfile.findUnique({
        where: { userId: session.user.id },
        select: { goalWeightKg: true },
      }),
    ]);

    const logs = rows.map((r) => ({
      loggedAt: r.loggedAt,
      weightKg: Number(r.weightKg),
    }));

    const daily = collapseLogsToDaily(logs, timeZone);
    const points = buildSmoothedTrend(daily, alpha);

    const goalWeightKg =
      profile?.goalWeightKg != null
        ? Number(profile.goalWeightKg)
        : null;

    return NextResponse.json({
      timeZone,
      daysRequested: days,
      alpha,
      pointCount: points.length,
      points,
      goalWeightKg:
        goalWeightKg != null && Number.isFinite(goalWeightKg)
          ? goalWeightKg
          : null,
    });
  } catch (e) {
    if (isDbUnavailableError(e)) {
      return NextResponse.json(
        { error: "Database temporarily unavailable", code: "DATABASE_UNAVAILABLE" },
        { status: 503 },
      );
    }
    throw e;
  }
}
