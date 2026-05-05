import type { Prisma } from "@prisma/client";

/** Daily aggregates for Apple-ingested metrics (merged into meal day summaries). */
export type AppleHealthDayRollup = {
  steps: number | null;
  activeEnergyKcal: number | null;
  restingEnergyKcal: number | null;
  exerciseMinutes: number | null;
  standHours: number | null;
  distanceM: number | null;
  sleepMinutes: number | null;
  heartRateAvgBpm: number | null;
  weightKg: number | null;
  bodyFatPct: number | null;
  workoutEnergyKcal: number | null;
  workoutMinutes: number | null;
};

export function emptyAppleHealthRollup(): AppleHealthDayRollup {
  return {
    steps: null,
    activeEnergyKcal: null,
    restingEnergyKcal: null,
    exerciseMinutes: null,
    standHours: null,
    distanceM: null,
    sleepMinutes: null,
    heartRateAvgBpm: null,
    weightKg: null,
    bodyFatPct: null,
    workoutEnergyKcal: null,
    workoutMinutes: null,
  };
}

type SampleRow = {
  metricType: string;
  value: Prisma.Decimal | number;
  unit: string;
  recordedAt: Date;
};

function num(v: Prisma.Decimal | number): number {
  return typeof v === "number" ? v : Number(v);
}

function maxNullable(current: number | null, next: number): number | null {
  if (current == null) return next;
  return Math.max(current, next);
}

/**
 * Build a single-day rollup from normalized rows whose `recordedAt` falls in `[fromD, toD)`.
 * Heuristics favor Apple “daily total” style Shortcuts (max for totals, sum for additive workouts/sleep segments).
 */
export function rollupAppleHealthSamplesInRange(
  samples: SampleRow[],
  fromD: Date,
  toD: Date,
): AppleHealthDayRollup {
  const slice = samples.filter(
    (s) => s.recordedAt >= fromD && s.recordedAt < toD,
  );
  if (slice.length === 0) return emptyAppleHealthRollup();

  const out = emptyAppleHealthRollup();
  let hrSum = 0;
  let hrN = 0;

  let latestWeight: { t: number; v: number } | null = null;
  let latestBf: { t: number; v: number } | null = null;

  for (const s of slice) {
    const v = num(s.value);
    if (!Number.isFinite(v)) continue;
    switch (s.metricType) {
      case "steps":
        out.steps = maxNullable(out.steps, v);
        break;
      case "active_energy":
        out.activeEnergyKcal = maxNullable(out.activeEnergyKcal, v);
        break;
      case "resting_energy":
        out.restingEnergyKcal = maxNullable(out.restingEnergyKcal, v);
        break;
      case "exercise_minutes":
        out.exerciseMinutes = maxNullable(out.exerciseMinutes, v);
        break;
      case "stand_hours":
        out.standHours = maxNullable(out.standHours, v);
        break;
      case "distance":
        out.distanceM = maxNullable(out.distanceM, v);
        break;
      case "sleep":
        out.sleepMinutes = (out.sleepMinutes ?? 0) + v;
        break;
      case "heart_rate":
        hrSum += v;
        hrN += 1;
        break;
      case "weight": {
        const t = s.recordedAt.getTime();
        if (!latestWeight || t >= latestWeight.t) latestWeight = { t, v };
        break;
      }
      case "body_fat": {
        const t = s.recordedAt.getTime();
        if (!latestBf || t >= latestBf.t) latestBf = { t, v };
        break;
      }
      case "workout":
        if (s.unit === "kcal") {
          out.workoutEnergyKcal = (out.workoutEnergyKcal ?? 0) + v;
        } else if (s.unit === "min") {
          out.workoutMinutes = (out.workoutMinutes ?? 0) + v;
        }
        break;
      default:
        break;
    }
  }

  if (hrN > 0) out.heartRateAvgBpm = Math.round((hrSum / hrN) * 10) / 10;
  if (latestWeight) out.weightKg = latestWeight.v;
  if (latestBf) out.bodyFatPct = latestBf.v;

  if (out.sleepMinutes != null && out.sleepMinutes <= 0) out.sleepMinutes = null;
  if (out.workoutEnergyKcal != null && out.workoutEnergyKcal <= 0) {
    out.workoutEnergyKcal = null;
  }
  if (out.workoutMinutes != null && out.workoutMinutes <= 0) {
    out.workoutMinutes = null;
  }

  return out;
}

export function rollupHasAnyData(r: AppleHealthDayRollup): boolean {
  return Object.values(r).some((v) => v != null);
}
