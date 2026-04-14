"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import type { OnboardingDraft } from "@/lib/profile/types";
import { AuthShell } from "@/components/auth-shell";
import { ACTIVITY_LABELS } from "@/lib/nutrition/tdee";
import type { ActivityLevel, SexForBmr } from "@/lib/nutrition/tdee";
import { computeTargets } from "@/lib/profile/compute-profile-targets";
import { migrateOnboardingStepIndex } from "@/lib/profile/onboarding-step-migrate";
import {
  DIETARY_PATTERN_LABELS,
  LOGGING_STYLE_LABELS,
  parseFoodAvoidList,
  type DietaryPattern,
  type LoggingStyle,
} from "@/lib/profile/preferences";
import { 
  Shield, 
  Target, 
  Ruler, 
  Activity, 
  Settings, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Zap,
  Flame,
  Dna,
  Lock,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="mb-12" aria-hidden>
      <div className="flex gap-2">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              i <= current
                ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                : "bg-white/5"
            }`}
          />
        ))}
      </div>
      <div className="mt-4 flex justify-between items-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">
          Module {current + 1}
        </p>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
          Onboarding Protocol
        </p>
      </div>
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
      <div className="flex min-h-screen flex-1 items-center justify-center bg-zinc-950 p-4">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-12 w-12 rounded-2xl bg-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
        />
      </div>
    );
  }

  const step = STEPS[stepIndex];

  const choiceClass = (selected: boolean) =>
    `flex cursor-pointer flex-col rounded-2xl border p-5 text-left transition-all duration-300 ${
      selected
        ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/50"
        : "border-white/5 bg-zinc-900/50 hover:border-white/10 hover:bg-zinc-900"
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

  const variants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col p-4 md:p-8">
      <div className="mx-auto w-full max-w-2xl flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg shadow-lg shadow-emerald-500/20" />
            <span className="font-black tracking-tighter text-xl">TRACKOMACRO</span>
          </div>
          <button
            onClick={() => void onSignOut()}
            className="text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest"
          >
            Sign out
          </button>
        </div>

        <StepProgress current={stepIndex} total={STEPS.length} />

        <main className="flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-1"
            >
              <div className="mb-8">
                <h1 className="text-4xl font-black tracking-tighter text-white sm:text-5xl">
                  {step === "welcome" && "Initialize Profile"}
                  {step === "experience" && "Macro Experience"}
                  {step === "goal" && "Strategic Objective"}
                  {step === "metrics" && "Biometric Input"}
                  {step === "activity" && "Activity Signature"}
                  {step === "preferences" && "Analyzer Prefs"}
                  {step === "safety" && "Safety Protocol"}
                  {step === "review" && "Protocol Preview"}
                  {step === "done" && "Identity Verified"}
                </h1>
                <p className="mt-4 text-base text-zinc-500 font-medium">
                  {step === "welcome" && "Establish your baseline data. This calibration affects all future analytics."}
                  {step === "experience" && "This configures the terminology and complexity of your dashboard."}
                  {step === "goal" && "Define the direction of your metabolic adaptation."}
                  {step === "metrics" && "Provide precise physiological markers for BMR calculation."}
                  {step === "activity" && "Estimate your weekly energy expenditure signature."}
                  {step === "preferences" && "Tailor the AI analyzer to your specific dietary requirements."}
                  {step === "safety" && "Review critical usage boundaries before activating your profile."}
                  {step === "review" && "Confirm your estimated performance targets."}
                  {step === "done" && "Your profile is synchronized. Ready for deployment."}
                </p>
              </div>

              {error && (
                <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex items-center gap-3">
                  <Shield className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="space-y-6">
                {step === "welcome" && (
                   <div className="rounded-[2rem] glass-pane p-8 border border-white/5 space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                        <Zap className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">Advanced Analysis</h3>
                        <p className="text-sm text-zinc-500">Natural language processing for effortless logging.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="h-12 w-12 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center shrink-0">
                        <Target className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">Precision Tracking</h3>
                        <p className="text-sm text-zinc-500">Bento-grid dashboard for real-time macro insights.</p>
                      </div>
                    </div>
                  </div>
                )}

                {step === "experience" && (
                  <div className="flex flex-col gap-3">
                    {(
                      [
                        { id: "beginner" as const, title: "Standard", desc: "Focus on simple calorie totals and daily goals." },
                        { id: "intermediate" as const, title: "Tactical", desc: "Balance calories with primary macronutrient targets." },
                        { id: "advanced" as const, title: "Elite", desc: "Full control over grams, ratios, and performance targets." },
                      ] as const
                    ).map((opt) => (
                      <label key={opt.id} className={choiceClass(draft.experience === opt.id)}>
                        <input
                          type="radio"
                          className="sr-only"
                          checked={draft.experience === opt.id}
                          onChange={() => setDraft((d) => ({ ...d, experience: opt.id }))}
                        />
                         <div className="flex items-center justify-between">
                          <span className="font-black text-white uppercase tracking-widest">{opt.title}</span>
                          {draft.experience === opt.id && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        </div>
                        <span className="text-sm text-zinc-500 mt-1">{opt.desc}</span>
                      </label>
                    ))}
                  </div>
                )}

                {step === "goal" && (
                  <div className="space-y-8">
                    <div className="flex flex-col gap-3">
                      {(
                        [
                          { id: "lose" as const, title: "Deficit", desc: "Shed body fat while preserving lean tissue." },
                          { id: "maintain" as const, title: "Equilibrium", desc: "Maintain current biological state." },
                          { id: "gain" as const, title: "Surplus", desc: "Drive hypertrophy and strength gains." },
                        ] as const
                      ).map((opt) => (
                        <label key={opt.id} className={choiceClass(draft.goal === opt.id)}>
                          <input
                            type="radio"
                            className="sr-only"
                            checked={draft.goal === opt.id}
                            onChange={() => setDraft((d) => ({ ...d, goal: opt.id, goalPace: opt.id === "maintain" ? undefined : (d.goalPace ?? "moderate") }))}
                          />
                          <div className="flex items-center justify-between">
                            <span className="font-black text-white uppercase tracking-widest">{opt.title}</span>
                            {draft.goal === opt.id && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                          </div>
                          <span className="text-sm text-zinc-500 mt-1">{opt.desc}</span>
                        </label>
                      ))}
                    </div>

                    {(draft.goal === "lose" || draft.goal === "gain") && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="flex items-center gap-2">
                           <Zap className="h-3 w-3 text-emerald-500" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Pace Selection</span>
                        </div>
                        <div className="flex gap-2 p-1 bg-zinc-950 rounded-2xl border border-white/5">
                          {(["gentle", "moderate", "aggressive"] as const).map((pace) => (
                            <button
                              key={pace}
                              onClick={() =>
                                setDraft((d) => ({
                                  ...d,
                                  goalPace: pace,
                                }))
                              }
                              className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                draft.goalPace === pace ? "bg-zinc-800 text-white shadow-xl" : "text-zinc-600 hover:text-zinc-400"
                              }`}
                            >
                              {pace}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {step === "metrics" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-zinc-950 p-8 rounded-[2rem] border border-white/5">
                    <label className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-zinc-600 uppercase">
                        <Ruler className="h-3 w-3" /> Height (cm)
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        className="w-full bg-zinc-900 px-6 py-4 rounded-2xl border border-white/5 text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                        value={draft.heightCm ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, heightCm: e.target.value === "" ? undefined : parseFloat(e.target.value) }))}
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-zinc-600 uppercase">
                         <Activity className="h-3 w-3" /> Weight (kg)
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        className="w-full bg-zinc-900 px-6 py-4 rounded-2xl border border-white/5 text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                        value={draft.weightKg ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, weightKg: e.target.value === "" ? undefined : parseFloat(e.target.value) }))}
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-zinc-600 uppercase">
                         <Dna className="h-3 w-3" /> Age
                      </div>
                      <input
                        type="number"
                        className="w-full bg-zinc-900 px-6 py-4 rounded-2xl border border-white/5 text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                        value={draft.age ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, age: e.target.value === "" ? undefined : parseInt(e.target.value, 10) }))}
                      />
                    </label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-zinc-600 uppercase mb-1">
                        Sex (BMR Calibration)
                      </div>
                      <div className="flex gap-2">
                        {["male", "female"].map((s) => (
                          <button
                            key={s}
                            onClick={() =>
                              setDraft((d) => ({
                                ...d,
                                sex: s as SexForBmr,
                              }))
                            }
                            className={`flex-1 py-4 rounded-xl text-xs font-bold uppercase ${draft.sex === s ? "bg-emerald-500 text-zinc-950" : "bg-zinc-900 text-zinc-500"}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === "activity" && (
                  <div className="flex flex-col gap-3">
                    {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => (
                      <label key={k} className={choiceClass(draft.activityLevel === k)}>
                        <input
                          type="radio"
                          className="sr-only"
                          checked={draft.activityLevel === k}
                          onChange={() => setDraft((d) => ({ ...d, activityLevel: k }))}
                        />
                        <div className="flex items-center justify-between">
                          <span className="font-black text-white uppercase tracking-widest">{ACTIVITY_LABELS[k].title}</span>
                          {draft.activityLevel === k && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        </div>
                        <span className="text-sm text-zinc-500 mt-1">{ACTIVITY_LABELS[k].desc}</span>
                      </label>
                    ))}
                  </div>
                )}

                {step === "preferences" && (
                  <div className="space-y-8">
                     <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-4">
                          <Settings className="h-3.5 w-3.5 text-zinc-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Analyzer Strategy</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {Object.entries(LOGGING_STYLE_LABELS).map(([id, opt]) => (
                            <label key={id} className={choiceClass(draft.loggingStyle === id)}>
                              <input
                                type="radio"
                                className="sr-only"
                                checked={draft.loggingStyle === id}
                                onChange={() =>
                                  setDraft((d) => ({
                                    ...d,
                                    loggingStyle: id as LoggingStyle,
                                  }))
                                }
                              />
                              <span className="font-bold text-white text-xs">{opt.title}</span>
                              <span className="text-[10px] text-zinc-500 leading-tight mt-1">{opt.desc}</span>
                            </label>
                          ))}
                        </div>
                     </div>
                     
                     <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-4">
                          <Shield className="h-3.5 w-3.5 text-zinc-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Dietary Profile</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {Object.entries(DIETARY_PATTERN_LABELS).map(([id, opt]) => (
                            <label key={id} className={choiceClass(draft.dietaryPattern === id)}>
                              <input
                                type="radio"
                                className="sr-only"
                                checked={draft.dietaryPattern === id}
                                onChange={() =>
                                  setDraft((d) => ({
                                    ...d,
                                    dietaryPattern: id as DietaryPattern,
                                  }))
                                }
                              />
                              <span className="font-bold text-white text-xs">{opt.title}</span>
                            </label>
                          ))}
                        </div>
                     </div>
                  </div>
                )}

                {step === "safety" && (
                  <div className="rounded-[2rem] bg-zinc-950 p-8 border border-white/5 space-y-8">
                    <ul className="space-y-6">
                      <li className="flex gap-4">
                        <Lock className="h-5 w-5 text-zinc-700 shrink-0" />
                        <p className="text-sm text-zinc-400">TrackOMacro is a tracking assistant, not a clinical diagnostic tool.</p>
                      </li>
                      <li className="flex gap-4">
                        <Shield className="h-5 w-5 text-zinc-700 shrink-0" />
                        <p className="text-sm text-zinc-400">Consult healthcare professionals before significant dietary adaptations.</p>
                      </li>
                    </ul>
                    <label className="flex items-start gap-4 p-5 rounded-2xl bg-zinc-900 border border-white/5 cursor-pointer hover:border-emerald-500/50 transition-colors">
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5 rounded-md border-white/10 bg-transparent text-emerald-500"
                        checked={!!draft.safetyAcknowledged}
                        onChange={(e) => setDraft((d) => ({ ...d, safetyAcknowledged: e.target.checked }))}
                      />
                      <span className="text-xs font-bold text-zinc-300">I acknowledge the professional medical disclaimer and protocol limitations.</span>
                    </label>
                  </div>
                )}

                {step === "review" && previewTargets && (
                  <div className="space-y-8">
                    <div className="rounded-[2.5rem] glass-pane p-10 border border-emerald-500/20 text-center relative overflow-hidden">
                       <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-32 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
                       <div className="flex flex-col items-center gap-4">
                          <Flame className="h-8 w-8 text-emerald-500" />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/60">Calculated Energy Intake</h3>
                          <p className="text-7xl font-black text-white tabular-nums tracking-tighter">
                            {displayTargetKcal}
                            <span className="text-xl ml-2 font-medium opacity-20">kcal</span>
                          </p>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-zinc-950 rounded-3xl p-6 border border-white/5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Mifflin BMR</span>
                          <p className="text-2xl font-black text-white mt-1">{Math.round(previewTargets.bmrKcal)}</p>
                       </div>
                       <div className="bg-zinc-950 rounded-3xl p-6 border border-white/5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Estimated TDEE</span>
                          <p className="text-2xl font-black text-white mt-1">{Math.round(previewTargets.tdeeKcal)}</p>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <footer className="mt-12 flex gap-4">
             {stepIndex > 0 && (
               <button
                onClick={() => void goBack()}
                disabled={saving}
                className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-900 border border-white/5 text-zinc-500 hover:text-white transition-all"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
             )}
             
             <button
              onClick={() => stepIndex === LAST_STEP_INDEX ? void finish() : void goNext()}
              disabled={!canContinue || saving}
              className="flex-1 btn-primary h-16 flex items-center justify-center gap-3 text-base"
             >
                {saving ? "Synchronizing..." : (
                  <>
                    {stepIndex === LAST_STEP_INDEX ? "Initialize System" : "Proceed to Next Module"}
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
             </button>
          </footer>
        </main>

        <p className="mt-12 text-center text-[10px] font-black uppercase tracking-[0.5em] text-zinc-800">
          Biometric Sync Protocol v3.04.1
        </p>
      </div>
    </div>
  );
}
