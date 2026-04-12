"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import type { OnboardingDraft } from "@/lib/profile/types";
import { AuthShell } from "@/components/auth-shell";
import { ACTIVITY_LABELS } from "@/lib/nutrition/tdee";
import type { ActivityLevel } from "@/lib/nutrition/tdee";
import { computeTargets } from "@/lib/profile/compute-profile-targets";
import { migrateOnboardingStepIndex } from "@/lib/profile/onboarding-step-migrate";
import {
  DIETARY_PATTERN_LABELS,
  LOGGING_STYLE_LABELS,
  parseFoodAvoidList,
} from "@/lib/profile/preferences";

const STEPS = [
  "welcome",
  "experience",
  "goal",
  "metrics",
  "activity",
  "preferences",
  "safety",
  "review",
  "done",
] as const;
const LAST_STEP_INDEX = STEPS.length - 1;

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-8" aria-hidden>
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= current
                ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                : "bg-stone-200"
            }`}
          />
        ))}
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800/90">
        Step {current + 1} of {total}
      </p>
    </div>
  );
}

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

export function OnboardingWizard() {
  const router = useRouter();
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
          setError(data.error ?? "Could not save");
          return false;
        }
        return true;
      } catch {
        setError("Network error");
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
          router.replace("/");
          return;
        }
        if (data.profile) {
          let d = (data.profile.draft ?? {}) as OnboardingDraft;
          if (
            (d.goal === "lose" || d.goal === "gain") &&
            d.goalPace == null
          ) {
            d = { ...d, goalPace: "moderate" };
          }
          const rawStep = data.profile.onboardingStep;
          const migratedIdx = migrateOnboardingStepIndex(
            rawStep,
            LAST_STEP_INDEX,
            d,
          );
          const nextDraft: OnboardingDraft = {
            ...d,
            onboardingFlowVersion: Math.max(d.onboardingFlowVersion ?? 0, 3),
          };
          if (
            migratedIdx !== rawStep ||
            (d.onboardingFlowVersion ?? 0) < 3
          ) {
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
    if (
      !metricsValid(draft) ||
      draft.activityLevel == null ||
      draft.goal == null
    ) {
      return null;
    }
    if (
      (draft.goal === "lose" || draft.goal === "gain") &&
      draft.goalPace == null
    ) {
      return null;
    }
    return computeTargets({
      heightCm: draft.heightCm!,
      weightKg: draft.weightKg!,
      age: draft.age!,
      sex: draft.sex!,
      activityLevel: draft.activityLevel,
      goalIntent: draft.goal,
      goalPace:
        draft.goal === "maintain"
          ? undefined
          : (draft.goalPace ?? "moderate"),
    });
  }, [draft]);

  const displayTargetKcal = useMemo(() => {
    if (previewTargets == null) return null;
    if (draft.manualTargetKcal != null) {
      return Math.min(
        10000,
        Math.max(800, Math.round(draft.manualTargetKcal)),
      );
    }
    return previewTargets.targetKcal;
  }, [draft.manualTargetKcal, previewTargets]);

  const previewProteinG =
    draft.proteinGPerKg != null && draft.weightKg != null
      ? Math.round(draft.weightKg * draft.proteinGPerKg)
      : null;

  const avoidPreview = useMemo(
    () => parseFoodAvoidList(draft.foodAvoidText ?? ""),
    [draft.foodAvoidText],
  );

  async function goNext() {
    const nextIndex = Math.min(stepIndex + 1, LAST_STEP_INDEX);
    if (stepIndex === LAST_STEP_INDEX) return;

    const ok = await persist({
      stepIndex: nextIndex,
      nextDraft: draft,
    });
    if (ok) setStepIndex(nextIndex);
  }

  async function goBack() {
    const prev = Math.max(0, stepIndex - 1);
    const ok = await persist({ stepIndex: prev, nextDraft: draft });
    if (ok) setStepIndex(prev);
  }

  async function finish() {
    const ok = await persist({
      stepIndex: LAST_STEP_INDEX,
      nextDraft: draft,
      complete: true,
    });
    if (ok) {
      router.push("/");
      router.refresh();
    }
  }

  async function onSignOut() {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center px-4 py-16 text-stone-500">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-emerald-200/80" />
          <p className="text-sm">Loading your setup…</p>
        </div>
      </div>
    );
  }

  const step = STEPS[stepIndex];

  const choiceClass = (selected: boolean) =>
    `flex cursor-pointer flex-col rounded-xl border px-4 py-3.5 text-left transition-all duration-200 ${
      selected
        ? "border-emerald-500/70 bg-emerald-50/90 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]"
        : "border-stone-200/90 bg-white/90 hover:border-stone-300 hover:shadow-sm"
    }`;

  const canContinue =
    step === "welcome" ||
    (step === "experience" && !!draft.experience) ||
    (step === "goal" &&
      !!draft.goal &&
      (draft.goal === "maintain" ||
        draft.goalPace != null)) ||
    (step === "metrics" && metricsValid(draft)) ||
    (step === "activity" && !!draft.activityLevel) ||
    (step === "preferences" &&
      !!draft.loggingStyle &&
      !!draft.dietaryPattern) ||
    (step === "safety" && !!draft.safetyAcknowledged) ||
    (step === "review" && previewTargets != null && displayTargetKcal != null) ||
    step === "done";

  return (
    <AuthShell size="lg">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="btn-ghost -mr-2 text-stone-500"
        >
          Sign out
        </button>
      </div>

      <StepProgress current={stepIndex} total={STEPS.length} />

      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
        {step === "welcome" && "Welcome to Calorie Agent"}
        {step === "experience" && "How do you track today?"}
        {step === "goal" && "What’s your main focus?"}
        {step === "metrics" && "Your measurements"}
        {step === "activity" && "How active is your typical week?"}
        {step === "preferences" && "Food & logging style"}
        {step === "safety" && "Before we show your target"}
        {step === "review" && "Your calorie target"}
        {step === "done" && "You’re set"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        {step === "welcome" &&
          "A few quick choices so the app fits beginners and macro pros alike. You can change this anytime in settings later."}
        {step === "experience" &&
          "This only changes how we explain numbers—not your worth."}
        {step === "goal" &&
          "Rough direction is enough. Targets are starting points, not rules."}
        {step === "metrics" &&
          "We use height, weight, age, and sex to estimate energy needs (Mifflin–St Jeor). Not medical advice."}
        {step === "activity" &&
          "We combine this with your goal to suggest a daily calorie target."}
        {step === "preferences" &&
          "This helps us tailor tips later—it never affects your worth or judgment."}
        {step === "safety" &&
          "Calorie Agent supports self-tracking—it does not diagnose or treat medical conditions."}
        {step === "review" &&
          "These are estimates. Adjust in settings if your coach or clinician gave you different numbers."}
        {step === "done" &&
          "We’ll use this to personalize insights as we build more features."}
      </p>

      {error ? (
        <p
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-6">
        {step === "welcome" ? (
          <p className="text-sm leading-relaxed text-stone-700">
            Logging works best when it matches your style. Next, pick the
            experience level that fits you.
          </p>
        ) : null}

        {step === "experience" ? (
          <div className="flex flex-col gap-2.5">
            {(
              [
                {
                  id: "beginner" as const,
                  title: "Just getting started",
                  desc: "New to tracking or prefer simple totals.",
                },
                {
                  id: "intermediate" as const,
                  title: "Somewhere in between",
                  desc: "Comfortable with calories and rough macros.",
                },
                {
                  id: "advanced" as const,
                  title: "I track macros",
                  desc: "You want control over protein, carbs, and fat.",
                },
              ] as const
            ).map((opt) => (
              <label key={opt.id} className={choiceClass(draft.experience === opt.id)}>
                <input
                  type="radio"
                  name="experience"
                  className="sr-only"
                  checked={draft.experience === opt.id}
                  onChange={() =>
                    setDraft((d) => ({ ...d, experience: opt.id }))
                  }
                />
                <span className="font-medium text-stone-900">{opt.title}</span>
                <span className="text-sm text-stone-600">{opt.desc}</span>
              </label>
            ))}
          </div>
        ) : null}

        {step === "goal" ? (
          <div className="flex flex-col gap-2.5">
            {(
              [
                {
                  id: "lose" as const,
                  title: "Lose fat",
                  desc: "Sustainable deficit, not crash dieting.",
                },
                {
                  id: "maintain" as const,
                  title: "Maintain",
                  desc: "Stay roughly where you are.",
                },
                {
                  id: "gain" as const,
                  title: "Gain muscle / lean bulk",
                  desc: "Small surplus with training in mind.",
                },
              ] as const
            ).map((opt) => (
              <label key={opt.id} className={choiceClass(draft.goal === opt.id)}>
                <input
                  type="radio"
                  name="goal"
                  className="sr-only"
                  checked={draft.goal === opt.id}
                  onChange={() =>
                    setDraft((d) => ({
                      ...d,
                      goal: opt.id,
                      goalPace:
                        opt.id === "maintain"
                          ? undefined
                          : (d.goalPace ?? "moderate"),
                    }))
                  }
                />
                <span className="font-medium text-stone-900">{opt.title}</span>
                <span className="text-sm text-stone-600">{opt.desc}</span>
              </label>
            ))}
            {draft.goal === "lose" || draft.goal === "gain" ? (
              <div className="mt-5 flex flex-col gap-2.5">
                <p className="text-sm font-medium text-stone-800">
                  How fast do you want to move?
                </p>
                <p className="text-xs text-stone-500">
                  {draft.goal === "lose"
                    ? "Larger deficits are harder to sustain. When in doubt, start gentler."
                    : "Smaller surpluses tend to minimize fat gain alongside muscle."}
                </p>
                {(
                  draft.goal === "lose"
                    ? (
                        [
                          {
                            id: "gentle" as const,
                            title: "Gentle",
                            desc: "~250 kcal under your estimated maintenance per day.",
                          },
                          {
                            id: "moderate" as const,
                            title: "Moderate",
                            desc: "~400 kcal under maintenance — a common starting point.",
                          },
                          {
                            id: "aggressive" as const,
                            title: "Aggressive",
                            desc: "~550 kcal under maintenance — only if you feel good on it.",
                          },
                        ] as const
                      )
                    : (
                        [
                          {
                            id: "gentle" as const,
                            title: "Gentle",
                            desc: "~200 kcal above maintenance per day.",
                          },
                          {
                            id: "moderate" as const,
                            title: "Moderate",
                            desc: "~300 kcal above maintenance.",
                          },
                          {
                            id: "aggressive" as const,
                            title: "Aggressive",
                            desc: "~450 kcal above maintenance.",
                          },
                        ] as const
                      )
                ).map((opt) => (
                  <label
                    key={opt.id}
                    className={choiceClass(draft.goalPace === opt.id)}
                  >
                    <input
                      type="radio"
                      name="goalPace"
                      className="sr-only"
                      checked={draft.goalPace === opt.id}
                      onChange={() =>
                        setDraft((d) => ({ ...d, goalPace: opt.id }))
                      }
                    />
                    <span className="font-medium text-stone-900">
                      {opt.title}
                    </span>
                    <span className="text-sm text-stone-600">{opt.desc}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "metrics" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-stone-800">Height (cm)</span>
              <input
                type="number"
                inputMode="decimal"
                min={80}
                max={250}
                className="input-field"
                value={draft.heightCm ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    heightCm: v === "" ? undefined : parseFloat(v),
                  }));
                }}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-stone-800">Weight (kg)</span>
              <input
                type="number"
                inputMode="decimal"
                min={25}
                max={400}
                step="0.1"
                className="input-field"
                value={draft.weightKg ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    weightKg: v === "" ? undefined : parseFloat(v),
                  }));
                }}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium text-stone-800">Age</span>
              <input
                type="number"
                inputMode="numeric"
                min={13}
                max={120}
                className="input-field max-w-xs"
                value={draft.age ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    age: v === "" ? undefined : parseInt(v, 10),
                  }));
                }}
              />
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-medium text-stone-800">
                Sex (for BMR estimate)
              </legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {(
                  [
                    ["male", "Male"],
                    ["female", "Female"],
                    ["unspecified", "Prefer not to say"],
                  ] as const
                ).map(([id, label]) => (
                  <label
                    key={id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="sex"
                      checked={draft.sex === id}
                      onChange={() =>
                        setDraft((d) => ({ ...d, sex: id }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        {step === "activity" ? (
          <div className="flex flex-col gap-2.5">
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => (
              <label key={k} className={choiceClass(draft.activityLevel === k)}>
                <input
                  type="radio"
                  name="activity"
                  className="sr-only"
                  checked={draft.activityLevel === k}
                  onChange={() =>
                    setDraft((d) => ({ ...d, activityLevel: k }))
                  }
                />
                <span className="font-medium text-stone-900">
                  {ACTIVITY_LABELS[k].title}
                </span>
                <span className="text-sm text-stone-600">
                  {ACTIVITY_LABELS[k].desc}
                </span>
              </label>
            ))}
          </div>
        ) : null}

        {step === "preferences" ? (
          <div className="flex flex-col gap-8">
            <div>
              <p className="text-sm font-medium text-stone-800">
                How do you usually log?
              </p>
              <div className="mt-3 flex flex-col gap-2.5">
                {(
                  Object.entries(LOGGING_STYLE_LABELS) as [
                    keyof typeof LOGGING_STYLE_LABELS,
                    (typeof LOGGING_STYLE_LABELS)["quick_estimates"],
                  ][]
                ).map(([id, opt]) => (
                  <label
                    key={id}
                    className={choiceClass(draft.loggingStyle === id)}
                  >
                    <input
                      type="radio"
                      name="loggingStyle"
                      className="sr-only"
                      checked={draft.loggingStyle === id}
                      onChange={() =>
                        setDraft((d) => ({ ...d, loggingStyle: id }))
                      }
                    />
                    <span className="font-medium text-stone-900">
                      {opt.title}
                    </span>
                    <span className="text-sm text-stone-600">{opt.desc}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-stone-800">
                Dietary pattern
              </p>
              <p className="mt-1 text-xs text-stone-500">
                For future tips only—not a rule about what you should eat.
              </p>
              <div className="mt-3 flex flex-col gap-2.5">
                {(
                  Object.entries(DIETARY_PATTERN_LABELS) as [
                    keyof typeof DIETARY_PATTERN_LABELS,
                    (typeof DIETARY_PATTERN_LABELS)["omnivore"],
                  ][]
                ).map(([id, opt]) => (
                  <label
                    key={id}
                    className={choiceClass(draft.dietaryPattern === id)}
                  >
                    <input
                      type="radio"
                      name="dietaryPattern"
                      className="sr-only"
                      checked={draft.dietaryPattern === id}
                      onChange={() =>
                        setDraft((d) => ({ ...d, dietaryPattern: id }))
                      }
                    />
                    <span className="font-medium text-stone-900">
                      {opt.title}
                    </span>
                    <span className="text-sm text-stone-600">{opt.desc}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-stone-800">
                  Foods to avoid or allergies (optional)
                </span>
                <span className="text-xs font-normal text-stone-500">
                  Comma-separated—e.g. peanuts, shellfish, dairy. We&apos;ll
                  store this for future features; always double-check labels.
                </span>
                <textarea
                  value={draft.foodAvoidText ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      foodAvoidText: e.target.value,
                    }))
                  }
                  rows={3}
                  maxLength={2000}
                  placeholder="e.g. tree nuts, sesame"
                  className="input-field resize-y text-[15px] leading-relaxed"
                />
              </label>
            </div>
          </div>
        ) : null}

        {step === "safety" ? (
          <div className="space-y-4 text-sm leading-relaxed text-stone-700">
            <ul className="list-disc space-y-2.5 pl-5">
              <li>
                This app is <strong>not medical advice</strong> and does not
                diagnose or treat any condition.
              </li>
              <li>
                Speak with a qualified professional if you are pregnant,
                managing diabetes with medication, have a history of eating
                disorders, or take medicines that affect appetite, metabolism,
                or weight.
              </li>
              <li>
                Calorie targets are rough estimates. Your body, activity, and
                health context matter more than any formula.
              </li>
            </ul>
            <p className="text-sm">
              <a
                href="/resources/eating-disorders"
                className="font-semibold text-emerald-800 underline decoration-emerald-800/35 underline-offset-2 hover:decoration-emerald-800"
              >
                Resources for eating concerns
              </a>
              <span className="text-stone-400"> · </span>
              <a
                href="/privacy"
                className="font-semibold text-emerald-800 underline decoration-emerald-800/35 underline-offset-2 hover:decoration-emerald-800"
              >
                Privacy
              </a>
            </p>
            <label className="flex cursor-pointer gap-3 rounded-xl border border-stone-200/90 bg-white/90 p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                checked={!!draft.safetyAcknowledged}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    safetyAcknowledged: e.target.checked,
                  }))
                }
              />
              <span>
                I understand I&apos;m using Calorie Agent for general
                self-tracking, not as a substitute for medical or dietetic care.
              </span>
            </label>
          </div>
        ) : null}

        {step === "review" &&
        previewTargets &&
        displayTargetKcal != null ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 text-sm text-stone-800">
              <p className="font-semibold text-stone-900">Daily calorie target</p>
              <p className="mt-3 text-3xl font-semibold tabular-nums text-emerald-900">
                ~{displayTargetKcal}{" "}
                <span className="text-lg font-medium text-emerald-800/80">
                  kcal
                </span>
              </p>
              {draft.manualTargetKcal != null ? (
                <p className="mt-2 text-xs text-emerald-900/90">
                  Using your custom calorie target instead of the formula
                  estimate ({previewTargets.targetKcal} kcal).
                </p>
              ) : null}
              {previewProteinG != null ? (
                <p className="mt-2 text-sm text-stone-700">
                  Protein goal:{" "}
                  <span className="font-semibold tabular-nums text-stone-900">
                    ~{previewProteinG} g
                  </span>
                  /day (from your g/kg entry).
                </p>
              ) : null}
              <details className="mt-4 rounded-lg border border-emerald-200/60 bg-white/60 px-3 py-2 text-xs text-stone-600">
                <summary className="cursor-pointer font-medium text-stone-800">
                  How we estimated this
                </summary>
                <p className="mt-2">
                  We use the <strong>Mifflin–St Jeor</strong> equation with your
                  height, weight, age, and sex to estimate resting energy (BMR),
                  then multiply by an activity factor for estimated maintenance
                  (TDEE).
                </p>
                <p className="mt-2">
                  Your goal adjusts TDEE:{" "}
                  {draft.goal === "maintain" && "we target maintenance."}
                  {draft.goal === "lose" &&
                    `we subtract roughly ${
                      draft.goalPace === "gentle"
                        ? "250"
                        : draft.goalPace === "aggressive"
                          ? "550"
                          : "400"
                    } kcal/day (your chosen pace).`}
                  {draft.goal === "gain" &&
                    `we add roughly ${
                      draft.goalPace === "gentle"
                        ? "200"
                        : draft.goalPace === "aggressive"
                          ? "450"
                          : "300"
                    } kcal/day (your chosen pace).`}
                </p>
                <p className="mt-2 text-stone-500">
                  Numbers are rounded. Not medical advice.
                </p>
              </details>
              <p className="mt-3 text-xs text-stone-500">
                BMR ~{previewTargets.bmrKcal} kcal · TDEE ~
                {previewTargets.tdeeKcal} kcal
              </p>
            </div>

            {draft.experience === "advanced" ? (
              <div className="rounded-xl border border-stone-200/90 bg-stone-50/90 p-4 text-sm text-stone-800">
                <p className="font-semibold text-stone-900">
                  Macro-focused options
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  Optional. Leave blank to use the estimate above.
                </p>
                <label className="mt-4 flex flex-col gap-1.5">
                  <span className="font-medium text-stone-800">
                    Custom daily calories (kcal)
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={800}
                    max={10000}
                    placeholder={`e.g. leave empty for ~${previewTargets.targetKcal}`}
                    className="input-field max-w-xs"
                    value={draft.manualTargetKcal ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraft((d) => ({
                        ...d,
                        manualTargetKcal:
                          v === "" ? undefined : parseFloat(v),
                      }));
                    }}
                  />
                </label>
                <label className="mt-4 flex flex-col gap-1.5">
                  <span className="font-medium text-stone-800">
                    Protein (g per kg body weight)
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0.5}
                    max={4}
                    step={0.1}
                    placeholder="e.g. 1.6 — optional"
                    className="input-field max-w-xs"
                    value={draft.proteinGPerKg ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraft((d) => ({
                        ...d,
                        proteinGPerKg:
                          v === "" ? undefined : parseFloat(v),
                      }));
                    }}
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "done" && previewTargets && displayTargetKcal != null ? (
          <div className="space-y-4 rounded-xl border border-stone-200/90 bg-stone-50/90 p-4 text-sm text-stone-800">
            <p className="font-semibold text-stone-900">Summary</p>
            <ul className="space-y-2 border-b border-stone-200/80 pb-3 text-stone-700">
              <li className="flex justify-between gap-4">
                <span className="text-stone-500">Daily target</span>
                <span className="font-semibold tabular-nums text-emerald-900">
                  ~{displayTargetKcal} kcal
                </span>
              </li>
              {previewProteinG != null ? (
                <li className="flex justify-between gap-4">
                  <span className="text-stone-500">Protein goal</span>
                  <span className="font-semibold tabular-nums text-emerald-900">
                    ~{previewProteinG} g/day
                  </span>
                </li>
              ) : null}
              <li className="flex justify-between gap-4">
                <span className="text-stone-500">Height / weight</span>
                <span className="font-medium">
                  {draft.heightCm} cm · {draft.weightKg} kg
                </span>
              </li>
              <li className="flex justify-between gap-4">
                <span className="text-stone-500">Experience</span>
                <span className="font-medium">
                  {draft.experience === "beginner" && "Getting started"}
                  {draft.experience === "intermediate" && "In between"}
                  {draft.experience === "advanced" && "Macro-focused"}
                </span>
              </li>
              {draft.loggingStyle ? (
                <li className="flex justify-between gap-4">
                  <span className="text-stone-500">Logging style</span>
                  <span className="font-medium text-right">
                    {LOGGING_STYLE_LABELS[draft.loggingStyle].title}
                  </span>
                </li>
              ) : null}
              {draft.dietaryPattern ? (
                <li className="flex justify-between gap-4">
                  <span className="text-stone-500">Dietary pattern</span>
                  <span className="font-medium text-right">
                    {DIETARY_PATTERN_LABELS[draft.dietaryPattern].title}
                  </span>
                </li>
              ) : null}
              {avoidPreview.length > 0 ? (
                <li className="flex flex-col gap-1 border-t border-stone-200/80 pt-2">
                  <span className="text-stone-500">Avoid / allergies</span>
                  <span className="font-medium text-stone-800">
                    {avoidPreview.join(", ")}
                  </span>
                </li>
              ) : null}
            </ul>
            <p className="text-xs leading-relaxed text-stone-500">
              Not medical advice. Change your answers anytime in Settings.
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-6">
        <button
          type="button"
          onClick={() => void goBack()}
          disabled={saving || stepIndex === 0}
          className="btn-ghost"
        >
          Back
        </button>
        <div className="flex gap-2">
          {step !== "done" ? (
            <button
              type="button"
              onClick={() => void goNext()}
              disabled={saving || !canContinue}
              className="btn-primary min-w-[8.5rem]"
            >
              {saving ? "Saving…" : "Continue"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void finish()}
              disabled={
                saving ||
                !draft.experience ||
                !draft.goal ||
                !(draft.goal === "maintain" || draft.goalPace != null) ||
                !metricsValid(draft) ||
                !draft.activityLevel ||
                !draft.loggingStyle ||
                !draft.dietaryPattern ||
                !draft.safetyAcknowledged ||
                !previewTargets ||
                displayTargetKcal == null
              }
              className="btn-primary min-w-[8.5rem]"
            >
              {saving ? "Saving…" : "Start logging"}
            </button>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
