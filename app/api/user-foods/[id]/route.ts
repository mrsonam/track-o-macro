import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import { normalizeFoodLabel } from "@/lib/nutrition/resolve-ingredient";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_LABEL = 200;
const MAX_KCAL_PER_100 = 900;
const MAX_G_PER_100 = 100;

function parsePositive(n: unknown): number | null {
  if (typeof n === "number" && Number.isFinite(n) && n >= 0) return n;
  if (typeof n === "string" && n.trim() !== "") {
    const v = parseFloat(n);
    if (Number.isFinite(v) && v >= 0) return v;
  }
  return null;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: {
    label?: string;
    kcalPer100g?: unknown;
    proteinPer100g?: unknown;
    carbsPer100g?: unknown;
    fatPer100g?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const label = body.label?.trim();
  if (!label || label.length > MAX_LABEL) {
    return NextResponse.json(
      { error: "label is required (max 200 characters)" },
      { status: 400 },
    );
  }
  const labelNorm = normalizeFoodLabel(label);
  if (!labelNorm) {
    return NextResponse.json({ error: "Invalid label" }, { status: 400 });
  }

  const kcal = parsePositive(body.kcalPer100g);
  const p = parsePositive(body.proteinPer100g);
  const c = parsePositive(body.carbsPer100g);
  const f = parsePositive(body.fatPer100g);
  if (
    kcal == null ||
    p == null ||
    c == null ||
    f == null ||
    kcal > MAX_KCAL_PER_100 ||
    p > MAX_G_PER_100 ||
    c > MAX_G_PER_100 ||
    f > MAX_G_PER_100
  ) {
    return NextResponse.json(
      { error: "Macros must be numbers from 0 to sensible limits" },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.userFood.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Food not found" }, { status: 404 });
    }

    const updated = await prisma.userFood.update({
      where: { id },
      data: {
        label,
        labelNorm,
        kcalPer100g: kcal,
        proteinPer100g: p,
        carbsPer100g: c,
        fatPer100g: f,
        version: { increment: 1 },
      },
      select: {
        id: true,
        label: true,
        kcalPer100g: true,
        proteinPer100g: true,
        carbsPer100g: true,
        fatPer100g: true,
        version: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      item: {
        id: updated.id,
        label: updated.label,
        kcalPer100g: Number(updated.kcalPer100g),
        proteinPer100g: Number(updated.proteinPer100g),
        carbsPer100g: Number(updated.carbsPer100g),
        fatPer100g: Number(updated.fatPer100g),
        version: updated.version,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "You already have a food with this name" },
        { status: 409 },
      );
    }
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

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const result = await prisma.userFood.deleteMany({
      where: { id, userId: session.user.id },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Food not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
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
