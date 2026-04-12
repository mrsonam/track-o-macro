import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import { normalizeFoodLabel } from "@/lib/nutrition/resolve-ingredient";

const MAX_LABEL = 200;
const MAX_FOODS = 150;
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

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await prisma.userFood.findMany({
      where: { userId: session.user.id },
      orderBy: { labelNorm: "asc" },
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
      items: items.map((r) => ({
        id: r.id,
        label: r.label,
        kcalPer100g: Number(r.kcalPer100g),
        proteinPer100g: Number(r.proteinPer100g),
        carbsPer100g: Number(r.carbsPer100g),
        fatPer100g: Number(r.fatPer100g),
        version: r.version,
        updatedAt: r.updatedAt.toISOString(),
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
  const userId = session.user.id;

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
      { error: "Macros must be numbers from 0 to sensible limits (kcal/100g ≤ 900)" },
      { status: 400 },
    );
  }

  try {
    const count = await prisma.userFood.count({ where: { userId } });
    if (count >= MAX_FOODS) {
      return NextResponse.json(
        { error: `You can save at most ${MAX_FOODS} custom foods` },
        { status: 400 },
      );
    }

    const item = await prisma.userFood.create({
      data: {
        userId,
        label,
        labelNorm,
        kcalPer100g: kcal,
        proteinPer100g: p,
        carbsPer100g: c,
        fatPer100g: f,
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
        id: item.id,
        label: item.label,
        kcalPer100g: Number(item.kcalPer100g),
        proteinPer100g: Number(item.proteinPer100g),
        carbsPer100g: Number(item.carbsPer100g),
        fatPer100g: Number(item.fatPer100g),
        version: item.version,
        updatedAt: item.updatedAt.toISOString(),
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
