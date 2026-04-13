"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@prisma/client";
import { ACTIVITY_LABELS } from "@/lib/nutrition/tdee";
import type { ActivityLevel, GoalPace } from "@/lib/nutrition/tdee";
import {
  DIETARY_PATTERN_LABELS,
  LOGGING_STYLE_LABELS,
  parseFoodAvoidList,
  type DietaryPattern,
  type LoggingStyle,
} from "@/lib/profile/preferences";
import {
  parseWeeklyCoachingFocus,
  WEEKLY_COACHING_FOCUS_UI,
} from "@/lib/meals/weekly-coaching-focus";
import { 
  Dna, 
  Activity, 
  Target, 
  Book, 
  ShieldAlert, 
  Lightbulb, 
  Zap, 
  Save, 
  User,
  Scale,
  Ruler,
  Globe
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  type UnitSystem, 
  cmToInches, 
  inchesToCm, 
  kgToLbs, 
  lbsToKg,
  getWeightLabel,
  getHeightLabel
} from "@/lib/profile/units";

type Props = {
  profile: UserProfile | null;
};

function avoidListFromProfile(profile: UserProfile | null): string {
  const j = profile?.foodAvoidJson;
  if (!Array.isArray(j)) return "";
  return j
    .filter((x): x is string => typeof x === "string")
    .join(", ");
}

export function SettingsForm({ profile }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [heightCm, setHeightCm] = useState(
    profile?.heightCm != null ? String(Number(profile.heightCm)) : "",
  );
  const [weightKg, setWeightKg] = useState(
    profile?.weightKg != null ? String(Number(profile.weightKg)) : "",
  );
  const [age, setAge] = useState(profile?.age != null ? String(profile.age) : "");
  const [sex, setSex] = useState<"male" | "female" | "unspecified">(
    (profile?.sex as "male" | "female" | "unspecified") ?? "unspecified",
  );
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(
    (profile?.unitSystem as UnitSystem) ?? "metric",
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | "">(
    (profile?.activityLevel as ActivityLevel) ?? "",
  );
  const [goalIntent, setGoalIntent] = useState<
    "lose" | "maintain" | "gain" | ""
  >((profile?.goalIntent as "lose" | "maintain" | "gain") ?? "");
  const [goalPace, setGoalPace] = useState<GoalPace>(
    (profile?.goalPace as GoalPace) ?? "moderate",
  );
  const [targetProteinG, setTargetProteinG] = useState(
    profile?.targetProteinG != null
      ? String(Number(profile.targetProteinG))
      : "",
  );
  const [loggingStyle, setLoggingStyle] = useState<LoggingStyle>(
    (profile?.loggingStyle as LoggingStyle) ?? "quick_estimates",
  );
  const [dietaryPattern, setDietaryPattern] = useState<DietaryPattern>(
    (profile?.dietaryPattern as DietaryPattern) ?? "prefer_not_say",
  );
  const [foodAvoidText, setFoodAvoidText] = useState(() =>
    avoidListFromProfile(profile),
  );
  const [weeklyCoachingFocus, setWeeklyCoachingFocus] = useState(() => {
    const p = parseWeeklyCoachingFocus(profile?.weeklyCoachingFocus);
    return p ?? "";
  });
  const [activeDays14Enabled, setActiveDays14Enabled] = useState(
    () => profile?.activeDays14Enabled === true,
  );
  const [weightTrendOnHomeEnabled, setWeightTrendOnHomeEnabled] = useState(
    () => profile?.weightTrendOnHomeEnabled === true,
  );
  const [weeklyImplementationIntention, setWeeklyImplementationIntention] =
    useState(() => profile?.weeklyImplementationIntention ?? "");
  const [targetHydrationMl, setTargetHydrationMl] = useState(() =>
    profile?.targetHydrationMl != null ? String(profile.targetHydrationMl) : "",
  );

  async function onSubmit(e: React.FormEvent) {
    setError(null);
    let h = parseFloat(heightCm);
    let w = parseFloat(weightKg);
    const a = parseInt(age, 10);

    // Convert to metric if needed for the backend
    if (unitSystem === "imperial") {
      h = inchesToCm(h);
      w = lbsToKg(w);
    }

    if (Number.isNaN(h) || h < 80 || h > 250) {
      setError(`Height must be between ${unitSystem === 'metric' ? '80 and 250 cm' : '31.5 and 98.4 inches'}.`);
      return;
    }
    if (Number.isNaN(w) || w < 25 || w > 400) {
      setError(`Weight must be between ${unitSystem === 'metric' ? '25 and 400 kg' : '55 and 880 lbs'}.`);
      return;
    }
    if (Number.isNaN(a) || a < 13 || a > 120) {
      setError("Age must be between 13 and 120.");
      return;
    }
    if (!activityLevel || !goalIntent) {
      setError("Choose activity level and goal.");
      return;
    }
    let proteinPayload: number | null | undefined;
    const pTrim = targetProteinG.trim();
    if (pTrim === "") {
      proteinPayload = null;
    } else {
      const p = parseFloat(pTrim);
      if (Number.isNaN(p) || p < 20 || p > 500) {
        setError("Protein target must be empty or between 20 and 500 g/day.");
        return;
      }
      proteinPayload = Math.round(p);
    }

    let hydrationGoalPayload: number | null | undefined;
    const hTrim = targetHydrationMl.trim();
    if (hTrim === "") {
      hydrationGoalPayload = null;
    } else {
      const h = parseInt(hTrim, 10);
      if (Number.isNaN(h) || h < 500 || h > 8000) {
        setError(
          "Daily fluid goal must be empty (use app default) or between 500 and 8000 ml.",
        );
        return;
      }
      hydrationGoalPayload = h;
    }
    const planTrim = weeklyImplementationIntention.trim();
    if (planTrim.length > 320) {
      setError("Weekly plan must be 320 characters or fewer.");
      return;
    }

    const avoidParsed = parseFoodAvoidList(foodAvoidText);
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heightCm: h,
          weightKg: w,
          age: a,
          sex,
          activityLevel,
          goalIntent,
          goalPace: goalIntent === "maintain" ? null : goalPace,
          targetProteinG: proteinPayload,
          loggingStyle,
          dietaryPattern,
          foodAvoidList:
            avoidParsed.length > 0 ? avoidParsed : null,
          weeklyCoachingFocus:
            weeklyCoachingFocus === "" ? null : weeklyCoachingFocus,
          weeklyImplementationIntention:
            planTrim === "" ? null : planTrim,
          activeDays14Enabled,
          weightTrendOnHomeEnabled,
          unitSystem,
          targetHydrationMl: hydrationGoalPayload,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-10">
      <div className="bento-card border border-white/5 bg-zinc-900/30 p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">System Units</h3>
              <p className="text-xs text-zinc-500">Choose your preferred measurement protocol.</p>
            </div>
          </div>
          <div className="flex gap-1 p-1 bg-zinc-950 rounded-xl border border-white/5">
            {[["metric", "Metric"], ["imperial", "Imperial"]].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  const next = id as UnitSystem;
                  if (next === unitSystem) return;
                  
                  // Convert current local state values to new system so they don't jump wildly
                  if (next === "imperial") {
                    setHeightCm(String(Number(cmToInches(Number(heightCm)).toFixed(1))));
                    setWeightKg(String(Number(kgToLbs(Number(weightKg)).toFixed(1))));
                  } else {
                    setHeightCm(String(Number(inchesToCm(Number(heightCm)).toFixed(0))));
                    setWeightKg(String(Number(lbsToKg(Number(weightKg)).toFixed(1))));
                  }
                  setUnitSystem(next);
                }}
                className={`focus-ring tap-target rounded-lg px-4 py-2 text-xs font-bold transition-colors duration-200 ${
                  unitSystem === id ? "bg-emerald-500 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <label className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
            <Ruler className="h-3 w-3" /> Height ({getHeightLabel(unitSystem)})
          </div>
          <input
            type="number"
            inputMode="decimal"
            min={80}
            max={250}
            required
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            className="form-field"
          />
        </label>
        
        <label className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
            <Scale className="h-3 w-3" /> Weight ({getWeightLabel(unitSystem)})
          </div>
          <input
            type="number"
            inputMode="decimal"
            min={25}
            max={400}
            step="0.1"
            required
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className="form-field"
          />
        </label>

        <label className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
            <User className="h-3 w-3" /> Age
          </div>
          <input
            type="number"
            inputMode="numeric"
            min={13}
            max={120}
            required
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="form-field"
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1 mb-2">
            <Dna className="h-3 w-3" /> Biological Sex
          </legend>
          <div className="flex flex-wrap gap-2 p-1 bg-zinc-950 rounded-2xl border border-white/5">
            {[["male", "Male"], ["female", "Female"], ["unspecified", "Other"]].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSex(id as any)}
                className={`focus-ring tap-target flex-1 rounded-xl px-4 py-3 text-xs font-bold transition-colors duration-200 ${
                  sex === id ? "bg-zinc-800 text-white shadow-xl" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <label className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
            <Activity className="h-3 w-3" /> Activity Profile
          </div>
          <select
            required
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value as ActivityLevel | "")}
            className="form-field appearance-none"
          >
            <option value="">Select Activity Level</option>
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => (
              <option key={k} value={k}>{ACTIVITY_LABELS[k].title}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
            <Target className="h-3 w-3" /> Primary Objective
          </div>
          <select
            required
            value={goalIntent}
            onChange={(e) => {
              const v = e.target.value as "lose" | "maintain" | "gain" | "";
              setGoalIntent(v);
              if (v === "maintain") setGoalPace("moderate");
            }}
            className="form-field appearance-none"
          >
            <option value="">Select Goal</option>
            <option value="lose">Fat Loss</option>
            <option value="maintain">Maintenance</option>
            <option value="gain">Muscle Gain</option>
          </select>
        </label>
      </div>

      <AnimatePresence>
        {(goalIntent === "lose" || goalIntent === "gain") && (
          <motion.label 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-2 text-sm overflow-hidden"
          >
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
              <Zap className="h-3 w-3" /> Execution Pace
            </div>
            <select
              value={goalPace}
              onChange={(e) => setGoalPace(e.target.value as GoalPace)}
              className="form-field appearance-none"
            >
              <option value="gentle">Gentle ({goalIntent === "lose" ? "−250" : "+200"} kcal)</option>
              <option value="moderate">Moderate ({goalIntent === "lose" ? "−400" : "+300"} kcal)</option>
              <option value="aggressive">Aggressive ({goalIntent === "lose" ? "−550" : "+450"} kcal)</option>
            </select>
          </motion.label>
        )}
      </AnimatePresence>

      <div className="bento-card border border-white/5 bg-zinc-900/30 p-8 space-y-8">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
            <Book className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Logging Preferences</h3>
            <p className="text-xs text-zinc-500">Fine-tune the analyzer performance.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Input Strategy</span>
            <select
              value={loggingStyle}
              onChange={(e) => setLoggingStyle(e.target.value as LoggingStyle)}
              className="form-field"
            >
              {(Object.keys(LOGGING_STYLE_LABELS) as LoggingStyle[]).map((k) => (
                <option key={k} value={k}>{LOGGING_STYLE_LABELS[k].title}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Dietary Filter</span>
            <select
              value={dietaryPattern}
              onChange={(e) => setDietaryPattern(e.target.value as DietaryPattern)}
              className="form-field"
            >
              {(Object.keys(DIETARY_PATTERN_LABELS) as DietaryPattern[]).map((k) => (
                <option key={k} value={k}>{DIETARY_PATTERN_LABELS[k].title}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-2">
           <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
            <ShieldAlert className="h-3 w-3" /> Sensitive Ingredients / Allergies
          </div>
          <textarea
            value={foodAvoidText}
            onChange={(e) => setFoodAvoidText(e.target.value)}
            rows={2}
            placeholder="e.g. Peanuts, Shellfish, Dairy..."
            className="form-field min-h-[5rem] resize-none"
          />
        </label>
      </div>

      <div className="bento-card border border-white/5 bg-emerald-500/5 p-8 space-y-8">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Daily Performance Focus</h3>
            <p className="text-xs text-zinc-500">Enable advanced coaching tips.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Coaching Objective</span>
            <select
              value={weeklyCoachingFocus}
              onChange={(e) => setWeeklyCoachingFocus(e.target.value)}
              className="form-field appearance-none"
            >
              {WEEKLY_COACHING_FOCUS_UI.map((o) => (
                <option key={`${o.value}-${o.label}`} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Protein Hard Target (g)</span>
            <input
              type="number"
              inputMode="numeric"
              min={20}
              max={500}
              placeholder="Auto-calculated if empty"
              value={targetProteinG}
              onChange={(e) => setTargetProteinG(e.target.value)}
              className="form-field"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
              Daily fluid goal (ml)
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={500}
              max={8000}
              placeholder="Empty = 2000 ml default"
              value={targetHydrationMl}
              onChange={(e) => setTargetHydrationMl(e.target.value)}
              className="form-field"
            />
            <span className="text-[10px] font-medium leading-relaxed text-zinc-600">
              Used for the home hydration progress ring. Clear the field to use
              the default (2000 ml).
            </span>
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
            Plan this week (if–then)
          </span>
          <textarea
            value={weeklyImplementationIntention}
            onChange={(e) => setWeeklyImplementationIntention(e.target.value)}
            maxLength={320}
            rows={3}
            placeholder='e.g. "If I skip breakfast, then I log lunch before 2pm."'
            className="form-field min-h-[5rem] resize-y"
          />
          <span className="text-[10px] font-medium leading-relaxed text-zinc-600">
            Optional. A short concrete plan pairs with suggestions on the home and trends week cards. Not medical advice.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/5 bg-zinc-950/50 p-5 text-left transition-colors duration-200 focus-within:border-emerald-500/35 focus-within:ring-2 focus-within:ring-emerald-500/15">
          <input
            type="checkbox"
            checked={activeDays14Enabled}
            onChange={(e) => setActiveDays14Enabled(e.target.checked)}
            className="focus-ring mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-zinc-900 text-emerald-500 focus-visible:ring-offset-zinc-950"
          />
          <span>
            <span className="block text-sm font-bold text-white">
              Active days (14-day view)
            </span>
            <span className="mt-1 block text-xs font-medium leading-relaxed text-zinc-500">
              On the home and trends week cards, show how many of the last 14 days had at least one log — recovery-friendly, not a daily streak score.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/5 bg-zinc-950/50 p-5 text-left transition-colors duration-200 focus-within:border-violet-500/35 focus-within:ring-2 focus-within:ring-violet-500/15">
          <input
            type="checkbox"
            checked={weightTrendOnHomeEnabled}
            onChange={(e) => setWeightTrendOnHomeEnabled(e.target.checked)}
            className="focus-ring mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-zinc-900 text-violet-500 focus-visible:ring-offset-zinc-950"
          />
          <span>
            <span className="block text-sm font-bold text-white">
              Weight trend on home
            </span>
            <span className="mt-1 block text-xs font-medium leading-relaxed text-zinc-500">
              Adds a compact smoothed curve to the body card on the dashboard. The full trajectory chart stays on Trends so the main log stays quiet.
            </span>
          </span>
        </label>
      </div>

      <AnimatePresence>
        {profile?.targetKcal != null && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-zinc-950 p-8 border border-white/5 shadow-inner"
          >
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-6">Current Bio-Estimates</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Target Energy</p>
                <p className="text-3xl font-black text-white">{Number(profile.targetKcal).toFixed(0)} <span className="text-sm font-medium opacity-40">kcal</span></p>
              </div>
              {profile.tdeeKcal && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Total Expenditure</p>
                  <p className="text-3xl font-black text-white">{Number(profile.tdeeKcal).toFixed(0)} <span className="text-sm font-medium opacity-40">kcal</span></p>
                </div>
              )}
              {profile.targetProteinG && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Protein Goal</p>
                  <p className="text-3xl font-black text-emerald-400">{Number(profile.targetProteinG).toFixed(0)} <span className="text-sm font-medium opacity-40 text-zinc-500">g</span></p>
                </div>
              )}
            </div>
            <p className="mt-8 text-[10px] italic text-zinc-600">
              * Mifflin–St Jeor protocol active. Re-save profile to recalculate values after changes.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
            <ShieldAlert className="h-4 w-4" />
            {error}
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={saving} 
          className="btn-primary flex items-center justify-center gap-3 py-6 text-base"
        >
          {saving ? (
             <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
               <Zap className="h-5 w-5" />
             </motion.div>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Recalculate Protocol Targets
            </>
          )}
        </button>
      </div>
    </form>
  );
}
