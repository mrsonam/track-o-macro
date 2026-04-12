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
    <form onSubmit={onSubmit} className="mt-8 flex max-w-lg flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-stone-800">Height (cm)</span>
          <input
            type="number"
            inputMode="decimal"
            min={80}
            max={250}
            required
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            className="input-field"
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
            required
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className="input-field"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-stone-800">Age</span>
        <input
          type="number"
          inputMode="numeric"
          min={13}
          max={120}
          required
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="input-field max-w-xs"
        />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-stone-800">Sex (for BMR)</legend>
        <div className="flex flex-wrap gap-3">
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
                checked={sex === id}
                onChange={() => setSex(id)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-stone-800">Activity</span>
        <select
          required
          value={activityLevel}
          onChange={(e) =>
            setActivityLevel(e.target.value as ActivityLevel | "")
          }
          className="input-field"
        >
          <option value="">Select…</option>
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => (
            <option key={k} value={k}>
              {ACTIVITY_LABELS[k].title}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-stone-800">Goal</span>
        <select
          required
          value={goalIntent}
          onChange={(e) => {
            const v = e.target.value as "lose" | "maintain" | "gain" | "";
            setGoalIntent(v);
            if (v === "maintain") setGoalPace("moderate");
          }}
          className="input-field"
        >
          <option value="">Select…</option>
          <option value="lose">Lose fat</option>
          <option value="maintain">Maintain</option>
          <option value="gain">Gain muscle / lean bulk</option>
        </select>
      </label>
      {goalIntent === "lose" || goalIntent === "gain" ? (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-stone-800">Goal pace</span>
          <select
            value={goalPace}
            onChange={(e) => setGoalPace(e.target.value as GoalPace)}
            className="input-field"
          >
            <option value="gentle">
              Gentle ({goalIntent === "lose" ? "−250" : "+200"} kcal vs
              maintenance)
            </option>
            <option value="moderate">
              Moderate ({goalIntent === "lose" ? "−400" : "+300"} kcal)
            </option>
            <option value="aggressive">
              Aggressive ({goalIntent === "lose" ? "−550" : "+450"} kcal)
            </option>
          </select>
        </label>
      ) : null}
      <div className="border-t border-stone-200 pt-5">
        <p className="text-sm font-semibold text-stone-900">Food & logging</p>
        <p className="mt-1 text-xs text-stone-500">
          Same choices as onboarding—you can update anytime.
        </p>
        <label className="mt-4 flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-stone-800">Logging style</span>
          <select
            value={loggingStyle}
            onChange={(e) =>
              setLoggingStyle(e.target.value as LoggingStyle)
            }
            className="input-field"
          >
            {(Object.keys(LOGGING_STYLE_LABELS) as LoggingStyle[]).map(
              (k) => (
                <option key={k} value={k}>
                  {LOGGING_STYLE_LABELS[k].title}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="mt-4 flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-stone-800">Dietary pattern</span>
          <select
            value={dietaryPattern}
            onChange={(e) =>
              setDietaryPattern(e.target.value as DietaryPattern)
            }
            className="input-field"
          >
            {(Object.keys(DIETARY_PATTERN_LABELS) as DietaryPattern[]).map(
              (k) => (
                <option key={k} value={k}>
                  {DIETARY_PATTERN_LABELS[k].title}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="mt-4 flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-stone-800">
            Foods to avoid / allergies (optional)
          </span>
          <textarea
            value={foodAvoidText}
            onChange={(e) => setFoodAvoidText(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Comma-separated, e.g. peanuts, dairy"
            className="input-field resize-y text-sm"
          />
        </label>
      </div>
      <div className="border-t border-stone-200 pt-5">
        <p className="text-sm font-semibold text-stone-900">Weekly coaching</p>
        <p className="mt-1 text-xs text-stone-500">
          Optional theme for the &ldquo;Try this week&rdquo; line on home and
          history when automatic tips do not apply. Not medical advice.
        </p>
        <label className="mt-4 flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-stone-800">Focus</span>
          <select
            value={weeklyCoachingFocus}
            onChange={(e) => setWeeklyCoachingFocus(e.target.value)}
            className="input-field"
          >
            {WEEKLY_COACHING_FOCUS_UI.map((o) => (
              <option key={`${o.value}-${o.label}`} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-stone-800">
          Protein target (g/day, optional)
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={20}
          max={500}
          placeholder="Leave empty for no protein goal"
          value={targetProteinG}
          onChange={(e) => setTargetProteinG(e.target.value)}
          className="input-field max-w-xs"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
        {saving ? "Saving…" : "Save & recalculate targets"}
      </button>
      {profile?.targetKcal != null ? (
        <div className="rounded-xl border border-stone-200 bg-stone-50/90 p-4 text-sm text-stone-700">
          <p className="font-semibold text-stone-900">Current estimates</p>
          <p className="mt-2">
            Daily target:{" "}
            <span className="font-semibold tabular-nums text-emerald-900">
              ~{Number(profile.targetKcal).toFixed(0)} kcal
            </span>
          </p>
          {profile.bmrKcal != null && profile.tdeeKcal != null ? (
            <p className="mt-1 text-xs text-stone-500">
              BMR ~{Number(profile.bmrKcal).toFixed(0)} kcal · TDEE ~
              {Number(profile.tdeeKcal).toFixed(0)} kcal
            </p>
          ) : null}
          {profile.targetProteinG != null ? (
            <p className="mt-2 text-sm text-stone-700">
              Protein goal:{" "}
              <span className="font-semibold tabular-nums text-emerald-900">
                ~{Number(profile.targetProteinG).toFixed(0)} g/day
              </span>
            </p>
          ) : null}
          <p className="mt-2 text-xs text-stone-500">
            Estimates only (Mifflin–St Jeor + activity factor). Not medical
            advice.
          </p>
        </div>
      ) : null}
    </form>
  );
}
