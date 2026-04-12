type DraftForMigrate = { onboardingFlowVersion?: number };

/**
 * Map stored `onboarding_step` when step indices change mid-release.
 * Set `onboardingFlowVersion` ≥ 3 in draft after migration so we don’t double-shift.
 */
export function migrateOnboardingStepIndex(
  stored: number,
  lastStepIndex: number,
  draft: DraftForMigrate,
): number {
  const v = draft.onboardingFlowVersion ?? 0;
  const s = Math.max(0, Math.min(stored, lastStepIndex));

  if (v >= 3) {
    return s;
  }

  // v3: "preferences" inserted at index 5. Prior 8-step flow had safety=5, review=6, done=7.
  if (lastStepIndex >= 8 && s >= 5 && s <= 7) {
    return Math.min(s + 1, lastStepIndex);
  }

  // Older: 7 steps (0–6), done at 6 → 8-step done at 7
  if (stored === 6 && lastStepIndex >= 7 && lastStepIndex < 8) {
    return 7;
  }

  return s;
}
