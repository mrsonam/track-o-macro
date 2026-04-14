import { addDays, subDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/** Oldest → newest: `dayCount` calendar days in `timeZone` ending on “today” in that zone. */
export function rollingNDateKeysInTimeZone(
  dayCount: number,
  timeZone: string,
): string[] {
  if (!Number.isFinite(dayCount) || dayCount < 1 || dayCount > 31) {
    throw new Error("dayCount must be between 1 and 31");
  }
  const now = new Date();
  const keys: string[] = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    keys.push(formatInTimeZone(subDays(now, i), timeZone, "yyyy-MM-dd"));
  }
  return keys;
}

export function rolling7DateKeysInTimeZone(timeZone: string): string[] {
  return rollingNDateKeysInTimeZone(7, timeZone);
}

/** Local calendar day bounds in `timeZone`, returned as UTC ISO strings (same contract as `localDayBoundsIsoFromYmd`). */
export function zonedDayBoundsIsoFromYmd(
  ymd: string,
  timeZone: string,
): { fromIso: string; toIso: string } {
  const start = fromZonedTime(`${ymd}T00:00:00`, timeZone);
  const end = addDays(start, 1);
  return { fromIso: start.toISOString(), toIso: end.toISOString() };
}

export function rolling7WindowBoundsUtcForZone(timeZone: string): {
  fromIso: string;
  toIso: string;
} {
  const keys = rolling7DateKeysInTimeZone(timeZone);
  const { fromIso } = zonedDayBoundsIsoFromYmd(keys[0]!, timeZone);
  const { toIso } = zonedDayBoundsIsoFromYmd(keys[6]!, timeZone);
  return { fromIso, toIso };
}

export function rolling14WindowBoundsUtcForZone(timeZone: string): {
  fromIso: string;
  toIso: string;
} {
  const keys = rollingNDateKeysInTimeZone(14, timeZone);
  const { fromIso } = zonedDayBoundsIsoFromYmd(keys[0]!, timeZone);
  const { toIso } = zonedDayBoundsIsoFromYmd(keys[13]!, timeZone);
  return { fromIso, toIso };
}
