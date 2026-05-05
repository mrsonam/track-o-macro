import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbUnavailableError } from "@/lib/db-errors";
import { appleHealthSyncBodySchema } from "@/lib/health/apple-sync-schema";
import { hashHealthSyncToken } from "@/lib/health/token-crypto";
import { ingestAppleHealthBatch } from "@/lib/health/ingest-apple-batch";

const MAX_BODY_BYTES = 256 * 1024;
const MAX_SAMPLES_PER_MINUTE = 800;

function extractSyncToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const t = auth.slice(7).trim();
    if (t.length > 0) return t;
  }
  const h =
    request.headers.get("x-track-o-macro-sync-token") ??
    request.headers.get("X-Track-O-Macro-Sync-Token");
  const trimmed = h?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: Request) {
  const tokenPlain = extractSyncToken(request);
  if (!tokenPlain) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing token",
        hint: "Use Authorization: Bearer <token> or X-Track-O-Macro-Sync-Token",
      },
      { status: 401 },
    );
  }

  const tokenHash = hashHealthSyncToken(tokenPlain);

  let userId: string;
  let tokenRowId: string;
  try {
    const row = await prisma.healthSyncToken.findFirst({
      where: { tokenHash, revokedAt: null },
      select: { id: true, userId: true },
    });
    if (!row) {
      return NextResponse.json(
        { success: false, error: "Invalid or revoked token" },
        { status: 401 },
      );
    }
    userId = row.userId;
    tokenRowId = row.id;
  } catch (e) {
    if (isDbUnavailableError(e)) {
      return NextResponse.json(
        { success: false, error: "Database temporarily unavailable" },
        { status: 503 },
      );
    }
    throw e;
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { success: false, error: "Payload too large" },
      { status: 413 },
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = appleHealthSyncBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const recent = await prisma.healthSample.count({
      where: { userId, ingestedAt: { gte: oneMinuteAgo } },
    });
    if (recent > MAX_SAMPLES_PER_MINUTE) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded; retry shortly" },
        { status: 429 },
      );
    }
  } catch (e) {
    if (isDbUnavailableError(e)) {
      return NextResponse.json(
        { success: false, error: "Database temporarily unavailable" },
        { status: 503 },
      );
    }
    throw e;
  }

  try {
    const result = await ingestAppleHealthBatch(userId, parsed.data);

    await prisma.healthSyncToken
      .update({
        where: { id: tokenRowId },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {
        /* non-fatal */
      });

    const status =
      result.errors.length > 0 && result.ingested === 0 && result.duplicates === 0
        ? 400
        : 200;

    return NextResponse.json(
      {
        success: result.success,
        ingested: result.ingested,
        duplicates: result.duplicates,
        errors: result.errors,
      },
      { status },
    );
  } catch (e) {
    if (isDbUnavailableError(e)) {
      return NextResponse.json(
        { success: false, error: "Database temporarily unavailable" },
        { status: 503 },
      );
    }
    throw e;
  }
}
