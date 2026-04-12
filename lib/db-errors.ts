import { Prisma } from "@prisma/client";

const CONNECTION_CODES = new Set(["P1001", "P1002", "P1017"]);

function prismaErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const e = error as { code?: unknown; name?: unknown };
  if (typeof e.code === "string") return e.code;
  return undefined;
}

function prismaErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "";
}

/**
 * True when Prisma reports the DB is unreachable or the connection dropped.
 * Uses message/code duck-typing as well as `instanceof`, because Turbopack can
 * load duplicate `@prisma/client` copies and break `instanceof` checks.
 */
export function isDbUnavailableError(error: unknown): boolean {
  const code = prismaErrorCode(error);
  if (code && CONNECTION_CODES.has(code)) return true;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return CONNECTION_CODES.has(error.code);
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name: unknown }).name)
      : "";
  if (
    name === "PrismaClientKnownRequestError" ||
    name === "PrismaClientInitializationError"
  ) {
    if (code && CONNECTION_CODES.has(code)) return true;
  }

  const msg = prismaErrorMessage(error);
  if (messageImpliesUnreachable(msg)) return true;

  const cause = error && typeof error === "object" && "cause" in error
    ? (error as { cause: unknown }).cause
    : undefined;
  if (cause != null && cause !== error) {
    if (isDbUnavailableError(cause)) return true;
  }

  return false;
}

function messageImpliesUnreachable(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("can't reach database server") ||
    lower.includes("server has closed the connection") ||
    lower.includes("timed out fetching a new connection") ||
    lower.includes("error querying the database") ||
    lower.includes("econnrefused") ||
    lower.includes("etimedout") ||
    lower.includes("enotfound") ||
    lower.includes("getaddrinfo")
  );
}
