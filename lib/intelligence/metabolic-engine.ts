import { Prisma } from "@prisma/client";

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

const KCAL_PER_KG_FAT_TISSUE = 7700; // Average estimate for body mass change

/**
 * Calculates Adaptive TDEE based on a 14-day window of food and weight data.
 * The logic is: TDEE = AvgIntake - (WeightChange * 7700 / Days)
 */
export function calculateMetabolicAdaptation(
  data: MetabolicDataPoint[]
): MetabolicResult {
  const pointsWithWeight = data.filter(p => p.weightKg !== undefined);
  
  if (pointsWithWeight.length < 2) {
    return {
      adaptiveTDEE: null,
      confidenceScore: 0,
      weightDeltaKg: null,
      averageIntake: null,
      daysAnalyzed: data.length
    };
  }

  // 1. Calculate Weight Change (Linear Regression or start-end delta)
  // For simplicity and resilience to few data points, we use the average of first 3 and last 3 weight logs if available
  const sortedWeights = [...pointsWithWeight].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const initialWeight = sortedWeights[0].weightKg!;
  const finalWeight = sortedWeights[sortedWeights.length - 1].weightKg!;
  const totalWeightDelta = finalWeight - initialWeight;
  
  const firstDate = new Date(sortedWeights[0].date);
  const lastDate = new Date(sortedWeights[sortedWeights.length - 1].date);
  const timeSpanDays = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (timeSpanDays < 3) {
    return {
      adaptiveTDEE: null,
      confidenceScore: 0.2, // Low confidence if span is too short
      weightDeltaKg: totalWeightDelta,
      averageIntake: null,
      daysAnalyzed: data.length
    };
  }

  // 2. Average Intake over the same span
  const intakeSum = data.reduce((acc, p) => acc + p.kcal, 0);
  const averageIntake = intakeSum / data.length;

  // 3. Calculate Metabolic Offset
  // Mass change in calories: (delta kg * 7700)
  // Calories shifted per day: (delta kg * 7700) / span
  const calorieShiftPerDay = (totalWeightDelta * KCAL_PER_KG_FAT_TISSUE) / timeSpanDays;
  
  // TDEE = Maintenance. If weight went up, TDEE is lower than intake.
  const adaptiveTDEE = averageIntake - calorieShiftPerDay;

  // 4. Confidence Score
  // Higher if we have more points and longer span
  const dayCoverage = Math.min(data.length / 14, 1);
  const weightDensity = Math.min(pointsWithWeight.length / 7, 1);
  const confidenceScore = (dayCoverage * 0.6) + (weightDensity * 0.4);

  return {
    adaptiveTDEE: Math.round(adaptiveTDEE),
    confidenceScore,
    weightDeltaKg: totalWeightDelta,
    averageIntake: Math.round(averageIntake),
    daysAnalyzed: data.length
  };
}
