"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ResolvedLine } from "@/lib/nutrition/resolve-ingredient";
import { DEFAULT_HYDRATION_GOAL_ML } from "@/lib/hydration/defaults";
import {
  formatLocalYmd,
  localDayBoundsIsoFromYmd,
  rolling7DateKeys,
  rolling7WindowBoundsIso,
  rolling14WindowBoundsIso,
} from "@/lib/meals/local-date";
import type { RollingWeekSummaryData } from "@/lib/meals/rolling-week-summary-data";
import type { MealDaySummary } from "@/lib/meals/meal-day-summary";
import { parseRollingWeekInsightPayload } from "@/lib/meals/parse-rolling-week-insight-payload";
import type { HomeWeekPrefetch } from "@/lib/meals/load-home-week-prefetch";
import {
  ANALYZE_QUEUE_BROADCAST,
  dequeueAnalyze,
  enqueueAnalyze,
  readAnalyzeQueue,
  type QueuedMeal,
} from "@/lib/meals/analyze-queue";
import { registerAnalyzeQueueSync } from "@/lib/meals/register-analyze-sync";
import { takeMealLogPrefill } from "@/lib/meals/log-prefill";
import { buildLineHintChips } from "@/lib/meals/log-line-hints";
import {
  appendIngredientSuggestionLine,
  applyIngredientSuggestionToValue,
  extractTextareaIngredientQuery,
} from "@/lib/meals/textarea-ingredient-query";
import { LogMealView } from "@/app/components/log/log-meal-view";
import { MISSING_DISPLAY } from "@/lib/copy/display";
import type { LoggingStyle } from "@/lib/profile/preferences";
import { useMealsSyncTick } from "@/lib/meals/use-meals-sync-tick";
import { notifyMealsChanged } from "@/lib/meals-sync";
import { TodayDashboard } from "@/app/components/home/today-dashboard";
import {
  composerRowsToRawInput,
  newComposerRow,
  type ComposerRow,
} from "@/lib/meals/meal-composer";
import type { WeeklyCoachingFocus } from "@/lib/meals/weekly-coaching-focus";
import { AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { alertBanner } from "@/lib/motion";
import { type UnitSystem } from "@/lib/profile/units";
import { HydrationCard } from "./hydration-card";
import type { PreparedMealListItem } from "@/app/components/prepared-meals-section";

type LogInputMode = "free" | "composer";
type UsdaSuggestionItem = {
  label: string;
  fdcId: number;
  kcalPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  fiberPer100g?: number | null;
  sodiumPer100g?: number | null;
  sugarPer100g?: number | null;
  addedSugarPer100g?: number | null;
  /** User-saved prepared batch — shown in meal log search with a distinct tag */
  source?: "prepared";
  preparedMealId?: string;
};
type SelectedFoodHint = {
  label: string;
  labelNorm: string;
  fdcId: number;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
  sodiumPer100g?: number;
  sugarPer100g?: number;
  addedSugarPer100g?: number;
};

function preparedMealToSuggestionItem(
  m: PreparedMealListItem,
): UsdaSuggestionItem | null {
  const title = m.title.trim();
  if (!title) return null;
  const w = m.preparedGrams;
  if (!Number.isFinite(w) || w <= 0) return null;
  const kcal = m.batchTotalKcal;
  const protein = m.batchTotalProteinG;
  const carbs = m.batchTotalCarbsG;
  const fat = m.batchTotalFatG;
  if (![kcal, protein, carbs, fat].every((n) => Number.isFinite(n))) {
    return null;
  }
  const scale = 100 / w;
  const item: UsdaSuggestionItem = {
    label: title,
    fdcId: 0,
    kcalPer100g: kcal * scale,
    proteinPer100g: protein * scale,
    carbsPer100g: carbs * scale,
    fatPer100g: fat * scale,
    source: "prepared",
    preparedMealId: m.id,
  };
  if (m.batchTotalFiberG != null && Number.isFinite(m.batchTotalFiberG)) {
    item.fiberPer100g = m.batchTotalFiberG * scale;
  }
  if (m.batchTotalSodiumMg != null && Number.isFinite(m.batchTotalSodiumMg)) {
    item.sodiumPer100g = m.batchTotalSodiumMg * scale;
  }
  if (m.batchTotalSugarG != null && Number.isFinite(m.batchTotalSugarG)) {
    item.sugarPer100g = m.batchTotalSugarG * scale;
  }
  if (
    m.batchTotalAddedSugarG != null &&
    Number.isFinite(m.batchTotalAddedSugarG)
  ) {
    item.addedSugarPer100g = m.batchTotalAddedSugarG * scale;
  }
  return item;
}

type AnalyzeResponse = {
  mealId: string | null;
  meal_label?: string;
  assumptions?: string[];
  lines: ResolvedLine[];
  totals: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sodium_mg: number;
    sugar_g: number;
    added_sugar_g?: number | null;
  };
};

export type SavedMealItem = {
  id: string;
  title: string;
  rawInput: string;
};

const EMPTY_SAVED_MEALS: SavedMealItem[] = [];
const EMPTY_PREPARED_MEALS: PreparedMealListItem[] = [];

function savedMealsEqual(a: SavedMealItem[], b: SavedMealItem[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i];
    const right = b[i];
    if (
      left.id !== right.id ||
      left.title !== right.title ||
      left.rawInput !== right.rawInput
    ) {
      return false;
    }
  }
  return true;
}

export type MealLogView = "today" | "log";

type MealLogClientProps = {
  variant?: MealLogView;
  /** Local calendar day shown on the log page (YYYY-MM-DD). */
  logDateKey?: string;
  dailyTargetKcal?: number | null;
  dailyTargetProteinG?: number | null;
  /** Resolved daily fluid goal (ml), including profile default */
  dailyTargetHydrationMl?: number;
  loggingStyle?: LoggingStyle | null;
  weeklyCoachingFocus?: WeeklyCoachingFocus | null;
  /** Epic 5 — user-authored if–then plan for the week card */
  weeklyImplementationIntention?: string | null;
  /** Epic 5 — show “active days in last 14” on the week card */
  activeDays14Enabled?: boolean;
  /** Epic 6 — optional smoothed weight sparkline on body card */
  weightTrendOnHomeEnabled?: boolean;
  unitSystem?: UnitSystem;
  savedMeals?: SavedMealItem[];
  /** Week strip + rolling insights prefetched on the server (request TZ). */
  initialWeekPrefetch?: HomeWeekPrefetch | null;
  preparedMeals?: PreparedMealListItem[];
};

function formatLineNutrient(n: number | undefined, fractionDigits = 0) {
  if (n == null || Number.isNaN(n)) return MISSING_DISPLAY;
  if (fractionDigits === 0) return String(Math.round(n));
  return (Math.round(n * 10) / 10).toString();
}

async function readJsonBody(res: Response): Promise<{
  data: Record<string, unknown>;
  emptyBody: boolean;
  parseFailed: boolean;
}> {
  const text = await res.text();
  const emptyBody = !text.trim();
  if (emptyBody) return { data: {}, emptyBody: true, parseFailed: false };
  try {
    return {
      data: JSON.parse(text) as Record<string, unknown>,
      emptyBody: false,
      parseFailed: false,
    };
  } catch {
    return { data: {}, emptyBody: false, parseFailed: true };
  }
}

export function MealLogClient({
  variant = "today",
  logDateKey,
  dailyTargetKcal = null,
  dailyTargetProteinG = null,
  dailyTargetHydrationMl = DEFAULT_HYDRATION_GOAL_ML,
  loggingStyle = null,
  weeklyCoachingFocus = null,
  weeklyImplementationIntention = null,
  activeDays14Enabled = false,
  weightTrendOnHomeEnabled = false,
  unitSystem = "metric",
  savedMeals = EMPTY_SAVED_MEALS,
  initialWeekPrefetch = null,
  preparedMeals = EMPTY_PREPARED_MEALS,
}: MealLogClientProps) {
  const isLogView = variant === "log";
  const todayDateKey = formatLocalYmd(new Date());
  const activeLogDateKey = logDateKey ?? todayDateKey;
  const logDateLabel =
    activeLogDateKey !== todayDateKey
      ? new Date(`${activeLogDateKey}T12:00:00`).toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : null;

  const initialPrefetchKeys =
    initialWeekPrefetch?.dateKeys?.length === 7
      ? [...initialWeekPrefetch.dateKeys]
      : null;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const barcodeVideoRef = useRef<HTMLVideoElement>(null);
  const barcodeStreamRef = useRef<MediaStream | null>(null);
  const barcodeRafRef = useRef<number | null>(null);
  const barcodeZxingStopRef = useRef<(() => void) | null>(null);
  const [text, setText] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [loggingSavedId, setLoggingSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [todayKey, setTodayKey] = useState(0);
  const syncTick = useMealsSyncTick();
  const [lastLoggedRaw, setLastLoggedRaw] = useState<string | null>(null);
  const [editingSavedId, setEditingSavedId] = useState<string | null>(null);
  const [editSavedTitle, setEditSavedTitle] = useState("");
  const [editSavedRaw, setEditSavedRaw] = useState("");
  const [editSavedBusy, setEditSavedBusy] = useState(false);
  const [analyzeQueue, setAnalyzeQueue] = useState<QueuedMeal[]>([]);
  const [flushBusy, setFlushBusy] = useState(false);
  const flushingRef = useRef(false);
  const [logInputMode, setLogInputMode] = useState<LogInputMode>("free");
  const [composerRows, setComposerRows] = useState<ComposerRow[]>(() => [
    newComposerRow(),
    newComposerRow(),
  ]);
  const [freeTextSuggestions, setFreeTextSuggestions] = useState<
    UsdaSuggestionItem[]
  >([]);
  const [freeTextQuery, setFreeTextQuery] = useState("");
  const [showFreeTextSuggestions, setShowFreeTextSuggestions] = useState(false);
  const [showBarcodePanel, setShowBarcodePanel] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState("");
  const [barcodeBusy, setBarcodeBusy] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [barcodeScanning, setBarcodeScanning] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [freeTextSuggestionAnchor, setFreeTextSuggestionAnchor] = useState({
    top: 24,
    left: 24,
  });
  const [selectedFoodHints, setSelectedFoodHints] = useState<
    Record<string, SelectedFoodHint>
  >({});

  const [savedList, setSavedList] = useState<SavedMealItem[]>(savedMeals);

  useEffect(() => {
    setSavedList((prev) =>
      savedMealsEqual(prev, savedMeals) ? prev : savedMeals,
    );
  }, [savedMeals]);

  useEffect(() => {
    if (logInputMode !== "free") {
      setFreeTextSuggestions([]);
      setFreeTextQuery("");
      setShowFreeTextSuggestions(false);
      return;
    }
    const q = freeTextQuery.trim();
    if (q.length < 2) {
      setFreeTextSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      void (async () => {
        const qLower = q.toLowerCase();
        const preparedItems = preparedMeals
          .filter(
            (m) =>
              m.title.trim().length > 0 &&
              m.title.trim().toLowerCase().includes(qLower),
          )
          .map((m) => preparedMealToSuggestionItem(m))
          .filter((item): item is UsdaSuggestionItem => item != null);

        try {
          const url = new URL(
            "/api/nutrition/usda-search",
            window.location.origin,
          );
          url.searchParams.set("q", q);
          const res = await fetch(url.toString(), { credentials: "same-origin" });
          const json = (await res.json().catch(() => ({}))) as {
            items?: UsdaSuggestionItem[];
          };
          const usdaItems = Array.isArray(json.items)
            ? json.items.filter(
                (item): item is UsdaSuggestionItem =>
                  !!item &&
                  typeof item.label === "string" &&
                  item.label.length > 0,
              )
            : [];
          setFreeTextSuggestions([...preparedItems, ...usdaItems]);
        } catch {
          setFreeTextSuggestions(preparedItems);
        }
      })();
    }, 220);
    return () => clearTimeout(timer);
  }, [freeTextQuery, logInputMode, preparedMeals]);

  useEffect(() => {
    const v = takeMealLogPrefill();
    if (!v) return;
    setLogInputMode("free");
    setText(v);
    setError(null);
    setResult(null);
    queueMicrotask(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const len = v.length;
      el.setSelectionRange(len, len);
    });
  }, []);

  const [rollingDateKeys, setRollingDateKeys] = useState<string[]>(
    () => initialPrefetchKeys ?? rolling7DateKeys(),
  );
  const [selectedDateKey, setSelectedDateKey] = useState(() => {
    const keys = initialPrefetchKeys ?? rolling7DateKeys();
    return keys[keys.length - 1]!;
  });
  const weekKey = rollingDateKeys.join("|");
  const [summariesByKey, setSummariesByKey] = useState<
    Record<string, MealDaySummary | null | undefined>
  >(() => initialWeekPrefetch?.summariesByKey ?? {});
  const [weekBatchLoading, setWeekBatchLoading] = useState(
    () => !initialWeekPrefetch,
  );
  const [weekBatchError, setWeekBatchError] = useState<string | null>(null);
  const [weekInsightsApi, setWeekInsightsApi] =
    useState<RollingWeekSummaryData | null>(
      () => initialWeekPrefetch?.weekInsights ?? null,
    );

  const prefetchWeekKeyJoined =
    initialPrefetchKeys?.join("|") ?? null;
  const prevWeekKeyRef = useRef<string | null>(prefetchWeekKeyJoined);
  const skipInitialWeekFetchRef = useRef(!!initialWeekPrefetch);

  useEffect(() => {
    if (isLogView) return;
    let cancelled = false;
    const ac = new AbortController();

    const clientTz =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "UTC";
    const prefetchTz = initialWeekPrefetch?.timeZone;
    const prefetchKeysJoined =
      initialWeekPrefetch?.dateKeys?.length === 7
        ? initialWeekPrefetch.dateKeys.join("|")
        : null;

    if (
      prefetchTz &&
      prefetchKeysJoined &&
      prefetchTz !== clientTz &&
      rollingDateKeys.join("|") === prefetchKeysJoined
    ) {
      const k = rolling7DateKeys();
      const clientWeekJoined = k.join("|");
      // If calendar labels match both zones, resetting keys is a no-op that would
      // re-trigger this branch forever (new array reference each time). Refetch only.
      if (clientWeekJoined !== prefetchKeysJoined) {
        setRollingDateKeys(k);
        setSelectedDateKey(k[k.length - 1]!);
        setSummariesByKey(Object.fromEntries(k.map((x) => [x, undefined])));
        setWeekBatchLoading(true);
        setWeekInsightsApi(null);
        setWeekBatchError(null);
        skipInitialWeekFetchRef.current = false;
        return () => {
          cancelled = true;
          ac.abort();
        };
      }
      skipInitialWeekFetchRef.current = false;
    }

    const keys = rollingDateKeys;
    const ranges = keys.map((k) => {
      const { fromIso, toIso } = localDayBoundsIsoFromYmd(k);
      return { from: fromIso, to: toIso };
    });

    const weekKeyLocal = keys.join("|");
    const weekChanged = prevWeekKeyRef.current !== weekKeyLocal;
    prevWeekKeyRef.current = weekKeyLocal;

    if (weekChanged) {
      setWeekBatchLoading(true);
      setWeekBatchError(null);
      setWeekInsightsApi(null);
      setSummariesByKey(Object.fromEntries(keys.map((k) => [k, undefined])));
    }

    if (
      skipInitialWeekFetchRef.current &&
      initialWeekPrefetch &&
      prefetchTz === clientTz &&
      weekKeyLocal === prefetchKeysJoined
    ) {
      skipInitialWeekFetchRef.current = false;
      setWeekBatchLoading(false);
      return () => {
        cancelled = true;
        ac.abort();
      };
    }
    skipInitialWeekFetchRef.current = false;

    async function run() {
      try {
        const { fromIso, toIso } = rolling7WindowBoundsIso();
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const insightQ = new URLSearchParams({
          from: fromIso,
          to: toIso,
          timeZone,
        });

        const fetchOpts = { signal: ac.signal } as const;
        const [batchRes, insightRes] = await Promise.all([
          fetch("/api/meals/summary/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ranges,
              includeTiming: true,
              includeHydration: true,
              includeMeals: true,
              timeZone,
            }),
            ...fetchOpts,
          }),
          fetch(`/api/meals/insights?${insightQ}`, fetchOpts),
        ]);

        const batchJson = (await batchRes.json()) as {
          results?: Array<
            | {
                ok: true;
                mealCount: number;
                totals: MealDaySummary["totals"];
                timing?: MealDaySummary["timing"];
                drivers?: MealDaySummary["drivers"];
                hydrationTotalMl?: number;
                appleHealth?: MealDaySummary["appleHealth"];
                meals?: MealDaySummary["meals"];
              }
            | { ok: false; error?: string }
          >;
          error?: string;
        };

        if (!batchRes.ok) {
          if (!cancelled) {
            setWeekBatchError(batchJson.error ?? "Could not load week data");
            if (weekChanged) {
              setSummariesByKey(
                Object.fromEntries(keys.map((k) => [k, null])),
              );
            }
          }
          return;
        }

        const next: Record<string, MealDaySummary | null | undefined> = {};
        const results = batchJson.results ?? [];
        keys.forEach((k, i) => {
          const r = results[i];
          if (!r || !("ok" in r) || !r.ok) {
            next[k] = null;
          } else {
            next[k] = {
              mealCount: r.mealCount,
              totals: r.totals,
              ...(r.timing ? { timing: r.timing } : {}),
              ...(r.drivers ? { drivers: r.drivers } : {}),
              ...(typeof r.hydrationTotalMl === "number"
                ? { hydrationTotalMl: r.hydrationTotalMl }
                : {}),
              ...(r.appleHealth ? { appleHealth: r.appleHealth } : {}),
              ...(r.meals ? { meals: r.meals } : {}),
            };
          }
        });
        if (!cancelled) {
          setSummariesByKey(next);
          setWeekBatchError(null);
        }

        if (insightRes.ok && !cancelled) {
          const insightJson = (await insightRes.json()) as Record<
            string,
            unknown
          >;
          let mapped = parseRollingWeekInsightPayload(insightJson);
          if (mapped && activeDays14Enabled) {
            const r14 = rolling14WindowBoundsIso();
            const q14 = new URLSearchParams({
              from: r14.fromIso,
              to: r14.toIso,
              timeZone,
              windowDays: "14",
            });
            try {
              const res14 = await fetch(`/api/meals/insights?${q14}`, {
                signal: ac.signal,
              });
              if (res14.ok) {
                const j14 = (await res14.json()) as {
                  daysWithLogs?: unknown;
                };
                const dw = Number(j14.daysWithLogs);
                if (Number.isFinite(dw)) {
                  mapped = {
                    ...mapped,
                    recovery14: { daysWithLogs: dw, daysInWindow: 14 },
                  };
                }
              }
            } catch {
              /* keep mapped without recovery14 */
            }
          }
          if (mapped) setWeekInsightsApi(mapped);
        }
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === "AbortError")) {
          return;
        }
        if (!cancelled) {
          setWeekBatchError("Network error");
          if (weekChanged) {
            setSummariesByKey(
              Object.fromEntries(keys.map((k) => [k, null])),
            );
          }
        }
      } finally {
        if (!cancelled) setWeekBatchLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [
    isLogView,
    rollingDateKeys,
    todayKey,
    syncTick,
    activeDays14Enabled,
    initialWeekPrefetch,
  ]);

  const weekInsightData = useMemo(() => {
    if (weekInsightsApi) return weekInsightsApi;
    if (weekBatchLoading || weekBatchError) return null;
    const keys = weekKey.split("|");
    let kcal = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let fiber = 0;
    let sodium = 0;
    let sugar = 0;
    let meals = 0;
    let daysWithLogs = 0;
    for (const k of keys) {
      const s = summariesByKey[k];
      if (!s) continue;
      kcal += s.totals.kcal;
      protein += s.totals.protein_g;
      carbs += s.totals.carbs_g;
      fat += s.totals.fat_g;
      fiber += s.totals.fiber_g ?? 0;
      sodium += s.totals.sodium_mg ?? 0;
      sugar += s.totals.sugar_g ?? 0;
      meals += s.mealCount;
      if (s.mealCount > 0) daysWithLogs += 1;
    }
    return {
      mealCount: meals,
      daysInWindow: 7,
      daysWithLogs,
      totals: {
        kcal,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
        fiber_g: fiber,
        sodium_mg: sodium,
        sugar_g: sugar,
      },
      averages: {
        kcalPerDay: Math.round((kcal / 7) * 10) / 10,
        proteinGPerDay: Math.round((protein / 7) * 10) / 10,
        fiberGPerDay: Math.round((fiber / 7) * 10) / 10,
        sodiumMgPerDay: Math.round(sodium / 7),
        sugarGPerDay: Math.round((sugar / 7) * 10) / 10,
      },
    } satisfies RollingWeekSummaryData;
  }, [
    weekInsightsApi,
    weekBatchLoading,
    weekBatchError,
    summariesByKey,
    weekKey,
  ]);

  const syncQueueState = useCallback(async () => {
    const items = await readAnalyzeQueue();
    setAnalyzeQueue(items);
  }, []);

  const flushAnalyzeQueue = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (flushingRef.current) return;
    flushingRef.current = true;
    setFlushBusy(true);

    async function runFlush() {
      let anySuccess = false;
      for (;;) {
        const items = await readAnalyzeQueue();
        if (items.length === 0) break;
        const item = items[0]!;
        try {
          const res = await fetch("/api/meals/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rawInput: item.rawInput }),
          });
          if (res.ok) {
            let parsed: { mealId?: string; totals?: { kcal?: number } };
            try {
              parsed = (await res.json()) as typeof parsed;
            } catch {
              parsed = {};
            }
            await dequeueAnalyze(item.id);
            anySuccess = true;
            setAnalyzeQueue(await readAnalyzeQueue());
            continue;
          }
          break;
        } catch {
          break;
        }
      }
      setAnalyzeQueue(await readAnalyzeQueue());
      if (anySuccess) {
        setTodayKey((k) => k + 1);
        setSelectedDateKey(formatLocalYmd(new Date()));
        notifyMealsChanged();
      }
    }

    try {
      if (typeof navigator !== "undefined" && navigator.locks?.request) {
        await navigator.locks.request("calorie-analyze-flush", async () => {
          await runFlush();
        });
      } else {
        await runFlush();
      }
    } finally {
      flushingRef.current = false;
      setFlushBusy(false);
    }
  }, []);

  useEffect(() => {
    void syncQueueState();
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(ANALYZE_QUEUE_BROADCAST);
      bc.onmessage = () => void syncQueueState();
    } catch {
      /* optional */
    }
    function onSwMessage(e: MessageEvent) {
      if (e.data?.type === "FLUSH_ANALYZE_QUEUE") {
        void flushAnalyzeQueue();
      }
    }
    navigator.serviceWorker?.addEventListener?.("message", onSwMessage);
    return () => {
      bc?.close();
      navigator.serviceWorker?.removeEventListener?.("message", onSwMessage);
    };
  }, [syncQueueState, flushAnalyzeQueue]);

  useEffect(() => {
    if (!isLogView) return;
    function onOnline() {
      void flushAnalyzeQueue();
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flushAnalyzeQueue, isLogView]);

  useEffect(() => {
    if (!isLogView) return;
    if (analyzeQueue.length === 0) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    void flushAnalyzeQueue();
  }, [syncTick, analyzeQueue.length, flushAnalyzeQueue, isLogView]);

  const busy =
    loading ||
    loggingSavedId !== null ||
    editSavedBusy;

  const effectiveMealRaw = useMemo(() => {
    if (logInputMode === "composer") {
      return composerRowsToRawInput(composerRows).trim();
    }
    return text.trim();
  }, [logInputMode, composerRows, text]);

  function switchInputMode(next: LogInputMode) {
    if (next === logInputMode) return;
    setError(null);
    setResult(null);
    if (next === "free") {
      const merged = composerRowsToRawInput(composerRows).trim();
      if (merged) setText(merged);
    }
    setLogInputMode(next);
  }

  async function runAnalyze(
    rawInput: string,
    mode: "form" | { savedId: string },
  ) {
    const trimmed = rawInput.trim();
    if (!trimmed) return;
    setError(null);
    setResult(null);
    if (mode === "form") setLoading(true);
    else setLoggingSavedId(mode.savedId);
    try {
      const res = await fetch("/api/meals/analyze", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInput: trimmed,
          selectedFoodHints: Object.values(selectedFoodHints),
        }),
      });
      const { data, emptyBody, parseFailed } = await readJsonBody(res);
      if (!res.ok) {
        if (res.status === 503) {
          await enqueueAnalyze(trimmed);
          await registerAnalyzeQueueSync();
          await syncQueueState();
          setError(
            "The server is temporarily unavailable. This meal is queued and will log automatically when it’s back.",
          );
          return;
        }
        const fromJson =
          typeof data.error === "string" && data.error.trim()
            ? data.error
            : null;
        let msg: string;
        if (fromJson) {
          msg = fromJson;
        } else if (emptyBody) {
          msg = `Server returned HTTP ${res.status} with no response body.`;
        } else if (parseFailed) {
          msg = `Server returned HTTP ${res.status} with a non-JSON response.`;
        } else {
          msg = `Request failed (HTTP ${res.status})`;
        }
        setError(msg);
        return;
      }
      const parsed = data as AnalyzeResponse;
      setResult(parsed);
      setLastLoggedRaw(trimmed);
      setTodayKey((k) => k + 1);
      setSelectedDateKey(formatLocalYmd(new Date()));
      notifyMealsChanged();

      // Clear inputs on successful log
      if (mode === "form") {
        setText("");
        setComposerRows([newComposerRow(), newComposerRow()]);
        setSelectedFoodHints({});
      }
    } catch {
      await enqueueAnalyze(trimmed);
      await registerAnalyzeQueueSync();
      await syncQueueState();
      setError(
        "You appear to be offline. This meal is saved and will log when you’re back online.",
      );
    } finally {
      if (mode === "form") setLoading(false);
      else setLoggingSavedId(null);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw =
      logInputMode === "composer"
        ? composerRowsToRawInput(composerRows).trim()
        : text.trim();
    await runAnalyze(raw, "form");
  }

  function logAgain(rawInput: string) {
    setError(null);
    setResult(null);
    setLogInputMode("free");
    setText(rawInput);
    queueMicrotask(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(
        rawInput.length,
        rawInput.length,
      );
    });
  }

  function rememberSelectedFoodHint(item: UsdaSuggestionItem) {
    const labelNorm = item.label.trim().toLowerCase().replace(/\s+/g, " ");
    if (!labelNorm) return;
    const kcalPer100g = item.kcalPer100g;
    const proteinPer100g = item.proteinPer100g;
    const carbsPer100g = item.carbsPer100g;
    const fatPer100g = item.fatPer100g;
    if (
      kcalPer100g == null ||
      proteinPer100g == null ||
      carbsPer100g == null ||
      fatPer100g == null
    ) {
      return;
    }
    setSelectedFoodHints((prev) => ({
      ...prev,
      [labelNorm]: {
        label: item.label,
        labelNorm,
        fdcId: item.fdcId,
        kcalPer100g,
        proteinPer100g,
        carbsPer100g,
        fatPer100g,
        ...(item.fiberPer100g != null
          ? { fiberPer100g: item.fiberPer100g }
          : {}),
        ...(item.sodiumPer100g != null
          ? { sodiumPer100g: item.sodiumPer100g }
          : {}),
        ...(item.sugarPer100g != null
          ? { sugarPer100g: item.sugarPer100g }
          : {}),
        ...(item.addedSugarPer100g != null
          ? { addedSugarPer100g: item.addedSugarPer100g }
          : {}),
      },
    }));
  }

  function ingredientLinesFromText(value: string) {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function updateFreeTextSuggestionAnchor(caret: number) {
    const el = textareaRef.current;
    if (!el) return;
    const value = el.value;
    const before = value.slice(0, Math.max(0, caret));
    const lineStart = before.lastIndexOf("\n") + 1;
    const currentLine = before.slice(lineStart);

    // Compact positioning next to current typed token.
    const approxCharWidth = 8;
    const approxLineHeight = 26;
    const rawLeft = 24 + currentLine.length * approxCharWidth;
    const rawTop = 24 + before.split("\n").length * approxLineHeight;
    const maxLeft = Math.max(24, el.clientWidth - 220);
    const maxTop = Math.max(24, el.clientHeight - 120);

    setFreeTextSuggestionAnchor({
      left: Math.min(rawLeft, maxLeft),
      top: Math.min(rawTop, maxTop),
    });
  }

  const derivedSelectedHints = useMemo(() => {
    const lines = ingredientLinesFromText(text);
    const hintList = Object.values(selectedFoodHints);
    if (lines.length === 0 || hintList.length === 0) return [];

    return buildLineHintChips(
      lines,
      hintList.map((h) => ({
        label: h.label,
        labelNorm: h.labelNorm,
        kcalPer100g: h.kcalPer100g,
      })),
    );
  }, [text, selectedFoodHints]);

  function pruneSelectedHintsForText(value: string) {
    const normalizedText = value.toLowerCase().replace(/\s+/g, " ").trim();
    setSelectedFoodHints((prev) => {
      const entries = Object.entries(prev);
      if (entries.length === 0) return prev;
      const kept = entries.filter(([, hint]) =>
        normalizedText.includes(hint.labelNorm),
      );
      if (kept.length === entries.length) return prev;
      return Object.fromEntries(kept);
    });
  }

  function onFreeTextChange(value: string, caret: number) {
    setText(value);
    pruneSelectedHintsForText(value);
    const q = extractTextareaIngredientQuery(value, caret);
    updateFreeTextSuggestionAnchor(caret);
    setFreeTextQuery(q);
    setShowFreeTextSuggestions(q.length >= 2);
  }

  function applyFreeTextSuggestionItem(
    item: UsdaSuggestionItem,
    options?: { appendAsNewLine?: boolean },
  ) {
    rememberSelectedFoodHint(item);
    const label = item.label;
    const el = textareaRef.current;
    if (!el) return;
    if (options?.appendAsNewLine) {
      const next = appendIngredientSuggestionLine(text, label);
      setText(next);
      setFreeTextQuery(label);
      setShowFreeTextSuggestions(false);
      queueMicrotask(() => {
        const nextCaret = next.length;
        el.focus();
        el.setSelectionRange(nextCaret, nextCaret);
      });
      return;
    }
    const value = text;
    const caret = el.selectionStart ?? value.length;
    const { next, nextCaret } = applyIngredientSuggestionToValue(
      value,
      caret,
      label,
    );

    setText(next);
    setFreeTextQuery(label);
    setShowFreeTextSuggestions(false);
    queueMicrotask(() => {
      el.focus();
      el.setSelectionRange(nextCaret, nextCaret);
    });
  }

  async function lookupBarcode(barcode: string) {
    const clean = barcode.trim();
    if (!clean) return;
    setBarcodeBusy(true);
    setBarcodeError(null);
    try {
      const url = new URL("/api/nutrition/barcode", window.location.origin);
      url.searchParams.set("barcode", clean);
      const res = await fetch(url.toString(), { credentials: "same-origin" });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        item?: UsdaSuggestionItem | null;
      };
      if (!res.ok) {
        setBarcodeError(json.error ?? "Barcode lookup failed");
        return;
      }
      if (!json.item) {
        setBarcodeError("No food found for this barcode");
        return;
      }
      applyFreeTextSuggestionItem(json.item, { appendAsNewLine: true });
      setShowBarcodePanel(false);
      setBarcodeValue("");
    } catch {
      setBarcodeError("Barcode lookup failed");
    } finally {
      setBarcodeBusy(false);
    }
  }

  function stopBarcodeScanner() {
    if (barcodeRafRef.current != null) {
      cancelAnimationFrame(barcodeRafRef.current);
      barcodeRafRef.current = null;
    }
    if (barcodeZxingStopRef.current) {
      try {
        barcodeZxingStopRef.current();
      } catch {
        // Ignore scanner shutdown errors.
      }
      barcodeZxingStopRef.current = null;
    }
    if (barcodeStreamRef.current) {
      for (const t of barcodeStreamRef.current.getTracks()) t.stop();
      barcodeStreamRef.current = null;
    }
    setBarcodeScanning(false);
  }

  async function startBarcodeScanner() {
    const BarcodeDetectorCtor = (window as Window & {
      BarcodeDetector?: new (opts?: { formats?: string[] }) => {
        detect: (el: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
      };
    }).BarcodeDetector;
    if (!navigator.mediaDevices?.getUserMedia) {
      setBarcodeError("Camera is not available on this device/browser");
      return;
    }
    setBarcodeError(null);
    const video = barcodeVideoRef.current;
    if (!video) {
      return;
    }

    if (!BarcodeDetectorCtor) {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        let handled = false;
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          video,
          (result) => {
            const code = result?.getText?.();
            if (!code || handled) return;
            handled = true;
            setBarcodeValue(code);
            stopBarcodeScanner();
            void lookupBarcode(code);
          },
        );
        barcodeZxingStopRef.current = () => controls.stop();
        setBarcodeScanning(true);
      } catch {
        setBarcodeError("Could not start camera scanner on this device/browser");
        stopBarcodeScanner();
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      barcodeStreamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      setBarcodeScanning(true);

      const detector = new BarcodeDetectorCtor({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });

      const tick = async () => {
        const v = barcodeVideoRef.current;
        if (!v || !barcodeStreamRef.current) return;
        try {
          const found = await detector.detect(v);
          const code = found.find((f) => typeof f.rawValue === "string")?.rawValue;
          if (code) {
            setBarcodeValue(code);
            stopBarcodeScanner();
            await lookupBarcode(code);
            return;
          }
        } catch {
          // Keep scanning; individual detect failures are common between frames.
        }
        barcodeRafRef.current = requestAnimationFrame(() => {
          void tick();
        });
      };

      barcodeRafRef.current = requestAnimationFrame(() => {
        void tick();
      });
    } catch {
      setBarcodeError("Could not access camera");
      stopBarcodeScanner();
    }
  }

  function beginEditSaved(s: SavedMealItem) {
    setEditingSavedId(s.id);
    setEditSavedTitle(s.title);
    setEditSavedRaw(s.rawInput);
    setError(null);
  }

  function cancelEditSaved() {
    setEditingSavedId(null);
    setEditSavedTitle("");
    setEditSavedRaw("");
  }

  async function submitEditSaved(id: string) {
    const title = editSavedTitle.trim();
    const raw = editSavedRaw.trim();
    if (!title || !raw) {
      setError("Name and meal text are required.");
      return;
    }
    setEditSavedBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/saved-meals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, rawInput: raw }),
      });
      const data = (await res.json()) as {
        error?: string;
        item?: { id: string; title: string; rawInput: string };
      };
      if (!res.ok) {
        setError(data.error ?? "Could not update favorite");
        return;
      }
      if (data.item) {
        setSavedList((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...data.item! } : s)),
        );
      }
      cancelEditSaved();
    } catch {
      setError("Network error");
    } finally {
      setEditSavedBusy(false);
    }
  }

  async function removeSaved(id: string) {
    if (!confirm("Remove this saved meal?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/saved-meals/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error ?? "Could not remove");
        return;
      }
      if (editingSavedId === id) {
        cancelEditSaved();
      }
      setSavedList((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setError("Network error");
    }
  }

  useEffect(() => {
    return () => {
      stopBarcodeScanner();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 768px), (pointer: coarse)");
    const apply = () => setIsMobileDevice(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!isMobileDevice) {
      stopBarcodeScanner();
    }
  }, [isMobileDevice]);

  useEffect(() => {
    if (!showBarcodePanel || !isMobileDevice) return;
    const timer = window.setTimeout(() => {
      void startBarcodeScanner();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [showBarcodePanel, isMobileDevice]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.barcodeOverlayOpen = showBarcodePanel ? "1" : "0";
    window.dispatchEvent(new Event("barcode-overlay-change"));
    return () => {
      document.body.dataset.barcodeOverlayOpen = "0";
      window.dispatchEvent(new Event("barcode-overlay-change"));
    };
  }, [showBarcodePanel]);

  return (
    <motion.div
      className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-24 pt-6 sm:px-6"
    >
      {isLogView ? (
        <header className="mb-5 flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#356d30]">
                Meal logger
              </p>
              <h1 className="font-mono text-3xl font-black tracking-tight text-[#171412] sm:text-4xl">
                Log meal
              </h1>
            </div>
            {logDateLabel ? (
              <span className="rounded-full border border-[#4f9d45]/25 bg-[#eaf7df] px-3 py-1 text-xs font-bold text-[#356d30]">
                {logDateLabel}
              </span>
            ) : null}
          </div>
          <p className="max-w-2xl text-sm font-medium text-zinc-600">
            Log meals and fluids for this day. Describe food, build rows, scan a barcode, or track water in the hydration panel.
          </p>
        </header>
      ) : null}

      {!isLogView ? (
        <TodayDashboard
          selectedDateKey={selectedDateKey}
          onSelectDateKey={setSelectedDateKey}
          rollingDateKeys={rollingDateKeys}
          summariesByKey={summariesByKey}
          weekBatchLoading={weekBatchLoading}
          weekBatchError={weekBatchError}
          dailyTargetKcal={dailyTargetKcal}
          dailyTargetProteinG={dailyTargetProteinG}
          dailyTargetHydrationMl={dailyTargetHydrationMl}
          unitSystem={unitSystem}
          weightTrendOnHomeEnabled={weightTrendOnHomeEnabled}
          weightCardKey={todayKey}
          weeklyCoachingFocus={weeklyCoachingFocus}
          weeklyImplementationIntention={weeklyImplementationIntention}
          weekInsightData={weekInsightData}
        />
      ) : null}

      <AnimatePresence>
        {analyzeQueue.length > 0 && (
          <motion.div
            role="status"
            aria-live="polite"
            variants={alertBanner}
            initial="hidden"
            animate="show"
            exit="exit"
            className="mb-5 flex items-center justify-between rounded-3xl border border-sky-500/20 bg-sky-500/10 p-4 text-sky-700"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-bold">
                  {analyzeQueue.length} meal
                  {analyzeQueue.length > 1 ? "s" : ""} queued offline
                </p>
                <p className="text-xs opacity-70">
                  Will sync when connection restores.
                </p>
              </div>
            </div>
            {isLogView ? (
              <button
                type="button"
                onClick={() => void flushAnalyzeQueue()}
                className="focus-ring cursor-pointer text-xs font-bold underline decoration-sky-500/30 underline-offset-4"
              >
                Sync now
              </button>
            ) : (
              <Link
                href="/log"
                className="focus-ring cursor-pointer text-xs font-bold underline decoration-sky-500/30 underline-offset-4"
              >
                Open logger
              </Link>
            )}
          </motion.div>
        )}

        {error ? (
          <motion.div
            role="alert"
            variants={alertBanner}
            initial="hidden"
            animate="show"
            exit="exit"
            className="mb-5 flex items-center gap-3 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-red-600"
          >
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isLogView ? (
        <div
          className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8"
          aria-label="Log meals and hydration"
        >
          <div className="min-w-0 space-y-5 lg:col-span-7">
            <LogMealView
              logInputMode={logInputMode}
              onSwitchInputMode={switchInputMode}
              text={text}
              onFreeTextChange={onFreeTextChange}
              onFreeTextFocus={() => {
                const el = textareaRef.current;
                const caret = el?.selectionStart ?? text.length;
                updateFreeTextSuggestionAnchor(caret);
                setShowFreeTextSuggestions(freeTextQuery.trim().length >= 2);
              }}
              onFreeTextBlur={() => {
                setTimeout(() => setShowFreeTextSuggestions(false), 120);
              }}
              textareaRef={textareaRef}
              composerRows={composerRows}
              onComposerRowsChange={setComposerRows}
              onSuggestionPicked={rememberSelectedFoodHint}
              busy={busy}
              loading={loading}
              canSubmit={!!effectiveMealRaw.trim()}
              onSubmit={onSubmit}
              hintChips={derivedSelectedHints}
              freeTextSuggestions={freeTextSuggestions}
              showFreeTextSuggestions={showFreeTextSuggestions}
              freeTextSuggestionAnchor={freeTextSuggestionAnchor}
              onPickSuggestion={applyFreeTextSuggestionItem}
              lastLoggedRaw={lastLoggedRaw}
              onLogAgain={logAgain}
              showBarcodePanel={showBarcodePanel}
              onToggleBarcodePanel={() => {
                const next = !showBarcodePanel;
                setShowBarcodePanel(next);
                setBarcodeError(null);
                if (next) {
                  if (!isMobileDevice) {
                    stopBarcodeScanner();
                  }
                } else {
                  stopBarcodeScanner();
                }
              }}
              barcodeVideoRef={barcodeVideoRef}
              barcodeScanning={barcodeScanning}
              barcodeValue={barcodeValue}
              onBarcodeValueChange={setBarcodeValue}
              barcodeBusy={barcodeBusy}
              barcodeError={barcodeError}
              onLookupBarcode={(value) => void lookupBarcode(value)}
              onCloseBarcodePanel={() => {
                stopBarcodeScanner();
                setShowBarcodePanel(false);
              }}
              onToggleBarcodeScanner={() =>
                barcodeScanning
                  ? stopBarcodeScanner()
                  : void startBarcodeScanner()
              }
              result={result}
              onClearResult={() => setResult(null)}
            />
          </div>

          <aside
            aria-label="Hydration"
            className="min-w-0 lg:col-span-5 lg:sticky lg:top-20"
          >
            <HydrationCard
              dateKey={activeLogDateKey}
              unitSystem={unitSystem}
              key={`log-hydration-${activeLogDateKey}`}
            />
          </aside>
        </div>
      ) : null}


      <p className="mt-12 text-center text-[10px] font-medium text-zinc-400">
        TrackOMacro
      </p>
    </motion.div>
  );
}
