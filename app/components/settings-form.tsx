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
  Ruler
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);
    const a = parseInt(age, 10);
    if (Number.isNaN(h) || h < 80 || h > 250) {
      setError("Height must be between 80 and 250 cm.");
      return;
    }
    if (Number.isNaN(w) || w < 25 || w > 400) {
      setError("Weight must be between 25 and 400 kg.");
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <label className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
            <Ruler className="h-3 w-3" /> Height (cm)
          </div>
          <input
            type="number"
            inputMode="decimal"
            min={80}
            max={250}
            required
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            className="w-full rounded-2xl bg-zinc-950 px-6 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none border border-white/5"
          />
        </label>
        
        <label className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
            <Scale className="h-3 w-3" /> Weight (kg)
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
            className="w-full rounded-2xl bg-zinc-950 px-6 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none border border-white/5"
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
            className="w-full rounded-2xl bg-zinc-950 px-6 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none border border-white/5"
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
                className={`flex-1 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
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
            className="w-full rounded-2xl bg-zinc-950 px-6 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none border border-white/5 appearance-none"
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
            className="w-full rounded-2xl bg-zinc-950 px-6 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none border border-white/5 appearance-none"
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
              className="w-full rounded-2xl bg-zinc-950 px-6 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none border border-white/5 appearance-none"
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
              className="w-full rounded-2xl bg-zinc-950 px-6 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none border border-white/5"
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
              className="w-full rounded-2xl bg-zinc-950 px-6 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none border border-white/5"
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
            className="w-full rounded-2xl bg-zinc-950 px-6 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none border border-white/5 resize-none"
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
              className="w-full rounded-2xl bg-zinc-950 px-6 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none border border-white/5 appearance-none"
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
              className="w-full rounded-2xl bg-zinc-950 px-6 py-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none border border-white/5"
            />
          </label>
        </div>
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
