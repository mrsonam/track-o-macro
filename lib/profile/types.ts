import type {
  ActivityLevel,
  GoalIntent,
  GoalPace,
  SexForBmr,
} from "@/lib/nutrition/tdee";
import type { DietaryPattern, LoggingStyle } from "@/lib/profile/preferences";

/** Stored in UserProfile.draft while onboarding is in progress */
export type OnboardingDraft = {
  /** Bump when onboarding step indices change (client migration). */
  onboardingFlowVersion?: number;
  experience?: "beginner" | "intermediate" | "advanced";
  goal?: GoalIntent;
  /** Deficit/surplus size for lose/gain; omit for maintain. */
  goalPace?: GoalPace;
  heightCm?: number;
  weightKg?: number;
  age?: number;
  sex?: SexForBmr;
  activityLevel?: ActivityLevel;
  /** Epic 1 story 6–7 */
  loggingStyle?: LoggingStyle;
  dietaryPattern?: DietaryPattern;
  /** Comma-separated avoids; parsed on complete. */
  foodAvoidText?: string;
  /** Epic 1 safety step — must be true before review. */
  safetyAcknowledged?: boolean;
  /** Advanced: override computed calorie target. */
  manualTargetKcal?: number;
  /** Advanced: daily protein from body weight × this (g protein per kg). */
  proteinGPerKg?: number;
};

export type { ActivityLevel, GoalIntent, GoalPace, SexForBmr };
export type { DietaryPattern, LoggingStyle };
