import type { OnboardingDraft } from "@/lib/profile/types";
import { computeTargets } from "@/lib/profile/compute-profile-targets";
import type { GoalPace } from "@/lib/nutrition/tdee";

export type BuiltTargets = {
  bmrKcal: number;
  tdeeKcal: number;
  targetKcal: number;
  targetProteinG: number | null;
  goalPaceForDb: string | null;
};

export function buildTargetsFromDraft(
  d: OnboardingDraft,
): BuiltTargets | null {
  if (
    d.heightCm == null ||
    d.weightKg == null ||
    d.age == null ||
    d.sex == null ||
    d.activityLevel == null ||
    d.goal == null
  ) {
    return null;
  }

  const pace: GoalPace | undefined =
    d.goal === "maintain" ? undefined : (d.goalPace ?? "moderate");

  const computed = computeTargets({
    heightCm: d.heightCm,
    weightKg: d.weightKg,
    age: d.age,
    sex: d.sex,
    activityLevel: d.activityLevel,
    goalIntent: d.goal,
    goalPace: pace,
  });

  const targetKcal =
    d.manualTargetKcal != null
      ? Math.min(
          10000,
          Math.max(800, Math.round(d.manualTargetKcal)),
        )
      : computed.targetKcal;

  const targetProteinG =
    d.proteinGPerKg != null
      ? Math.round(d.weightKg * d.proteinGPerKg)
      : null;

  return {
    bmrKcal: computed.bmrKcal,
    tdeeKcal: computed.tdeeKcal,
    targetKcal,
    targetProteinG,
    goalPaceForDb: d.goal === "maintain" ? null : (d.goalPace ?? "moderate"),
  };
}
