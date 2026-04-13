/**
 * Epic 6 — daily weight trajectory + EMA smoothing.
 * Future: non-scale progress signals (measurements, habits) can be merged here.
 */

export type DailyWeightPoint = { dateKey: string; weightKg: number };

export type WeightTrendPoint = {
  dateKey: string;
  rawKg: number;
  smoothedKg: number;
};

/** `YYYY-MM-DD` for `d` in the given IANA time zone. */
export function formatYmdInTimeZone(d: Date, timeZone: string): string {
  return d.toLocaleDateString("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** One weight per local calendar day (last log that day wins). Chronological order. */
export function collapseLogsToDaily(
  logs: { loggedAt: Date; weightKg: number }[],
  timeZone: string,
): DailyWeightPoint[] {
  const sorted = [...logs].sort(
    (a, b) => a.loggedAt.getTime() - b.loggedAt.getTime(),
  );
  const byDay = new Map<string, { w: number; t: number }>();
  for (const log of sorted) {
    const key = formatYmdInTimeZone(log.loggedAt, timeZone);
    const t = log.loggedAt.getTime();
    const prev = byDay.get(key);
    if (!prev || t >= prev.t) {
      byDay.set(key, { w: log.weightKg, t });
    }
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, v]) => ({ dateKey, weightKg: v.w }));
}

/** Exponential moving average, oldest → newest (first point is the seed). */
export function emaSmooth(values: number[], alpha: number): number[] {
  if (values.length === 0) return [];
  const out: number[] = [];
  let prev = values[0];
  for (const v of values) {
    prev = alpha * v + (1 - alpha) * prev;
    out.push(prev);
  }
  return out;
}

/** Default smoothing: responsive but stable for ~weekly check-ins. */
export const DEFAULT_WEIGHT_EMA_ALPHA = 0.28;

export function buildSmoothedTrend(
  daily: DailyWeightPoint[],
  alpha = DEFAULT_WEIGHT_EMA_ALPHA,
): WeightTrendPoint[] {
  if (daily.length === 0) return [];
  const raw = daily.map((d) => d.weightKg);
  const smoothed = emaSmooth(raw, alpha);
  return daily.map((d, i) => ({
    dateKey: d.dateKey,
    rawKg: d.weightKg,
    smoothedKg: smoothed[i],
  }));
}
