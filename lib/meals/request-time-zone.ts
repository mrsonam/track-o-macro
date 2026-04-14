import { headers } from "next/headers";
import { isValidIanaTimeZone } from "@/lib/meals/validate-iana-time-zone";

/**
 * Best-effort IANA zone for rolling windows (insights, timing bands).
 * Vercel sets `x-vercel-ip-timezone`; otherwise falls back to UTC so SQL stays valid.
 */
export async function getRequestTimeZoneHeader(): Promise<string> {
  const h = await headers();
  const raw =
    h.get("x-vercel-ip-timezone") ?? h.get("x-forwarded-timezone") ?? null;
  if (raw && isValidIanaTimeZone(raw)) return raw;
  return "UTC";
}
