import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import {
  mealSummaryBatchForUser,
  validateMealSummaryRange,
} from "@/lib/meals/meal-summary-batch-core";

const MAX_RANGES = 14;

type RangeInput = { from?: string; to?: string };

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    ranges?: RangeInput[];
    includeTiming?: boolean;
    includeHydration?: boolean;
    timeZone?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ranges = body.ranges;
  if (!Array.isArray(ranges) || ranges.length === 0) {
    return NextResponse.json(
      { error: "ranges must be a non-empty array" },
      { status: 400 },
    );
  }
  if (ranges.length > MAX_RANGES) {
    return NextResponse.json(
      { error: `At most ${MAX_RANGES} ranges allowed` },
      { status: 400 },
    );
  }

  for (const r of ranges) {
    if (typeof r.from !== "string" || typeof r.to !== "string") {
      return NextResponse.json(
        { error: "Each range needs from and to ISO strings" },
        { status: 400 },
      );
    }
    const v = validateMealSummaryRange(r.from, r.to);
    if (!v.ok) {
      return NextResponse.json({ error: v.message }, { status: 400 });
    }
  }

  const userId = session.user.id;
  const includeTiming = body.includeTiming === true;
  const includeHydration = body.includeHydration !== false;
  const timeZone =
    typeof body.timeZone === "string" ? body.timeZone : null;

  try {
    const normalizedRanges = ranges.map((r) => ({
      from: r.from!,
      to: r.to!,
    }));
    const { results } = await mealSummaryBatchForUser(
      userId,
      normalizedRanges,
      {
        includeTiming,
        includeHydration,
        timeZone,
      },
    );
    return NextResponse.json({ results });
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
