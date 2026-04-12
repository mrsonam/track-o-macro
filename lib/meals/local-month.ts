/** `YYYY-MM` in the user's local calendar (first of month components). */
export function formatYearMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Local calendar month as ISO bounds: [first day 00:00, first instant of next month).
 * `daysInMonth` is the count of calendar days (28–31), for per-day averages.
 */
export function calendarMonthMeta(ym: string): {
  fromIso: string;
  toIso: string;
  daysInMonth: number;
} | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12) return null;
  const start = new Date(y, mo - 1, 1, 0, 0, 0, 0);
  const endExclusive = new Date(y, mo, 1, 0, 0, 0, 0);
  if (Number.isNaN(start.getTime()) || Number.isNaN(endExclusive.getTime())) {
    return null;
  }
  const daysInMonth = new Date(y, mo, 0).getDate();
  return {
    fromIso: start.toISOString(),
    toIso: endExclusive.toISOString(),
    daysInMonth,
  };
}

/** Most recent `count` months including the current month (`YYYY-MM`, newest first). */
export function recentYearMonths(count: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    out.push(formatYearMonth(d));
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

export function labelYearMonth(ym: string): string {
  const meta = calendarMonthMeta(ym);
  if (!meta) return ym;
  const start = new Date(meta.fromIso);
  if (Number.isNaN(start.getTime())) return ym;
  return start.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}
