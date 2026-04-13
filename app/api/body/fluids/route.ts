import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import { DEFAULT_HYDRATION_GOAL_ML } from "@/lib/hydration/defaults";

const MAX_RANGE_MS = 49 * 60 * 60 * 1000;

const postSchema = z.object({
  volumeMl: z.number().min(1).max(5000),
  kind: z
    .enum(["water", "tea", "coffee", "juice", "other"])
    .optional()
    .nullable(),
  note: z.string().max(200).optional().nullable(),
  loggedAt: z.string().datetime().optional(),
});

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
      { error: "Query params from and to (ISO) are required" },
      { status: 400 },
    );
  }

  const fromD = new Date(fromRaw);
  const toD = new Date(toRaw);
  if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) {
    return NextResponse.json({ error: "Invalid from or to" }, { status: 400 });
  }
  if (toD <= fromD) {
    return NextResponse.json({ error: "to must be after from" }, { status: 400 });
  }
  if (toD.getTime() - fromD.getTime() > MAX_RANGE_MS) {
    return NextResponse.json({ error: "Range too large" }, { status: 400 });
  }

  const userId = session.user.id;

  try {
    const [profile, agg, logs] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId },
        select: { targetHydrationMl: true },
      }),
      prisma.fluidLog.aggregate({
        where: {
          userId,
          loggedAt: { gte: fromD, lt: toD },
        },
        _sum: { volumeMl: true },
      }),
      prisma.fluidLog.findMany({
        where: {
          userId,
          loggedAt: { gte: fromD, lt: toD },
        },
        orderBy: { loggedAt: "desc" },
        take: 100,
        select: {
          id: true,
          volumeMl: true,
          kind: true,
          note: true,
          loggedAt: true,
        },
      }),
    ]);

    const targetMl =
      profile?.targetHydrationMl != null
        ? profile.targetHydrationMl
        : DEFAULT_HYDRATION_GOAL_ML;
    const totalMl = Number(agg._sum.volumeMl ?? 0);

    return NextResponse.json({
      from: fromD.toISOString(),
      to: toD.toISOString(),
      targetMl,
      totalMl: Math.round(totalMl * 10) / 10,
      logs: logs.map((l) => ({
        id: l.id,
        volume_ml: Number(l.volumeMl),
        kind: l.kind,
        note: l.note,
        loggedAt: l.loggedAt.toISOString(),
      })),
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

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { volumeMl, kind, note, loggedAt } = parsed.data;

  try {
    const log = await prisma.fluidLog.create({
      data: {
        userId: session.user.id,
        volumeMl: new Prisma.Decimal(volumeMl),
        kind: kind ?? null,
        note: note?.trim() ? note.trim() : null,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
      },
    });

    return NextResponse.json({
      log: {
        id: log.id,
        volume_ml: Number(log.volumeMl),
        kind: log.kind,
        note: log.note,
        loggedAt: log.loggedAt.toISOString(),
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
    console.error("[api/body/fluids POST]", e);
    return NextResponse.json({ error: "Database failure" }, { status: 500 });
  }
}
