/**
 * Adaptive TDEE from intake + weight change over a window.
 * TDEE ≈ avgIntake − (Δkg × 7700) / spanDays — but raw values can go negative when
 * short-term scale swings (water) dominate; we cap implied shift and reject absurd results.
 */

export interface MetabolicDataPoint {
  date: string;
  kcal: number;
  weightKg?: number;
}

export interface MetabolicResult {
  adaptiveTDEE: number | null;
  confidenceScore: number; // 0 to 1
  weightDeltaKg: number | null;
  averageIntake: number | null;
  daysAnalyzed: number;
}

const KCAL_PER_KG_FAT_TISSUE = 7700;

/** Max implied kcal/day from mass change (limits water-weight blowups). */
const MAX_IMPLIED_SHIFT_KCAL_PER_DAY = 1500;

/** Plausible maintenance band for display (kcal/day). */
const MIN_MAINTENANCE_KCAL = 900;
const MAX_MAINTENANCE_KCAL = 7000;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Calculates Adaptive TDEE from daily buckets between first and last weight log.
 * The logic is: TDEE ≈ AvgIntake − (WeightChange × 7700 / spanDays)
 */
export function calculateMetabolicAdaptation(
  data: MetabolicDataPoint[],
): MetabolicResult {
  const pointsWithWeight = data.filter((p) => p.weightKg !== undefined);

  if (pointsWithWeight.length < 2) {
    return {
      adaptiveTDEE: null,
      confidenceScore: 0,
      weightDeltaKg: null,
      averageIntake: null,
      daysAnalyzed: data.length,
    };
  }

  const sortedWeights = [...pointsWithWeight].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const initialWeight = sortedWeights[0].weightKg!;
  const finalWeight = sortedWeights[sortedWeights.length - 1].weightKg!;
  const totalWeightDelta = finalWeight - initialWeight;

  const firstDateStr = sortedWeights[0].date;
  const lastDateStr = sortedWeights[sortedWeights.length - 1].date;

  const firstDate = new Date(`${firstDateStr}T12:00:00.000Z`);
  const lastDate = new Date(`${lastDateStr}T12:00:00.000Z`);
  const timeSpanDays = Math.max(
    1,
    (lastDate.getTime() - firstDate.getTime()) / MS_PER_DAY,
  );

  if (timeSpanDays < 3) {
    return {
      adaptiveTDEE: null,
      confidenceScore: 0.2,
      weightDeltaKg: totalWeightDelta,
      averageIntake: null,
      daysAnalyzed: data.length,
    };
  }

  // Intake only for days between first and last weight (inclusive), aligned with Δweight window
  const inSpan = data.filter(
    (p) => p.date >= firstDateStr && p.date <= lastDateStr,
  );
  const intakeSum = inSpan.reduce((acc, p) => acc + p.kcal, 0);
  const spanDayBuckets = Math.max(1, inSpan.length);
  const averageIntake = intakeSum / spanDayBuckets;

  if (!Number.isFinite(averageIntake) || averageIntake < 300) {
    return {
      adaptiveTDEE: null,
      confidenceScore: 0.15,
      weightDeltaKg: totalWeightDelta,
      averageIntake: null,
      daysAnalyzed: data.length,
    };
  }

  const rawShiftPerDay =
    (totalWeightDelta * KCAL_PER_KG_FAT_TISSUE) / timeSpanDays;

  // Cap implied energy imbalance from scale so water swings don't yield negative TDEE
  const cappedShiftPerDay = Math.max(
    -MAX_IMPLIED_SHIFT_KCAL_PER_DAY,
    Math.min(MAX_IMPLIED_SHIFT_KCAL_PER_DAY, rawShiftPerDay),
  );

  let adaptiveTDEE = averageIntake - cappedShiftPerDay;

  const wasCapped = Math.abs(cappedShiftPerDay - rawShiftPerDay) > 1e-6;

  if (
    !Number.isFinite(adaptiveTDEE) ||
    adaptiveTDEE < MIN_MAINTENANCE_KCAL ||
    adaptiveTDEE > MAX_MAINTENANCE_KCAL
  ) {
    return {
      adaptiveTDEE: null,
      confidenceScore: wasCapped ? 0.25 : 0.2,
      weightDeltaKg: totalWeightDelta,
      averageIntake: Math.round(averageIntake),
      daysAnalyzed: data.length,
    };
  }

  const dayCoverage = Math.min(data.length / 14, 1);
  const weightDensity = Math.min(pointsWithWeight.length / 7, 1);
  let confidenceScore = dayCoverage * 0.6 + weightDensity * 0.4;
  if (wasCapped) {
    confidenceScore *= 0.75;
  }

  return {
    adaptiveTDEE: Math.round(adaptiveTDEE),
    confidenceScore: Math.min(1, confidenceScore),
    weightDeltaKg: totalWeightDelta,
    averageIntake: Math.round(averageIntake),
    daysAnalyzed: data.length,
  };
}
