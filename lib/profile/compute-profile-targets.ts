import {
  calculateBmrKcal,
  calculateTargetKcal,
  calculateTdeeKcal,
  type ActivityLevel,
  type GoalIntent,
  type GoalPace,
  type SexForBmr,
} from "@/lib/nutrition/tdee";

export type MetricInput = {
  heightCm: number;
  weightKg: number;
  age: number;
  sex: SexForBmr;
  activityLevel: ActivityLevel;
  goalIntent: GoalIntent;
  /** Used for lose/gain; maintain ignores this. */
  goalPace?: GoalPace;
};

export function computeTargets(input: MetricInput) {
  const bmr = Math.round(
    calculateBmrKcal(
      input.weightKg,
      input.heightCm,
      input.age,
      input.sex,
    ),
  );
  const tdee = calculateTdeeKcal(
    input.weightKg,
    input.heightCm,
    input.age,
    input.sex,
    input.activityLevel,
  );
  const pace = input.goalPace ?? "moderate";
  const target = calculateTargetKcal(
    tdee,
    input.goalIntent,
    input.goalIntent === "maintain" ? "moderate" : pace,
  );
  return { bmrKcal: bmr, tdeeKcal: tdee, targetKcal: target };
}
