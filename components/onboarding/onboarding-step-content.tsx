"use client";

import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  Ruler,
  Shield,
  Sparkles,
  Target,
} from "lucide-react";
import {
  EXPERIENCE_OPTIONS,
  GOAL_OPTIONS,
  PACE_LABELS,
  type OnboardingStepId,
} from "@/app/onboarding/onboarding-copy";
import type { OnboardingDraft } from "@/lib/profile/types";
import { ACTIVITY_LABELS, type ActivityLevel, type SexForBmr } from "@/lib/nutrition/tdee";
import {
  DIETARY_PATTERN_LABELS,
  LOGGING_STYLE_LABELS,
  type DietaryPattern,
  type LoggingStyle,
} from "@/lib/profile/preferences";
import { OnboardingChoice } from "./onboarding-choice";

type OnboardingStepContentProps = {
  step: OnboardingStepId;
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  displayTargetKcal: number | null;
  previewTargets: {
    bmrKcal: number;
    tdeeKcal: number;
    targetKcal: number;
  } | null;
};

export function OnboardingStepContent({
  step,
  draft,
  setDraft,
  displayTargetKcal,
  previewTargets,
}: OnboardingStepContentProps) {
  switch (step) {
    case "welcome":
      return (
        <div className="space-y-4 rounded-2xl border border-black/[0.08] bg-[color:var(--surface)]/80 p-6">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--protein-tint)] text-[color:var(--accent-secondary)]">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="font-bold text-[color:var(--foreground)]">Log in plain language</p>
              <p className="mt-1 text-sm text-zinc-600">
                Describe meals naturally and get USDA-backed nutrition estimates.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--carb-sky)]/60 text-[color:var(--foreground)]">
              <Target className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="font-bold text-[color:var(--foreground)]">See your week clearly</p>
              <p className="mt-1 text-sm text-zinc-600">
                Rolling trends and targets without spreadsheet friction.
              </p>
            </div>
          </div>
        </div>
      );

    case "experience":
      return (
        <div className="flex flex-col gap-3">
          {EXPERIENCE_OPTIONS.map((opt) => (
            <OnboardingChoice
              key={opt.id}
              name="experience"
              selected={draft.experience === opt.id}
              title={opt.title}
              description={opt.desc}
              onSelect={() => setDraft((d) => ({ ...d, experience: opt.id }))}
            />
          ))}
        </div>
      );

    case "goal":
      return (
        <div className="space-y-8">
          <div className="flex flex-col gap-3">
            {GOAL_OPTIONS.map((opt) => (
              <OnboardingChoice
                key={opt.id}
                name="goal"
                selected={draft.goal === opt.id}
                title={opt.title}
                description={opt.desc}
                onSelect={() =>
                  setDraft((d) => ({
                    ...d,
                    goal: opt.id,
                    goalPace:
                      opt.id === "maintain" ? undefined : (d.goalPace ?? "moderate"),
                  }))
                }
              />
            ))}
          </div>
          {(draft.goal === "lose" || draft.goal === "gain") && (
            <div className="space-y-3">
              <p className="landing-kicker text-zinc-500">How fast?</p>
              <div className="flex gap-2 rounded-2xl border border-black/[0.08] bg-[color:var(--warm-neutral)]/50 p-1.5">
                {(["gentle", "moderate", "aggressive"] as const).map((pace) => (
                  <button
                    key={pace}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, goalPace: pace }))}
                    className={`focus-ring tap-target flex-1 cursor-pointer rounded-xl px-3 py-3 text-xs font-bold transition-colors duration-200 ${
                      draft.goalPace === pace
                        ? "bg-white text-[color:var(--foreground)] shadow-sm"
                        : "text-zinc-500 hover:text-[color:var(--foreground)]"
                    }`}
                  >
                    {PACE_LABELS[pace]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );

    case "metrics":
      return (
        <div className="grid grid-cols-1 gap-5 rounded-2xl border border-black/[0.08] bg-[color:var(--surface)]/60 p-5 sm:grid-cols-2 sm:p-6">
          <label className="flex flex-col gap-2">
            <span className="landing-kicker flex items-center gap-2 text-zinc-500">
              <Ruler className="h-3.5 w-3.5" aria-hidden />
              Height (cm)
            </span>
            <input
              type="number"
              inputMode="decimal"
              className="input-field bg-white py-3.5"
              value={draft.heightCm ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  heightCm: e.target.value === "" ? undefined : parseFloat(e.target.value),
                }))
              }
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="landing-kicker flex items-center gap-2 text-zinc-500">
              <Activity className="h-3.5 w-3.5" aria-hidden />
              Weight (kg)
            </span>
            <input
              type="number"
              inputMode="decimal"
              className="input-field bg-white py-3.5"
              value={draft.weightKg ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  weightKg: e.target.value === "" ? undefined : parseFloat(e.target.value),
                }))
              }
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="landing-kicker text-zinc-500">Age</span>
            <input
              type="number"
              className="input-field bg-white py-3.5"
              value={draft.age ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  age: e.target.value === "" ? undefined : parseInt(e.target.value, 10),
                }))
              }
            />
          </label>
          <div className="flex flex-col gap-2">
            <span className="landing-kicker text-zinc-500">Sex (for BMR estimate)</span>
            <div className="flex gap-2">
              {(["male", "female"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, sex: s as SexForBmr }))}
                  className={`focus-ring tap-target flex-1 cursor-pointer rounded-xl py-3.5 text-sm font-bold capitalize transition-colors duration-200 ${
                    draft.sex === s
                      ? "bg-[color:var(--foreground)] text-white"
                      : "border border-black/[0.08] bg-white text-zinc-600 hover:border-black/15"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      );

    case "activity":
      return (
        <div className="flex flex-col gap-3">
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => (
            <OnboardingChoice
              key={k}
              name="activity"
              selected={draft.activityLevel === k}
              title={ACTIVITY_LABELS[k].title}
              description={ACTIVITY_LABELS[k].desc}
              onSelect={() => setDraft((d) => ({ ...d, activityLevel: k }))}
            />
          ))}
        </div>
      );

    case "preferences":
      return (
        <div className="space-y-8">
          <div>
            <p className="landing-kicker mb-3 text-zinc-500">How you usually log</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Object.entries(LOGGING_STYLE_LABELS).map(([id, opt]) => (
                <OnboardingChoice
                  key={id}
                  name="loggingStyle"
                  compact
                  selected={draft.loggingStyle === id}
                  title={opt.title}
                  description={opt.desc}
                  onSelect={() =>
                    setDraft((d) => ({ ...d, loggingStyle: id as LoggingStyle }))
                  }
                />
              ))}
            </div>
          </div>
          <div>
            <p className="landing-kicker mb-3 text-zinc-500">Diet pattern (optional context)</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Object.entries(DIETARY_PATTERN_LABELS).map(([id, opt]) => (
                <OnboardingChoice
                  key={id}
                  name="dietaryPattern"
                  compact
                  selected={draft.dietaryPattern === id}
                  title={opt.title}
                  description={opt.desc}
                  onSelect={() =>
                    setDraft((d) => ({ ...d, dietaryPattern: id as DietaryPattern }))
                  }
                />
              ))}
            </div>
          </div>
        </div>
      );

    case "safety":
      return (
        <div className="space-y-6 rounded-2xl border border-black/[0.08] bg-[color:var(--surface)]/80 p-6">
          <ul className="space-y-4 text-sm text-zinc-600">
            <li className="flex gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--accent-secondary)]" aria-hidden />
              TrackOMacro is a tracking assistant, not a substitute for medical care.
            </li>
            <li className="flex gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--accent-secondary)]" aria-hidden />
              Talk with a qualified professional before large diet changes, especially if you
              have a health condition.
            </li>
          </ul>
          <p className="text-sm text-zinc-600">
            <Link
              href="/resources/eating-disorders"
              className="focus-ring font-bold text-[color:var(--foreground)] underline decoration-[color:var(--accent-secondary)]/40 underline-offset-2"
            >
              Wellness resources
            </Link>{" "}
            are available anytime.
          </p>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/[0.08] bg-white p-4 transition-colors duration-200 hover:border-[color:var(--accent-secondary)]/30">
            <input
              type="checkbox"
              className="focus-ring mt-0.5 h-5 w-5 shrink-0 rounded-md border-black/10 text-[color:var(--accent-secondary)]"
              checked={!!draft.safetyAcknowledged}
              onChange={(e) =>
                setDraft((d) => ({ ...d, safetyAcknowledged: e.target.checked }))
              }
            />
            <span className="text-sm font-bold text-zinc-600">
              I understand this is not medical care.
            </span>
          </label>
        </div>
      );

    case "review":
      if (!previewTargets || displayTargetKcal == null) return null;
      return (
        <div className="space-y-6">
          <div className="bento-card border-[color:var(--accent-secondary)]/25 bg-white p-6 text-center sm:p-8">
            <p className="landing-kicker landing-kicker-signal">Daily calories</p>
            <p className="mt-2 font-mono text-5xl font-bold tabular-nums tracking-tight text-[color:var(--foreground)] sm:text-6xl">
              {displayTargetKcal}
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-500">kcal / day (estimate)</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-black/[0.08] bg-[color:var(--warm-neutral)]/50 p-4">
              <p className="landing-kicker text-zinc-500">BMR</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-[color:var(--foreground)]">
                {Math.round(previewTargets.bmrKcal)}
              </p>
            </div>
            <div className="rounded-2xl border border-black/[0.08] bg-[color:var(--warm-neutral)]/50 p-4">
              <p className="landing-kicker text-zinc-500">TDEE</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-[color:var(--foreground)]">
                {Math.round(previewTargets.tdeeKcal)}
              </p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-zinc-500">
            These numbers are starting points. You can edit targets in settings after setup.
          </p>
        </div>
      );

    case "done":
      return (
        <div className="rounded-2xl border border-[color:var(--accent-secondary)]/25 bg-[color:var(--protein-tint)] p-8 text-center">
          <CheckCircle2
            className="mx-auto h-12 w-12 text-[color:var(--accent-secondary)]"
            aria-hidden
          />
          <p className="mt-4 text-sm font-medium text-zinc-600">
            Your targets are saved. Tap below to open your dashboard and log your first meal.
          </p>
        </div>
      );

    default:
      return null;
  }
}
