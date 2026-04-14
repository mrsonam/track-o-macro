import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import { isValidIanaTimeZone } from "@/lib/meals/validate-iana-time-zone";
import { computeRollingMealInsightsPayload } from "@/lib/meals/meal-insights-rolling-core";

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
  let windowDays: 7 | 14 = 7;
  if (windowDaysRaw != null) {
    const n = Number(windowDaysRaw);
    if (!WINDOW_DAYS_ALLOWED.has(n)) {
      return NextResponse.json(
        { error: "windowDays must be 7 or 14" },
        { status: 400 },
      );
    }
    windowDays = n as 7 | 14;
  }
  const maxRangeMs = (windowDays + 2) * 24 * 60 * 60 * 1000;
  if (toD.getTime() - fromD.getTime() > maxRangeMs) {
    return NextResponse.json({ error: "Range too large for this window" }, { status: 400 });
  }

  const tzRaw = url.searchParams.get("timeZone");
  const timeZone = tzRaw && isValidIanaTimeZone(tzRaw) ? tzRaw : "UTC";
  const userId = session.user.id;

  try {
    const payload = await computeRollingMealInsightsPayload(
      userId,
      fromD,
      toD,
      windowDays,
      timeZone,
    );
    return NextResponse.json(payload);
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
