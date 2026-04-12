/** `YYYY-MM-DD` in the user's local calendar (for stable day keys). */
export function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse `YYYY-MM-DD` as local midnight (components, not UTC). */
export function parseLocalYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** Local [start, end) for that calendar day, as ISO strings for the API. */
export function localDayBoundsIsoFromYmd(ymd: string): {
  fromIso: string;
  toIso: string;
} {
  const start = parseLocalYmd(ymd);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid date key");
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { fromIso: start.toISOString(), toIso: end.toISOString() };
}

/** Oldest → newest: `dayCount` local calendar days ending today (`dayCount` ≥ 1). */
export function rollingNDateKeys(dayCount: number): string[] {
  if (!Number.isFinite(dayCount) || dayCount < 1 || dayCount > 31) {
    throw new Error("dayCount must be between 1 and 31");
  }
  const keys: string[] = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(formatLocalYmd(d));
  }
  return keys;
}

/** Oldest → newest: seven local days ending today (rolling week). */
export function rolling7DateKeys(): string[] {
  return rollingNDateKeys(7);
}

/** Inclusive rolling week: local start of 6 days ago → local end of today (exclusive upper bound ISO). */
export function rolling7WindowBoundsIso(): { fromIso: string; toIso: string } {
  const keys = rolling7DateKeys();
  const { fromIso } = localDayBoundsIsoFromYmd(keys[0]!);
  const { toIso } = localDayBoundsIsoFromYmd(keys[6]!);
  return { fromIso, toIso };
}

/** Fourteen local days ending today (rolling fortnight). */
export function rolling14DateKeys(): string[] {
  return rollingNDateKeys(14);
}

/** Local start of 13 days ago through end of today (exclusive upper bound on `toIso`). */
export function rolling14WindowBoundsIso(): { fromIso: string; toIso: string } {
  const keys = rolling14DateKeys();
  const { fromIso } = localDayBoundsIsoFromYmd(keys[0]!);
  const { toIso } = localDayBoundsIsoFromYmd(keys[13]!);
  return { fromIso, toIso };
}

export function dayHeadingLabel(dateKey: string): string {
  const today = formatLocalYmd(new Date());
  if (dateKey === today) return "Today";

  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (dateKey === formatLocalYmd(y)) return "Yesterday";

  const d = parseLocalYmd(dateKey);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
