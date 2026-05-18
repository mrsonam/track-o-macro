"use client";

import {
  calorieGoalBlurb,
  proteinGoalBlurb,
} from "@/lib/meals/goal-insight-blurbs";
import { labelYearMonth } from "@/lib/meals/local-month";
import { TrendsKpiChip } from "@/app/components/trends/trends-kpi-chip";
import { CustomSelect } from "@/app/components/custom-select";
import {
  Calendar,
  Target,
  Beef,
  Flame,
  Droplets,
  Candy,
  Egg,
  Sandwich,
  Wheat,
  type LucideIcon,
} from "lucide-react";

export type MonthInsightsPayload = {
  ym: string;
  daysInMonth: number;
  mealCount: number;
  totals: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sodium_mg: number;
    sugar_g: number;
  };
  averages: {
    kcalPerDay: number;
    proteinGPerDay: number;
    carbsGPerDay: number;
    fatGPerDay: number;
    fiberGPerDay: number;
    sodiumMgPerDay: number;
    sugarGPerDay: number;
  };
  topFoods: Array<{ label: string; kcal: number; lineCount: number }>;
  adherence: {
    daysWithLogs: number;
    daysInMonth: number;
    daysNearTarget: number | null;
    targetKcal: number | null;
  };
};

type MonthHistoryViewProps = {
  data: MonthInsightsPayload;
  selectedYm: string;
  monthOptions: string[];
  onMonthChange: (ym: string) => void;
  dailyTargetKcal: number | null;
  dailyTargetProteinG: number | null;
  updating?: boolean;
};

function ProgressTrack({
  label,
  value,
  max,
  hint,
  barClassName = "bg-accent-secondary",
}: {
  label: string;
  value: number;
  max: number;
  hint?: string;
  barClassName?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
        <span className="font-mono text-xs font-bold tabular-nums text-foreground">
          {value}
          <span className="text-zinc-500"> / {max}</span>
        </span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full border border-black/10 bg-black/[0.06]"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${barClassName}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-zinc-600">{hint}</p> : null}
    </div>
  );
}

function MacroRow({
  icon: Icon,
  label,
  value,
  unit,
  warn,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  unit: string;
  warn?: boolean;
}) {
  return (
    <tr
      className={`transition-colors duration-200 ${warn ? "bg-amber-50/80" : "hover:bg-warm-neutral/60"}`}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Icon
            className={`h-3.5 w-3.5 shrink-0 ${warn ? "text-amber-700" : "text-zinc-500"}`}
            aria-hidden
          />
          <span className="text-sm font-medium text-zinc-800">{label}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className={`font-mono text-sm font-black tabular-nums ${warn ? "text-amber-800" : "text-foreground"}`}
        >
          {Math.round(value)}
          <span className="ml-0.5 text-[10px] font-bold text-zinc-500">{unit}</span>
        </span>
      </td>
    </tr>
  );
}

export function MonthHistoryView({
  data,
  selectedYm,
  monthOptions,
  onMonthChange,
  dailyTargetKcal,
  dailyTargetProteinG,
  updating = false,
}: MonthHistoryViewProps) {
  const logPct =
    data.adherence.daysInMonth > 0
      ? Math.round((data.adherence.daysWithLogs / data.adherence.daysInMonth) * 100)
      : 0;
  return (
    <div className="space-y-8">
      {updating ? (
        <p className="flex items-center gap-1 text-[10px] font-bold text-signal-deep/80">
          Updating
          <span className="h-1 w-1 motion-safe:animate-pulse rounded-full bg-accent-secondary" />
        </p>
      ) : null}

      <div className="flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-warm-neutral text-zinc-700"
            aria-hidden
          >
            <Calendar className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">
              Viewing
            </p>
            <p className="truncate font-mono text-xl font-black tracking-tight text-foreground">
              {labelYearMonth(selectedYm)}
            </p>
          </div>
        </div>
        <div className="w-full sm:w-auto sm:min-w-[200px]">
          <label
            htmlFor="month-history-select"
            className="mb-2 block px-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600"
          >
            Change month
          </label>
          <CustomSelect
            value={selectedYm}
            onChange={onMonthChange}
            buttonClassName="focus-ring w-full cursor-pointer rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-bold text-zinc-800 transition-colors duration-200 hover:border-black/20"
            options={monthOptions.map((ym) => ({
              value: ym,
              label: labelYearMonth(ym),
            }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <TrendsKpiChip
          label="Days logged"
          value={`${data.adherence.daysWithLogs}/${data.adherence.daysInMonth}`}
          accent="signal"
        />
        <TrendsKpiChip label="Meals" value={String(data.mealCount)} accent="neutral" />
        <TrendsKpiChip
          label="Avg kcal / day"
          value={String(Math.round(data.averages.kcalPerDay))}
          accent="signal"
        />
        <TrendsKpiChip
          label="Avg protein / day"
          value={`${Math.round(data.averages.proteinGPerDay)} g`}
          accent="neutral"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-2xl border border-black/10 bg-white/70 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
            Coverage
          </p>
          <ProgressTrack
            label="Days with at least one log"
            value={data.adherence.daysWithLogs}
            max={data.adherence.daysInMonth}
            hint={`${logPct}% of the calendar month in your timezone.`}
          />
          {data.adherence.targetKcal != null && data.adherence.daysNearTarget != null ? (
            <ProgressTrack
              label="Days near calorie target (±12%)"
              value={data.adherence.daysNearTarget}
              max={data.adherence.daysInMonth}
              hint={`Target ${Math.round(data.adherence.targetKcal)} kcal/day. Informal check, not a grade.`}
              barClassName="bg-signal-deep"
            />
          ) : (
            <p className="rounded-xl border border-dashed border-black/15 bg-warm-neutral/50 px-3 py-3 text-xs leading-relaxed text-zinc-600">
              Set a calorie target in Settings to see how many days landed near goal this month.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/70 p-5">
          <p className="mb-4 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
            Month totals
          </p>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-black/10 bg-warm-neutral/50 px-3 py-2.5">
              <dt className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Calories</dt>
              <dd className="mt-0.5 font-mono text-base font-black tabular-nums">
                {Math.round(data.totals.kcal).toLocaleString()}
              </dd>
            </div>
            <div className="rounded-xl border border-black/10 bg-warm-neutral/50 px-3 py-2.5">
              <dt className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Protein</dt>
              <dd className="mt-0.5 font-mono text-base font-black tabular-nums">
                {Math.round(data.totals.protein_g)} g
              </dd>
            </div>
            <div className="rounded-xl border border-black/10 bg-warm-neutral/50 px-3 py-2.5">
              <dt className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Carbs</dt>
              <dd className="mt-0.5 font-mono text-base font-black tabular-nums">
                {Math.round(data.totals.carbs_g)} g
              </dd>
            </div>
            <div className="rounded-xl border border-black/10 bg-warm-neutral/50 px-3 py-2.5">
              <dt className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Fat</dt>
              <dd className="mt-0.5 font-mono text-base font-black tabular-nums">
                {Math.round(data.totals.fat_g)} g
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {(dailyTargetKcal != null || dailyTargetProteinG != null) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {dailyTargetKcal != null ? (
            <div className="flex gap-3 rounded-2xl border border-accent-secondary/20 bg-protein-tint/50 p-4">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-signal-deep" aria-hidden />
              <p className="text-sm font-medium leading-relaxed text-zinc-700">
                {calorieGoalBlurb(data.averages.kcalPerDay, dailyTargetKcal)}
              </p>
            </div>
          ) : null}
          {dailyTargetProteinG != null ? (
            <div className="flex gap-3 rounded-2xl border border-black/10 bg-warm-neutral/60 p-4">
              <Beef className="mt-0.5 h-4 w-4 shrink-0 text-signal-deep" aria-hidden />
              <p className="text-sm font-medium leading-relaxed text-zinc-700">
                {proteinGoalBlurb(data.averages.proteinGPerDay, dailyTargetProteinG, "month")}
              </p>
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-8 overflow-hidden rounded-2xl border border-black/10 bg-white/80">
        <div className="border-b border-black/10 bg-warm-neutral/40 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
            Daily averages
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[280px] text-left">
            <thead className="sr-only">
              <tr>
                <th scope="col">Nutrient</th>
                <th scope="col">Average per day</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              <MacroRow icon={Flame} label="Calories" value={data.averages.kcalPerDay} unit="kcal" />
              <MacroRow
                icon={Beef}
                label="Protein"
                value={data.averages.proteinGPerDay}
                unit="g"
              />
              <MacroRow
                icon={Sandwich}
                label="Carbs"
                value={data.averages.carbsGPerDay}
                unit="g"
              />
              <MacroRow icon={Egg} label="Fat" value={data.averages.fatGPerDay} unit="g" />
              <MacroRow icon={Wheat} label="Fiber" value={data.averages.fiberGPerDay} unit="g" />
              <MacroRow
                icon={Droplets}
                label="Sodium"
                value={data.averages.sodiumMgPerDay}
                unit="mg"
                warn={data.averages.sodiumMgPerDay > 2300}
              />
              <MacroRow
                icon={Candy}
                label="Sugars"
                value={data.averages.sugarGPerDay}
                unit="g"
                warn={data.averages.sugarGPerDay > 50}
              />
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
