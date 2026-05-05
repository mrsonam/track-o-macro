import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import {
  generateHealthSyncTokenPlaintext,
  hashHealthSyncToken,
} from "@/lib/health/token-crypto";

const createBodySchema = z.object({
  label: z.string().max(120).optional().nullable(),
});

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await prisma.healthSyncToken.findMany({
      where: { userId: session.user.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        label: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
    return NextResponse.json({
      tokens: rows.map((r) => ({
        id: r.id,
        label: r.label,
        createdAt: r.createdAt.toISOString(),
        lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
      })),
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

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown = {};
  try {
    json = await request.json();
  } catch {
    json = {};
  }
  const parsed = createBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const plaintext = generateHealthSyncTokenPlaintext();
  const tokenHash = hashHealthSyncToken(plaintext);

  try {
    await prisma.healthSyncToken.create({
      data: {
        userId: session.user.id,
        tokenHash,
        label: parsed.data.label?.trim() || null,
      },
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

  return NextResponse.json({
    token: plaintext,
    message:
      "Copy this token into Shortcuts now. It will not be shown again. You can revoke it anytime in Settings.",
  });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Query id (token row id) is required" },
      { status: 400 },
    );
  }

  try {
    const res = await prisma.healthSyncToken.updateMany({
      where: { id, userId: session.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (res.count === 0) {
      return NextResponse.json(
        { error: "Token not found or already revoked" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
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
