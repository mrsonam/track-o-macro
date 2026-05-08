"use client";

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
import { loggingStyleBlurb } from "@/lib/profile/preferences";
import type { LoggingStyle } from "@/lib/profile/preferences";
import { useMealsSyncTick } from "@/lib/meals/use-meals-sync-tick";
import { notifyMealsChanged } from "@/lib/meals-sync";
import { DaySummaryCard } from "./day-summary-card";
import { WeekCalorieStrip } from "./week-calorie-strip";
import { WeekInsightsCard } from "./week-insights-card";
import {
  fdcDescriptionText,
  formatSourceConfidence,
  resolveUsdaLink,
  sourceNoteFromDetail,
} from "@/lib/nutrition/source-detail";
import { MealItemComposer } from "./meal-item-composer";
import {
  composerHasAnalyzableContent,
  composerRowsToRawInput,
  newComposerRow,
  type ComposerRow,
} from "@/lib/meals/meal-composer";
import type { WeeklyCoachingFocus } from "@/lib/meals/weekly-coaching-focus";
import { 
  Sparkles, 
  History as HistoryIcon, 
  Plus, 
  Keyboard, 
  ChevronRight, 
  LayoutGrid,
  Zap,
  ScanLine,
  Camera,
  X,
  Edit2,
  AlertCircle,
  Scale
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type UnitSystem } from "@/lib/profile/units";
import { WeightLogCard } from "./weight-log-card";
import { HydrationCard } from "./hydration-card";
import { AdaptiveTargetCard } from "./adaptive-target-card";

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

type AnalyzeResponse = {
  mealId: string;
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

export type RecentMealItem = {
  id: string;
  rawInput: string;
  totalKcal: number;
  createdAt: string;
};

export type SavedMealItem = {
  id: string;
  title: string;
  rawInput: string;
};

type MealLogClientProps = {
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
  recentMeals?: RecentMealItem[];
  /** Week strip + rolling insights prefetched on the server (request TZ). */
  initialWeekPrefetch?: HomeWeekPrefetch | null;
};

function truncate(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

function formatLineNutrient(n: number | undefined, fractionDigits = 0) {
  if (n == null || Number.isNaN(n)) return "—";
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
  dailyTargetKcal = null,
  dailyTargetProteinG = null,
  dailyTargetHydrationMl = DEFAULT_HYDRATION_GOAL_ML,
  loggingStyle = null,
  weeklyCoachingFocus = null,
  weeklyImplementationIntention = null,
  activeDays14Enabled = false,
  weightTrendOnHomeEnabled = false,
  unitSystem = "metric",
  savedMeals = [],
  recentMeals = [],
  initialWeekPrefetch = null,
}: MealLogClientProps) {
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

  const [recentList, setRecentList] = useState<RecentMealItem[]>(recentMeals);
  const [savedList, setSavedList] = useState<SavedMealItem[]>(savedMeals);

  useEffect(() => {
    setRecentList(recentMeals);
  }, [recentMeals]);

  useEffect(() => {
    setSavedList(savedMeals);
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
          console.log("[avocavo-search][client] suggestions:", json);
          setFreeTextSuggestions(
            Array.isArray(json.items)
              ? json.items.filter(
                  (item): item is UsdaSuggestionItem =>
                    !!item && typeof item.label === "string" && item.label.length > 0,
                )
              : [],
          );
        } catch {
          setFreeTextSuggestions([]);
        }
      })();
    }, 220);
    return () => clearTimeout(timer);
  }, [freeTextQuery, logInputMode]);

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
            if (parsed.mealId && parsed.totals?.kcal != null) {
              setRecentList((prev) => {
                const row: RecentMealItem = {
                  id: parsed.mealId!,
                  rawInput: item.rawInput,
                  totalKcal: parsed.totals!.kcal!,
                  createdAt: new Date().toISOString(),
                };
                return [row, ...prev.filter((m) => m.id !== parsed.mealId)].slice(
                  0,
                  5,
                );
              });
            }
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
    function onOnline() {
      void flushAnalyzeQueue();
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flushAnalyzeQueue]);

  useEffect(() => {
    if (analyzeQueue.length === 0) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    void flushAnalyzeQueue();
  }, [syncTick, analyzeQueue.length, flushAnalyzeQueue]);

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
      setRecentList((prev) => {
        const row: RecentMealItem = {
          id: parsed.mealId,
          rawInput: trimmed,
          totalKcal: parsed.totals.kcal,
          createdAt: new Date().toISOString(),
        };
        return [row, ...prev.filter((m) => m.id !== parsed.mealId)].slice(0, 5);
      });
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

  function extractTextareaIngredientQuery(value: string, caret: number): string {
    const before = value.slice(0, Math.max(0, caret));
    const lineStart = before.lastIndexOf("\n") + 1;
    const currentLine = before.slice(lineStart);
    const token = currentLine.split(",").pop()?.trim() ?? "";
    return token;
  }

  function parseIngredientGramsFromLine(line: string): number | null {
    const m = line.match(/(\d+(?:\.\d+)?)\s*g\b/i);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
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
    if (lines.length === 0) return [];

    const hintList = Object.values(selectedFoodHints);
    if (hintList.length === 0) return [];

    const out: Array<{
      key: string;
      label: string;
      labelNorm: string;
      grams: number | null;
      kcal: number | null;
      hint: SelectedFoodHint;
    }> = [];

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i]!;
      const normalizedLine = rawLine.toLowerCase().replace(/\s+/g, " ");
      const grams = parseIngredientGramsFromLine(rawLine);

      for (const hint of hintList) {
        if (!normalizedLine.includes(hint.labelNorm)) continue;
        const kcal =
          grams != null ? (hint.kcalPer100g * grams) / 100 : null;
        out.push({
          key: `${i}-${hint.labelNorm}`,
          label: hint.label,
          labelNorm: hint.labelNorm,
          grams,
          kcal,
          hint,
        });
        break;
      }
    }

    return out;
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
      const base = text.trimEnd();
      const next = base ? `${base}\n${label} 100g` : `${label} 100g`;
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
    const before = value.slice(0, caret);
    const after = value.slice(caret);
    const lineStart = before.lastIndexOf("\n") + 1;
    const currentLine = before.slice(lineStart);
    const lastComma = currentLine.lastIndexOf(",");
    const tokenStartInLine = lastComma >= 0 ? lastComma + 1 : 0;
    const absoluteTokenStart = lineStart + tokenStartInLine;
    const prefix = value.slice(0, absoluteTokenStart);
    const suffix = after;
    const spacer = prefix.endsWith(" ") || prefix.endsWith(",") ? "" : " ";
    const next = `${prefix}${spacer}${label} 100g${suffix}`;

    setText(next);
    setFreeTextQuery(label);
    setShowFreeTextSuggestions(false);
    queueMicrotask(() => {
      const nextCaret = (prefix + spacer + label + " 100g").length;
      el.focus();
      el.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function applyFreeTextSuggestion(label: string) {
    const picked = freeTextSuggestions.find((s) => s.label === label);
    if (!picked) return;
    applyFreeTextSuggestionItem(picked);
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

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-24 pt-6 sm:px-6">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col gap-6">
          {/* Top Progress Bar for Selected Date */}
          <WeekCalorieStrip
            dateKeys={rollingDateKeys}
            selectedDateKey={selectedDateKey}
            onSelectDateKey={setSelectedDateKey}
            dailyTargetKcal={dailyTargetKcal}
            dailyTargetHydrationMl={dailyTargetHydrationMl}
            unitSystem={unitSystem}
            summariesByKey={summariesByKey}
            batchLoading={weekBatchLoading}
          />

          <div className="my-2 h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent" />
          
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Primary Metrics & Action Column */}
            <div className="lg:col-span-8 space-y-8">
              <DaySummaryCard
                dateKey={selectedDateKey}
                dailyTargetKcal={dailyTargetKcal}
                dailyTargetProteinG={dailyTargetProteinG}
                loading={weekBatchLoading}
                batchError={weekBatchError}
                summary={summariesByKey[selectedDateKey]}
              />

              <HydrationCard
                dateKey={selectedDateKey}
                unitSystem={unitSystem}
                key={`hydration-${selectedDateKey}`}
              />

              {/* Injected Log Meal Section for Balance */}
              <motion.div 
                layout
                className="overflow-hidden rounded-[2rem] border border-black/[0.08] bg-white/90 p-1 shadow-[0_24px_70px_-42px_rgba(23,20,18,0.55)]"
              >
                <div className="p-4 sm:p-6 lg:p-8">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eaf7df] text-[#4f9d45]">
                        <Plus className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="font-mono text-xl font-black tracking-tight text-[#171412]">Log Meal</h2>
                        <p className="text-xs font-semibold text-zinc-500">
                          Free text or Build (rows)
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 rounded-2xl bg-[#f2eadb] p-1">
                      <button
                        onClick={() => switchInputMode("free")}
                        className={`focus-ring tap-target flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors duration-200 ${
                          logInputMode === "free" ? "bg-[#171412] text-white shadow-xl" : "text-zinc-500 hover:text-[#171412]"
                        }`}
                      >
                        <Keyboard className="h-3.5 w-3.5" />
                        Free
                      </button>
                      <button
                        onClick={() => switchInputMode("composer")}
                        className={`focus-ring tap-target flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors duration-200 ${
                          logInputMode === "composer" ? "bg-[#171412] text-white shadow-xl" : "text-zinc-500 hover:text-[#171412]"
                        }`}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Build
                      </button>
                    </div>
                  </div>

                  <form onSubmit={onSubmit} className="flex flex-col gap-6">
                    <div className="relative">
                      {logInputMode === "free" ? (
                        <div className="relative">
                          <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={(e) =>
                              onFreeTextChange(
                                e.target.value,
                                e.target.selectionStart ?? e.target.value.length,
                              )
                            }
                            onFocus={() =>
                              {
                                const el = textareaRef.current;
                                const caret = el?.selectionStart ?? text.length;
                                updateFreeTextSuggestionAnchor(caret);
                                setShowFreeTextSuggestions(
                                  freeTextQuery.trim().length >= 2,
                                );
                              }
                            }
                            onClick={(e) =>
                              updateFreeTextSuggestionAnchor(
                                e.currentTarget.selectionStart ??
                                  e.currentTarget.value.length,
                              )
                            }
                            onKeyUp={(e) =>
                              updateFreeTextSuggestionAnchor(
                                e.currentTarget.selectionStart ??
                                  e.currentTarget.value.length,
                              )
                            }
                            onBlur={() => {
                              setTimeout(() => setShowFreeTextSuggestions(false), 120);
                            }}
                            rows={4}
                            placeholder="Describe your meal... e.g., '2 eggs with spinach and a piece of toast'"
                            className={`w-full resize-none rounded-3xl border border-black/10 bg-[#fffdf7] px-6 py-5 text-lg leading-relaxed text-[#171412] placeholder:text-zinc-400 focus:border-[#4f9d45]/60 focus:outline-none focus:ring-4 focus:ring-[#4f9d45]/15 ${derivedSelectedHints.length > 0 ? "md:pr-52" : ""}`}
                          />
                          {derivedSelectedHints.length > 0 ? (
                            <div className="pointer-events-none absolute right-3 top-3 hidden max-w-[10.5rem] flex-col gap-1.5 md:flex">
                              {derivedSelectedHints.slice(0, 5).map((row) => (
                                  <div
                                    key={`side-${row.key}`}
                                    className="truncate rounded-xl border border-[#4f9d45]/20 bg-[#eaf7df] px-2.5 py-1 text-right text-[10px] font-bold text-[#356d30]"
                                  >
                                    {row.grams != null && row.kcal != null
                                      ? `${Math.round(row.grams)}g • ${Math.round(row.kcal)} kcal`
                                      : "Add grams (e.g. 80g)"}
                                  </div>
                                ))}
                            </div>
                          ) : null}
                          {showFreeTextSuggestions &&
                          freeTextSuggestions.length > 0 ? (
                            <ul
                              className="absolute z-40 max-h-56 w-[min(18rem,calc(100%-1.5rem))] overflow-auto rounded-xl border border-black/10 bg-white p-1 shadow-[0_20px_40px_-24px_rgba(23,20,18,0.5)]"
                              style={{
                                left: `${freeTextSuggestionAnchor.left}px`,
                                top: `${freeTextSuggestionAnchor.top}px`,
                              }}
                            >
                              {freeTextSuggestions
                                .filter(
                                  (item): item is UsdaSuggestionItem =>
                                    !!item &&
                                    typeof item.label === "string" &&
                                    item.label.length > 0,
                                )
                                .map((item, index) => (
                                <li key={`free-${item.fdcId}-${item.label}-${index}`}>
                                  <button
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      applyFreeTextSuggestion(item.label);
                                    }}
                                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-800 transition-colors hover:bg-[#f7f3e9]"
                                  >
                                    <span className="flex items-center justify-between gap-3">
                                      <span className="truncate">{item.label}</span>
                                      {item.kcalPer100g != null ? (
                                        <span className="shrink-0 text-[11px] font-bold text-[#4f9d45]">
                                          {Math.round(item.kcalPer100g)} kcal
                                        </span>
                                      ) : null}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ) : (
                        <MealItemComposer
                          rows={composerRows}
                          onChange={setComposerRows}
                          onSuggestionPicked={rememberSelectedFoodHint}
                          disabled={busy}
                        />
                      )}
                      
                      {/* Visual Feedback Line */}
                      <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-[#4f9d45]/30 to-transparent" />
                    </div>

                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <AnimatePresence>
                          {lastLoggedRaw && (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              type="button"
                              onClick={() => logAgain(lastLoggedRaw)}
                              className="focus-ring tap-target flex items-center gap-2 rounded-2xl bg-[#171412] px-4 py-2 text-xs font-bold text-white transition-colors duration-200 hover:bg-black"
                            >
                              <HistoryIcon className="h-3.5 w-3.5" />
                              Repeat Last
                            </motion.button>
                          )}
                        </AnimatePresence>
                        <button
                          type="button"
                          onClick={() => {
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
                          className="focus-ring tap-target flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-xs font-bold text-zinc-600 transition-colors duration-200 hover:border-[#4f9d45]/30 hover:bg-[#f2f8ec] hover:text-[#171412]"
                        >
                          <ScanLine className="h-3.5 w-3.5" />
                          Barcode
                        </button>
                        
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          type="submit"
                          disabled={loading || !effectiveMealRaw.trim()}
                          className="btn-primary min-w-[160px]"
                        >
                          {loading ? (
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 animate-pulse" />
                              Analyzing...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <ChevronRight className="h-4 w-4" />
                              Log Meal
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                    </div>
                    {showBarcodePanel ? (
                      <div className="rounded-2xl border border-black/10 bg-[#fffdf7] p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-zinc-600">
                            Barcode scanner
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              stopBarcodeScanner();
                              setShowBarcodePanel(false);
                            }}
                            className="focus-ring rounded-full p-1.5 text-zinc-500 hover:bg-black/5 hover:text-[#171412]"
                            aria-label="Close barcode panel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={barcodeValue}
                            onChange={(e) => setBarcodeValue(e.target.value)}
                            placeholder="Enter barcode digits"
                            className="input-field w-full py-2.5 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => void lookupBarcode(barcodeValue)}
                            disabled={barcodeBusy || barcodeValue.trim().length < 6}
                            className="focus-ring tap-target rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-[#f2f8ec] disabled:opacity-40"
                          >
                            {barcodeBusy ? "Looking up..." : "Use barcode"}
                          </button>
                          {isMobileDevice ? (
                            <button
                              type="button"
                              onClick={() =>
                                barcodeScanning
                                  ? stopBarcodeScanner()
                                  : void startBarcodeScanner()
                              }
                              className="focus-ring tap-target inline-flex items-center gap-1 rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-[#f2f8ec]"
                            >
                              <Camera className="h-3.5 w-3.5" />
                              {barcodeScanning ? "Stop camera" : "Scan with camera"}
                            </button>
                          ) : null}
                        </div>

                        {isMobileDevice ? (
                          <div className="relative mt-3 overflow-hidden rounded-xl border border-black/10 bg-black">
                            <video
                              ref={barcodeVideoRef}
                              className="h-44 w-full object-cover"
                              playsInline
                              muted
                            />
                            {!barcodeScanning ? (
                              <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white/80">
                                Preparing camera...
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {barcodeError ? (
                          <p className="mt-2 text-xs font-semibold text-red-600">
                            {barcodeError}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </form>
                </div>
              </motion.div>

              {/* Inline Analysis Results */}
              <AnimatePresence mode="wait">
                {result && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/90 p-4 shadow-[0_24px_70px_-42px_rgba(23,20,18,0.55)] sm:p-6 lg:p-8">
                      <div className="mb-6 flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4f9d45] text-white shadow-[0_14px_30px_-18px_rgba(79,157,69,0.85)]">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.28em] text-[#356d30]">
                              AI meal receipt
                            </p>
                            <h3 className="font-mono text-2xl font-black tracking-tight text-[#171412]">Latest Analysis</h3>
                            <p className="mt-1 text-xs font-medium text-zinc-600">Estimated from your last log.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setResult(null)}
                          className="focus-ring tap-target rounded-full bg-white/70 p-2 text-zinc-500 transition-colors hover:bg-white hover:text-[#171412]"
                          title="Clear result"
                        >
                          <Plus className="h-5 w-5 rotate-45" />
                        </button>
                      </div>

                      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-[1.5rem] border border-black/10 bg-[#fffdf7] p-4">
                          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Calories</p>
                          <p className="mt-2 font-mono text-4xl font-black leading-none text-[#171412]">{Math.round(result.totals.kcal)}<span className="ml-1 text-xs font-black uppercase text-zinc-500">kcal</span></p>
                        </div>
                        <div className="rounded-[1.5rem] border border-[#4f9d45]/20 bg-[#eaf7df] p-4">
                          <p className="text-[10px] font-black uppercase tracking-wider text-[#356d30]">Protein</p>
                          <p className="mt-2 font-mono text-3xl font-black text-[#171412]">{result.totals.protein_g}<span className="ml-1 text-xs font-black text-[#356d30]">g</span></p>
                        </div>
                        <div className="rounded-[1.5rem] border border-sky-500/20 bg-[#dff1ff] p-4">
                          <p className="text-[10px] font-black uppercase tracking-wider text-sky-900/70">Carbs</p>
                          <p className="mt-2 font-mono text-3xl font-black text-[#171412]">{result.totals.carbs_g}<span className="ml-1 text-xs font-black text-sky-800">g</span></p>
                        </div>
                        <div className="rounded-[1.5rem] border border-black/10 bg-[#f7f3e9] p-4">
                          <p className="text-[10px] font-black uppercase tracking-wider text-[#6d6251]">Fat</p>
                          <p className="mt-2 font-mono text-3xl font-black text-[#171412]">{result.totals.fat_g}<span className="ml-1 text-xs font-black text-[#6d6251]">g</span></p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.45fr_0.85fr]">
                        <div>
                          <p className="mb-4 px-1 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Ingredient lines</p>
                          <div className="space-y-3">
                            {result.lines.map((line, i) => (
                              <div
                                key={i}
                                className="rounded-2xl border border-black/10 bg-white/70 p-4 transition-colors hover:bg-white"
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-black text-[#171412]">
                                      {line.label}
                                    </p>
                                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                                      {line.quantity} {line.unit}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1.5 self-start rounded-full bg-[#eaf7df] px-2 py-1 text-[#356d30] sm:self-center">
                                    <div className="h-1.5 w-1.5 rounded-full bg-[#4f9d45]" />
                                    <p className="text-[9px] font-black uppercase tracking-widest">
                                      {line.source}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                  <div className="rounded-xl bg-[#f7f3e9] px-3 py-2">
                                    <p className="text-[9px] font-black uppercase tracking-wide text-zinc-500">
                                      kcal
                                    </p>
                                    <p className="font-mono text-sm font-black text-[#171412]">
                                      {formatLineNutrient(line.kcal)}
                                    </p>
                                  </div>
                                  <div className="rounded-xl bg-[#eaf7df] px-3 py-2">
                                    <p className="text-[9px] font-black uppercase tracking-wide text-[#356d30]/75">
                                      protein
                                    </p>
                                    <p className="font-mono text-sm font-black text-[#171412]">
                                      {formatLineNutrient(line.protein_g)}
                                      <span className="text-[10px] font-semibold text-[#356d30]">
                                        g
                                      </span>
                                    </p>
                                  </div>
                                  <div className="rounded-xl bg-[#dff1ff] px-3 py-2">
                                    <p className="text-[9px] font-black uppercase tracking-wide text-sky-900/65">
                                      carbs
                                    </p>
                                    <p className="font-mono text-sm font-black text-[#171412]">
                                      {formatLineNutrient(line.carbs_g)}
                                      <span className="text-[10px] font-semibold text-sky-800">
                                        g
                                      </span>
                                    </p>
                                  </div>
                                  <div className="rounded-xl bg-[#f7f3e9] px-3 py-2">
                                    <p className="text-[9px] font-black uppercase tracking-wide text-[#6d6251]">
                                      fat
                                    </p>
                                    <p className="font-mono text-sm font-black text-[#171412]">
                                      {formatLineNutrient(line.fat_g)}
                                      <span className="text-[10px] font-semibold text-[#6d6251]">
                                        g
                                      </span>
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-black/10 pt-3">
                                  <div>
                                    <p className="text-[9px] font-black uppercase text-zinc-500">
                                      fiber
                                    </p>
                                    <p className="font-mono text-xs font-black text-[#356d30]">
                                      {line.fiber_g != null
                                        ? `${formatLineNutrient(line.fiber_g)}`
                                        : "—"}
                                      {line.fiber_g != null ? (
                                        <span className="text-[10px] text-zinc-500">g</span>
                                      ) : null}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black uppercase text-zinc-500">
                                      sodium
                                    </p>
                                    <p className="font-mono text-xs font-black text-[#171412]">
                                      {line.sodium_mg != null && line.sodium_mg > 0
                                        ? `${Math.round(line.sodium_mg)} mg`
                                        : "—"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black uppercase text-zinc-500">
                                      sugar
                                    </p>
                                    <p className="font-mono text-xs font-black text-zinc-600">
                                      {line.sugar_g != null
                                        ? `${formatLineNutrient(line.sugar_g)}`
                                        : "—"}
                                      {line.sugar_g != null ? (
                                        <span className="text-[10px] text-zinc-500">g</span>
                                      ) : null}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="mb-4 px-1 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Extra nutrients</p>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between rounded-2xl border border-[#4f9d45]/15 bg-white/65 p-4">
                              <span className="text-xs font-black text-zinc-600">Fiber</span>
                              <p className="font-mono text-sm font-black text-[#356d30]">{result.totals.fiber_g ?? 0}<span className="ml-0.5 text-[10px] font-bold">g</span></p>
                            </div>
                            <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/65 p-4">
                              <span className="text-xs font-black text-zinc-600">Sodium</span>
                              <p className="font-mono text-sm font-black text-[#171412]">{Math.round(result.totals.sodium_mg ?? 0)}<span className="ml-0.5 text-[10px] font-bold uppercase">mg</span></p>
                            </div>
                            <div className="flex items-start justify-between gap-3 rounded-2xl border border-amber-500/20 bg-white/65 p-4">
                              <span className="text-xs font-black text-zinc-600">Sugars</span>
                              <div className="text-right">
                                <p className="font-mono text-sm font-black text-[#171412]">
                                  {result.totals.sugar_g ?? 0}
                                  <span className="ml-0.5 text-[10px] font-bold text-zinc-500">g total</span>
                                </p>
                                {result.totals.added_sugar_g != null ? (
                                  <p className="mt-0.5 text-[10px] font-bold text-[#6d6251]">
                                    ~{Math.round(result.totals.added_sugar_g)} g added
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          
                          {result.assumptions && result.assumptions.length > 0 && (
                            <div className="mt-6 rounded-2xl border border-black/10 bg-[#f7f3e9] p-4">
                              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#6d6251]">Analysis Assumptions</p>
                              <ul className="space-y-1.5 [&_li]:font-medium [&_li]:text-[#6d6251]">
                                {result.assumptions.map((a, i) => (
                                  <li key={i} className="text-[10px] leading-relaxed text-amber-200/50">• {a}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="lg:col-span-4 space-y-6">
              <WeightLogCard
                unitSystem={unitSystem}
                weightTrendOnHomeEnabled={weightTrendOnHomeEnabled}
                key={`weight-${todayKey}`}
              />
              <AdaptiveTargetCard key={`adaptive-${todayKey}`} />
              <WeekInsightsCard
                dailyTargetKcal={dailyTargetKcal}
                dailyTargetProteinG={dailyTargetProteinG}
                weeklyCoachingFocus={weeklyCoachingFocus}
                weeklyImplementationIntention={weeklyImplementationIntention}
                loading={weekBatchLoading}
                batchError={weekBatchError}
                data={weekInsightData}
              />
            </div>
          </div>
        </div>
      </motion.header>


      {/* Analysis Error / Queue Alerts */}
      <AnimatePresence>
        {analyzeQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-8 flex items-center justify-between rounded-3xl border border-sky-500/20 bg-sky-500/10 p-4 text-sky-700"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="text-sm font-bold">{analyzeQueue.length} meal{analyzeQueue.length > 1 ? 's' : ''} queued offline</p>
                <p className="text-xs opacity-70">Will sync automatically when connection restores.</p>
              </div>
            </div>
            <button 
              onClick={() => void flushAnalyzeQueue()}
              className="text-xs font-bold underline decoration-blue-500/20 underline-offset-4"
            >
              Sync Now
            </button>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="mb-8 flex items-center gap-3 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-red-600"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-12 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
        Engineered for precision • v1.0
      </p>
    </div>
  );
}
