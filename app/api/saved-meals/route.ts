import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";

const MAX_SAVED = 40;
const MAX_RAW = 8000;
const MAX_TITLE = 100;

function defaultTitle(raw: string) {
  const t = raw.trim().replace(/\s+/g, " ");
  if (t.length <= 48) return t;
  return `${t.slice(0, 45).trim()}…`;
}

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await prisma.savedMeal.findMany({
      where: { userId: session.user.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, title: true, rawInput: true, sortOrder: true },
    });
    return NextResponse.json({ items });
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

  let body: { title?: string; rawInput?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawInput = body.rawInput?.trim();
  if (!rawInput) {
    return NextResponse.json({ error: "rawInput is required" }, { status: 400 });
  }
  if (rawInput.length > MAX_RAW) {
    return NextResponse.json({ error: "Meal text is too long" }, { status: 400 });
  }

  let title = body.title?.trim() || defaultTitle(rawInput);
  if (!title) title = "Saved meal";
  if (title.length > MAX_TITLE) {
    title = `${title.slice(0, MAX_TITLE - 1)}…`;
  }

  try {
    const count = await prisma.savedMeal.count({
      where: { userId: session.user.id },
    });
    if (count >= MAX_SAVED) {
      return NextResponse.json(
        { error: `You can save at most ${MAX_SAVED} favorites` },
        { status: 400 },
      );
    }

    const maxSort = await prisma.savedMeal.aggregate({
      where: { userId: session.user.id },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    const item = await prisma.savedMeal.create({
      data: {
        userId: session.user.id,
        title,
        rawInput,
        sortOrder,
      },
      select: { id: true, title: true, rawInput: true, sortOrder: true },
    });

    return NextResponse.json({ item });
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
