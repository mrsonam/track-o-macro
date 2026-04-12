import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";

const MAX_RAW = 8000;
const MAX_TITLE = 100;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ id: string }> };

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
    const result = await prisma.savedMeal.deleteMany({
      where: { id, userId: session.user.id },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { title?: string; rawInput?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.title === undefined && body.rawInput === undefined) {
    return NextResponse.json(
      { error: "Provide title and/or rawInput" },
      { status: 400 },
    );
  }

  const data: { title?: string; rawInput?: string } = {};
  if (body.title !== undefined) {
    let title = body.title.trim();
    if (!title) {
      return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    }
    if (title.length > MAX_TITLE) {
      title = `${title.slice(0, MAX_TITLE - 1)}…`;
    }
    data.title = title;
  }
  if (body.rawInput !== undefined) {
    const raw = body.rawInput.trim();
    if (!raw) {
      return NextResponse.json({ error: "rawInput cannot be empty" }, { status: 400 });
    }
    if (raw.length > MAX_RAW) {
      return NextResponse.json({ error: "Meal text is too long" }, { status: 400 });
    }
    data.rawInput = raw;
  }

  try {
    const existing = await prisma.savedMeal.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const item = await prisma.savedMeal.update({
      where: { id },
      data,
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
