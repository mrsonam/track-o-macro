import { prisma } from "@/lib/prisma";
import { isValidIanaTimeZone } from "@/lib/meals/validate-iana-time-zone";

export type MealTimingBandsRow = {
  morning_kcal: number;
  midday_kcal: number;
  evening_kcal: number;
  late_night_kcal: number;
  /** kcal with local hour >= 21 only (matches historical late-eating insight) */
  kcal_from_21_local: number;
  total_kcal: number;
};

/**
 * Aggregate meal kcal into local-time bands for the user’s IANA zone.
 */
export async function queryMealTimingBands(
  userId: string,
  fromD: Date,
  toD: Date,
  timeZone: string,
): Promise<MealTimingBandsRow | null> {
  if (!isValidIanaTimeZone(timeZone)) return null;

  const rows = await prisma.$queryRaw<MealTimingBandsRow[]>`
    SELECT
      COALESCE(SUM(CASE WHEN h >= 5 AND h < 12 THEN total_kcal ELSE 0 END), 0)::float AS morning_kcal,
      COALESCE(SUM(CASE WHEN h >= 12 AND h < 17 THEN total_kcal ELSE 0 END), 0)::float AS midday_kcal,
      COALESCE(SUM(CASE WHEN h >= 17 AND h < 21 THEN total_kcal ELSE 0 END), 0)::float AS evening_kcal,
      COALESCE(SUM(CASE WHEN h >= 21 OR h < 5 THEN total_kcal ELSE 0 END), 0)::float AS late_night_kcal,
      COALESCE(SUM(CASE WHEN h >= 21 THEN total_kcal ELSE 0 END), 0)::float AS kcal_from_21_local,
      COALESCE(SUM(total_kcal), 0)::float AS total_kcal
    FROM (
      SELECT m.total_kcal, EXTRACT(HOUR FROM timezone(${timeZone}::text, m.created_at))::int AS h
      FROM meals m
      WHERE m.user_id = ${userId}::uuid
        AND m.created_at >= ${fromD}
        AND m.created_at < ${toD}
    ) sub
  `;

  return rows[0] ?? null;
}
