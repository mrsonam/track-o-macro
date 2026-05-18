"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft } from "lucide-react";
import {
  ONBOARDING_LAST_STEP_INDEX,
  ONBOARDING_STEPS,
  STEP_META,
  type OnboardingStepId,
} from "./onboarding-copy";
import { OnboardingHeader } from "@/components/onboarding/onboarding-header";
import { OnboardingLoading } from "@/components/onboarding/onboarding-loading";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { OnboardingStepContent } from "@/components/onboarding/onboarding-step-content";
import type { OnboardingDraft } from "@/lib/profile/types";
import { computeTargets } from "@/lib/profile/compute-profile-targets";
import { migrateOnboardingStepIndex } from "@/lib/profile/onboarding-step-migrate";
import { useAppMotion } from "@/lib/motion";

function metricsValid(d: OnboardingDraft): boolean {
  return (
    d.heightCm != null &&
    d.heightCm >= 80 &&
    d.heightCm <= 250 &&
    d.weightKg != null &&
    d.weightKg >= 25 &&
    d.weightKg <= 400 &&
    d.age != null &&
    d.age >= 13 &&
    d.age <= 120 &&
    d.sex != null
  );
}

function primaryCtaLabel(stepIndex: number, step: OnboardingStepId): string {
  if (stepIndex === ONBOARDING_LAST_STEP_INDEX) return "Open dashboard";
  if (step === "review") return "Finish setup";
  return "Continue";
}

export function OnboardingWizard() {
  const router = useRouter();
  const { motionOn } = useAppMotion();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>({});

  const persist = useCallback(
    async (next: {
      stepIndex: number;
      nextDraft: OnboardingDraft;
      complete?: boolean;
    }) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            onboardingStep: next.stepIndex,
            draft: next.nextDraft,
            ...(next.complete ? { complete: true } : {}),
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Could not save your progress. Try again.");
          return false;
        }
        return true;
      } catch {
        setError("Connection problem. Check your network and try again.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        const data = (await res.json()) as {
          profile: {
            onboardingStep: number;
            draft: unknown;
            onboardingCompletedAt: string | null;
          } | null;
        };
        if (!res.ok) return;
        if (cancelled) return;
        if (data.profile?.onboardingCompletedAt) {
          router.replace("/dashboard");
          return;
        }
        if (data.profile) {
          let d = (data.profile.draft ?? {}) as OnboardingDraft;
          if ((d.goal === "lose" || d.goal === "gain") && d.goalPace == null) {
            d = { ...d, goalPace: "moderate" };
          }
          const rawStep = data.profile.onboardingStep;
          const migratedIdx = migrateOnboardingStepIndex(
            rawStep,
            ONBOARDING_LAST_STEP_INDEX,
            d,
          );
          const nextDraft: OnboardingDraft = {
            ...d,
            onboardingFlowVersion: Math.max(d.onboardingFlowVersion ?? 0, 3),
          };
          if (migratedIdx !== rawStep || (d.onboardingFlowVersion ?? 0) < 3) {
            await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                onboardingStep: migratedIdx,
                draft: nextDraft,
              }),
            });
            d = nextDraft;
          }
          setDraft(d);
          setStepIndex(migratedIdx);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const previewTargets = useMemo(() => {
    if (!metricsValid(draft) || draft.activityLevel == null || draft.goal == null) {
      return null;
    }
    if ((draft.goal === "lose" || draft.goal === "gain") && draft.goalPace == null) {
      return null;
    }
    return computeTargets({
      heightCm: draft.heightCm!,
      weightKg: draft.weightKg!,
      age: draft.age!,
      sex: draft.sex!,
      activityLevel: draft.activityLevel,
      goalIntent: draft.goal,
      goalPace: draft.goal === "maintain" ? undefined : (draft.goalPace ?? "moderate"),
    });
  }, [draft]);

  const displayTargetKcal = useMemo(() => {
    if (previewTargets == null) return null;
    if (draft.manualTargetKcal != null) {
      return Math.min(10000, Math.max(800, Math.round(draft.manualTargetKcal)));
    }
    return previewTargets.targetKcal;
  }, [draft.manualTargetKcal, previewTargets]);

  const step = ONBOARDING_STEPS[stepIndex] as OnboardingStepId;
  const meta = STEP_META[step];

  const canContinue =
    step === "welcome" ||
    (step === "experience" && !!draft.experience) ||
    (step === "goal" && !!draft.goal && (draft.goal === "maintain" || draft.goalPace != null)) ||
    (step === "metrics" && metricsValid(draft)) ||
    (step === "activity" && !!draft.activityLevel) ||
    (step === "preferences" && !!draft.loggingStyle && !!draft.dietaryPattern) ||
    (step === "safety" && !!draft.safetyAcknowledged) ||
    (step === "review" && previewTargets != null && displayTargetKcal != null) ||
    step === "done";

  async function goNext() {
    const nextIndex = Math.min(stepIndex + 1, ONBOARDING_LAST_STEP_INDEX);
    if (stepIndex === ONBOARDING_LAST_STEP_INDEX) return;
    const ok = await persist({ stepIndex: nextIndex, nextDraft: draft });
    if (ok) setStepIndex(nextIndex);
  }

  async function goBack() {
    const prev = Math.max(0, stepIndex - 1);
    const ok = await persist({ stepIndex: prev, nextDraft: draft });
    if (ok) setStepIndex(prev);
  }

  async function finish() {
    const ok = await persist({
      stepIndex: ONBOARDING_LAST_STEP_INDEX,
      nextDraft: draft,
      complete: true,
    });
    if (ok) {
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function onSignOut() {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return <OnboardingLoading />;
  }

  const stepBody = (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-[color:var(--foreground)] sm:text-4xl">
          {meta.title}
        </h1>
        <p className="mt-3 max-w-prose text-base font-medium leading-relaxed text-zinc-600">
          {meta.description}
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm font-bold text-red-600"
        >
          {error}
        </div>
      ) : null}

      <OnboardingStepContent
        step={step}
        draft={draft}
        setDraft={setDraft}
        displayTargetKcal={displayTargetKcal}
        previewTargets={previewTargets}
      />
    </>
  );

  return (
    <div className="fresh-shell flex min-h-dvh flex-col px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <OnboardingHeader onSignOut={() => void onSignOut()} saving={saving} />
        <OnboardingProgress currentIndex={stepIndex} />

        <div className="flex flex-1 flex-col">
          <div className="bento-card flex flex-1 flex-col border-black/[0.08] bg-white/95 p-6 sm:p-8">
            {motionOn ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  className="flex flex-1 flex-col"
                >
                  {stepBody}
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex flex-1 flex-col">{stepBody}</div>
            )}

            <footer className="mt-10 flex gap-3 border-t border-black/[0.06] pt-8">
              {stepIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => void goBack()}
                  disabled={saving}
                  aria-label="Back"
                  className="focus-ring tap-target flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-black/[0.08] bg-white text-zinc-600 transition-colors duration-200 hover:border-black/15 hover:text-[color:var(--foreground)] disabled:opacity-50"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  stepIndex === ONBOARDING_LAST_STEP_INDEX ? void finish() : void goNext()
                }
                disabled={!canContinue || saving}
                aria-busy={saving}
                className="btn-primary tap-target flex h-14 flex-1 cursor-pointer items-center justify-center gap-2 text-base disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : primaryCtaLabel(stepIndex, step)}
                {!saving ? <ArrowRight className="h-5 w-5" aria-hidden /> : null}
              </button>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

