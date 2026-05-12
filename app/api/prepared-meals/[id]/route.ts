import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isOnboardingComplete } from "@/lib/profile/require-onboarding";
import { isDbUnavailableError } from "@/lib/db-errors";

function jsonError(error: string, status: number, code?: string) {
  return NextResponse.json(code ? { error, code } : { error }, { status });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return jsonError("Unauthorized", 401);
    }
    const userId = session.user.id;
    let ok: boolean;
    try {
      ok = await isOnboardingComplete(userId);
    } catch (e) {
      if (isDbUnavailableError(e)) {
        return jsonError(
          "Database temporarily unavailable",
          503,
          "DATABASE_UNAVAILABLE",
        );
      }
      throw e;
    }
    if (!ok) {
      return jsonError("Complete onboarding first", 403, "ONBOARDING_REQUIRED");
    }

    const { id } = await context.params;
    if (!id) return jsonError("Missing id", 400, "VALIDATION_REQUIRED");

    const res = await prisma.preparedMeal.deleteMany({
      where: { id, userId },
    });
    if (res.count === 0) {
      return jsonError("Not found", 404, "NOT_FOUND");
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isDbUnavailableError(e)) {
      return jsonError(
        "Database temporarily unavailable",
        503,
        "DATABASE_UNAVAILABLE",
      );
    }
    console.error("[api/prepared-meals/[id] DELETE]", e);
    return jsonError("Unexpected server error", 500, "UNHANDLED");
  }
}
