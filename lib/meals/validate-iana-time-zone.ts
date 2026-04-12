/** Reject junk before using a value in SQL `timezone(...)` or similar. */
const TZ_SHAPE = /^[A-Za-z0-9_+\/-]{2,80}$/;

export function isValidIanaTimeZone(tz: string): boolean {
  if (!TZ_SHAPE.test(tz)) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
