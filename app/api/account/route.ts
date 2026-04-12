import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";

function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json(
    code ? { error: message, code } : { error: message },
    { status },
  );
}

/**
 * Permanently delete the signed-in user and all related data (cascade).
 * Requires the account password for confirmation.
 */
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return jsonError("Unauthorized", 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON", 400, "INVALID_JSON");
    }

    const password =
      body &&
      typeof body === "object" &&
      "password" in body &&
      typeof (body as { password?: unknown }).password === "string"
        ? (body as { password: string }).password
        : "";

    if (!password) {
      return jsonError(
        "Password is required to delete your account",
        400,
        "PASSWORD_REQUIRED",
      );
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      });
      if (!user) {
        return jsonError("Account not found", 404);
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return jsonError("Incorrect password", 403, "INVALID_PASSWORD");
      }

      await prisma.user.delete({ where: { id: user.id } });
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

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/account]", e);
    const message =
      e instanceof Error ? e.message : "Could not delete account";
    return jsonError(message, 500, "UNHANDLED");
  }
}
