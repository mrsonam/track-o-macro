import type { OnboardingStepId } from "@/app/onboarding/onboarding-copy";
import { ONBOARDING_STEPS, STEP_META } from "@/app/onboarding/onboarding-copy";

type OnboardingProgressProps = {
  currentIndex: number;
};

export function OnboardingProgress({ currentIndex }: OnboardingProgressProps) {
  const stepId = ONBOARDING_STEPS[currentIndex] as OnboardingStepId;
  const meta = STEP_META[stepId];

  return (
    <div className="mb-10" aria-label={`Setup progress, step ${currentIndex + 1} of ${ONBOARDING_STEPS.length}`}>
      <div className="flex gap-1.5" aria-hidden>
        {ONBOARDING_STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i <= currentIndex
                ? "bg-[color:var(--accent-secondary)]"
                : "bg-black/[0.08]"
            }`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="landing-kicker text-[color:var(--accent-secondary)]">
          Step {currentIndex + 1} of {ONBOARDING_STEPS.length}
        </p>
        <p className="text-xs font-bold text-zinc-500">{meta.shortLabel}</p>
      </div>
    </div>
  );
}
