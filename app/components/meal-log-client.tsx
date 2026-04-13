"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ResolvedLine } from "@/lib/nutrition/resolve-ingredient";
import {
  formatLocalYmd,
  localDayBoundsIsoFromYmd,
  rolling7DateKeys,
} from "@/lib/meals/local-date";
import type { MealDaySummary } from "@/lib/meals/meal-day-summary";
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
  STARTER_QUICK_PATTERNS,
  addQuickSnippet,
  loadQuickSnippets,
  persistQuickSnippets,
  removeQuickSnippet,
  type QuickSnippet,
} from "@/lib/meals/quick-repeat-snippets";
import {
  fdcDescriptionText,
  formatSourceConfidence,
  resolveUsdaLink,
  sourceNoteFromDetail,
} from "@/lib/nutrition/source-detail";
import { MealItemComposer } from "./meal-item-composer";
import { MealPortionHints } from "./meal-portion-hints";
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
  Star, 
  Plus, 
  Keyboard, 
  ChevronRight, 
  Clock,
  LayoutGrid,
  Zap,
  MoreHorizontal,
  Trash2,
  Edit2,
  AlertCircle,
  Scale
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type UnitSystem } from "@/lib/profile/units";
import { WeightLogCard } from "./weight-log-card";
import { AdaptiveTargetCard } from "./adaptive-target-card";

type LogInputMode = "free" | "composer";

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
  loggingStyle?: LoggingStyle | null;
  weeklyCoachingFocus?: WeeklyCoachingFocus | null;
  unitSystem?: UnitSystem;
  savedMeals?: SavedMealItem[];
  recentMeals?: RecentMealItem[];
};

function truncate(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

function defaultFavoriteTitle(raw: string) {
  const t = raw.trim().replace(/\s+/g, " ");
  if (t.length <= 44) return t;
  return `${t.slice(0, 41).trim()}…`;
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
  loggingStyle = null,
  weeklyCoachingFocus = null,
  unitSystem = "metric",
  savedMeals = [],
  recentMeals = [],
}: MealLogClientProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    formatLocalYmd(new Date()),
  );
  const [lastLoggedRaw, setLastLoggedRaw] = useState<string | null>(null);
  const [savePanelOpen, setSavePanelOpen] = useState(false);
  const [favTitle, setFavTitle] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [editingSavedId, setEditingSavedId] = useState<string | null>(null);
  const [editSavedTitle, setEditSavedTitle] = useState("");
  const [editSavedRaw, setEditSavedRaw] = useState("");
  const [editSavedBusy, setEditSavedBusy] = useState(false);
  const [analyzeQueue, setAnalyzeQueue] = useState<QueuedMeal[]>([]);
  const [flushBusy, setFlushBusy] = useState(false);
  const flushingRef = useRef(false);
  const [quickSnippets, setQuickSnippets] = useState<QuickSnippet[]>([]);
  const [logInputMode, setLogInputMode] = useState<LogInputMode>("free");
  const [composerRows, setComposerRows] = useState<ComposerRow[]>(() => [
    newComposerRow(),
    newComposerRow(),
  ]);

  useEffect(() => {
    setQuickSnippets(loadQuickSnippets());
  }, []);

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

  const dateKeys = rolling7DateKeys();
  const weekKey = dateKeys.join("|");
  const [summariesByKey, setSummariesByKey] = useState<
    Record<string, MealDaySummary | null | undefined>
  >({});
  const [weekBatchLoading, setWeekBatchLoading] = useState(true);
  const [weekBatchError, setWeekBatchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const keys = rolling7DateKeys();
    const ranges = keys.map((k) => {
      const { fromIso, toIso } = localDayBoundsIsoFromYmd(k);
      return { from: fromIso, to: toIso };
    });

    setWeekBatchLoading(true);
    setWeekBatchError(null);
    setSummariesByKey(Object.fromEntries(keys.map((k) => [k, undefined])));

    async function run() {
      try {
        const res = await fetch("/api/meals/summary/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ranges }),
        });
        const json = (await res.json()) as {
          results?: Array<
            | {
                ok: true;
                mealCount: number;
                totals: MealDaySummary["totals"];
              }
            | { ok: false; error?: string }
          >;
          error?: string;
        };
        if (!res.ok) {
          if (!cancelled) {
            setWeekBatchError(json.error ?? "Could not load week data");
            setSummariesByKey(
              Object.fromEntries(keys.map((k) => [k, null])),
            );
          }
          return;
        }
        const next: Record<string, MealDaySummary | null | undefined> = {};
        const results = json.results ?? [];
        keys.forEach((k, i) => {
          const r = results[i];
          if (!r || !("ok" in r) || !r.ok) {
            next[k] = null;
          } else {
            next[k] = { mealCount: r.mealCount, totals: r.totals };
          }
        });
        if (!cancelled) {
          setSummariesByKey(next);
          setWeekBatchError(null);
        }
      } catch {
        if (!cancelled) {
          setWeekBatchError("Network error");
          setSummariesByKey(
            Object.fromEntries(keys.map((k) => [k, null])),
          );
        }
      } finally {
        if (!cancelled) setWeekBatchLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [weekKey, todayKey, syncTick]);

  const weekInsightData = useMemo(() => {
    if (weekBatchLoading || weekBatchError) return null;
    const keys = weekKey.split("|");
    let kcal = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let meals = 0;
    let daysWithLogs = 0;
    for (const k of keys) {
      const s = summariesByKey[k];
      if (!s) continue;
      kcal += s.totals.kcal;
      protein += s.totals.protein_g;
      carbs += s.totals.carbs_g;
      fat += s.totals.fat_g;
      meals += s.mealCount;
      if (s.mealCount > 0) daysWithLogs += 1;
    }
    return {
      mealCount: meals,
      daysInWindow: 7,
      daysWithLogs,
      totals: { kcal, protein_g: protein, carbs_g: carbs, fat_g: fat },
      averages: {
        kcalPerDay: Math.round((kcal / 7) * 10) / 10,
        proteinGPerDay: Math.round((protein / 7) * 10) / 10,
      },
    };
  }, [weekBatchLoading, weekBatchError, summariesByKey, weekKey]);

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
        router.refresh();
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
  }, [router]);

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
    saveBusy ||
    editSavedBusy;

  const effectiveMealRaw = useMemo(() => {
    if (logInputMode === "composer") {
      return composerRowsToRawInput(composerRows).trim();
    }
    return text.trim();
  }, [logInputMode, composerRows, text]);

  const rawForFavorite = effectiveMealRaw || lastLoggedRaw || "";
  const canSaveFavorite = Boolean(rawForFavorite);

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
        body: JSON.stringify({ rawInput: trimmed }),
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
      setResult(data as AnalyzeResponse);
      setLastLoggedRaw(trimmed);
      setTodayKey((k) => k + 1);
      setSelectedDateKey(formatLocalYmd(new Date()));
      
      // Clear inputs on successful log
      if (mode === "form") {
        setText("");
        setComposerRows([newComposerRow(), newComposerRow()]);
      }
      
      router.refresh();
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

  function appendToMeal(fragment: string) {
    const t = fragment.trim();
    if (!t) return;
    setError(null);
    setResult(null);
    if (logInputMode === "composer") {
      const merged = composerRowsToRawInput(composerRows).trim();
      setLogInputMode("free");
      setText(merged ? `${merged}\n${t}` : t);
    } else {
      setText((prev) => {
        const p = prev.trim();
        if (!p) return t;
        return `${p}\n${t}`;
      });
    }
    queueMicrotask(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    });
  }

  function saveBoxAsQuickPhrase() {
    const raw = effectiveMealRaw;
    if (raw.length < 3) {
      setError("Type a short phrase before saving.");
      return;
    }
    setError(null);
    const next = addQuickSnippet(
      quickSnippets,
      defaultFavoriteTitle(raw),
      raw,
    );
    setQuickSnippets(next);
    persistQuickSnippets(next);
  }

  function removeQuickPhrase(id: string) {
    const next = removeQuickSnippet(quickSnippets, id);
    setQuickSnippets(next);
    persistQuickSnippets(next);
  }

  function openSavePanel() {
    setEditingSavedId(null);
    setFavTitle(defaultFavoriteTitle(rawForFavorite));
    setSavePanelOpen(true);
    setError(null);
  }

  function beginEditSaved(s: SavedMealItem) {
    setSavePanelOpen(false);
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
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not update favorite");
        return;
      }
      cancelEditSaved();
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setEditSavedBusy(false);
    }
  }

  async function submitSaveFavorite() {
    if (!rawForFavorite) return;
    setSaveBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/saved-meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInput: rawForFavorite,
          title: favTitle.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save favorite");
        return;
      }
      setSavePanelOpen(false);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaveBusy(false);
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
      router.refresh();
    } catch {
      setError("Network error");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-24 pt-8 sm:px-6">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col gap-6">
          {/* Top Progress Bar for Selected Date */}
          <WeekCalorieStrip
            dateKeys={dateKeys}
            selectedDateKey={selectedDateKey}
            onSelectDateKey={setSelectedDateKey}
            dailyTargetKcal={dailyTargetKcal}
            summariesByKey={summariesByKey}
            batchLoading={weekBatchLoading}
          />

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent my-2" />
          
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

              {/* Injected Log Meal Section for Balance */}
              <motion.div 
                layout
                className="rounded-3xl glass-pane p-1 shadow-2xl overflow-hidden"
              >
                <div className="p-4 sm:p-6 lg:p-8">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                        <Plus className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Log Meal</h2>
                        <p className="text-xs text-zinc-400">Natural language analysis</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 rounded-2xl bg-zinc-950/50 p-1">
                      <button
                        onClick={() => switchInputMode("free")}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                          logInputMode === "free" ? "bg-zinc-800 text-white shadow-xl" : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        <Keyboard className="h-3.5 w-3.5" />
                        Free
                      </button>
                      <button
                        onClick={() => switchInputMode("composer")}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                          logInputMode === "composer" ? "bg-zinc-800 text-white shadow-xl" : "text-zinc-500 hover:text-zinc-300"
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
                        <textarea
                          ref={textareaRef}
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          rows={4}
                          placeholder="Describe your meal... e.g., '2 eggs with spinach and a piece of toast'"
                          className="w-full resize-none rounded-3xl border border-white/5 bg-zinc-950/50 px-6 py-5 text-lg leading-relaxed text-white placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-4 focus:ring-emerald-500/5"
                        />
                      ) : (
                        <MealItemComposer
                          rows={composerRows}
                          onChange={setComposerRows}
                          disabled={busy}
                        />
                      )}
                      
                      {/* Visual Feedback Line */}
                      <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                    </div>

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
                              className="flex items-center gap-2 rounded-2xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 transition-all hover:bg-zinc-700 hover:text-white"
                            >
                              <HistoryIcon className="h-3.5 w-3.5" />
                              Repeat Last
                            </motion.button>
                          )}
                        </AnimatePresence>
                        
                        {STARTER_QUICK_PATTERNS.slice(0, 3).map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => appendToMeal(p.text)}
                            className="rounded-2xl border border-white/5 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
                          >
                            + {p.label}
                          </button>
                        ))}
                        
                        <button
                          type="button"
                          className="h-8 w-8 rounded-full bg-zinc-900/50 flex items-center justify-center text-zinc-600 hover:text-zinc-400 transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          disabled={!canSaveFavorite || busy}
                          onClick={openSavePanel}
                          className="flex items-center gap-2 text-xs font-bold text-emerald-500 hover:text-emerald-400 disabled:opacity-30 disabled:grayscale"
                        >
                          <Star className="h-3.5 w-3.5" />
                          Save Favorite
                        </button>
                        
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
                    <div className="bento-card border border-emerald-500/20 bg-emerald-500/[0.02] p-6 lg:p-8">
                      <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">Latest Analysis</h3>
                            <p className="text-xs text-zinc-500">Nutritional breakdown for your last log</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setResult(null)}
                          className="rounded-full bg-white/5 p-2 text-zinc-400 hover:text-white transition-colors"
                          title="Clear Result"
                        >
                          <Plus className="h-5 w-5 rotate-45" />
                        </button>
                      </div>

                      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div className="rounded-2xl bg-zinc-950/50 p-4 border border-white/5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Calories</p>
                          <p className="mt-1 text-2xl font-black text-white">{result.totals.kcal}<span className="text-xs font-medium ml-1 text-zinc-500">kcal</span></p>
                        </div>
                        <div className="rounded-2xl bg-zinc-950/50 p-4 border border-white/5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Protein</p>
                          <p className="mt-1 text-2xl font-black text-emerald-400">{result.totals.protein_g}<span className="text-xs font-medium ml-1 text-zinc-500">g</span></p>
                        </div>
                        <div className="rounded-2xl bg-zinc-950/50 p-4 border border-white/5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Carbs</p>
                          <p className="mt-1 text-2xl font-black text-white/90">{result.totals.carbs_g}<span className="text-xs font-medium ml-1 text-zinc-500">g</span></p>
                        </div>
                        <div className="rounded-2xl bg-zinc-950/50 p-4 border border-white/5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Fat</p>
                          <p className="mt-1 text-2xl font-black text-zinc-400">{result.totals.fat_g}<span className="text-xs font-medium ml-1 text-zinc-500">g</span></p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-4 px-1">Detailed Breakdown</p>
                          <div className="space-y-3">
                            {result.lines.map((line, i) => (
                              <div key={i} className="flex items-center justify-between rounded-2xl bg-white/5 p-4 border border-white/5 group hover:bg-white/10 transition-colors">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-white mb-0.5">{line.label}</p>
                                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-tighter">{line.quantity} {line.unit}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-black text-white">{line.kcal}<span className="text-[9px] ml-0.5 text-zinc-600">kcal</span></p>
                                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                    <div className="h-1 w-1 rounded-full bg-emerald-500/40" />
                                    <p className="text-[9px] text-emerald-500/60 uppercase font-black tracking-widest">{line.source}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-4 px-1">Secondary Metrics</p>
                          <div className="space-y-3">
                            <div className="rounded-2xl bg-zinc-950/30 p-4 border border-white/5 flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-500">Fiber</span>
                              <p className="text-sm font-black text-emerald-400/80">{result.totals.fiber_g ?? 0}<span className="text-[10px] ml-0.5 font-bold">g</span></p>
                            </div>
                            <div className="rounded-2xl bg-zinc-950/30 p-4 border border-white/5 flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-500">Sodium</span>
                              <p className="text-sm font-black text-zinc-300">{Math.round(result.totals.sodium_mg ?? 0)}<span className="text-[10px] ml-0.5 font-bold uppercase">mg</span></p>
                            </div>
                            <div className="rounded-2xl bg-zinc-950/30 p-4 border border-white/5 flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-500">Sugar</span>
                              <p className="text-sm font-black text-zinc-500">{result.totals.sugar_g ?? 0}<span className="text-[10px] ml-0.5 font-bold">g</span></p>
                            </div>
                          </div>
                          
                          {result.assumptions && result.assumptions.length > 0 && (
                            <div className="mt-6 rounded-2xl bg-amber-500/5 p-4 border border-amber-500/10">
                              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2">Analysis Assumptions</p>
                              <ul className="space-y-1.5">
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
              <WeightLogCard unitSystem={unitSystem} key={`weight-${todayKey}`} />
              <AdaptiveTargetCard key={`adaptive-${todayKey}`} />
              <WeekInsightsCard
                dailyTargetKcal={dailyTargetKcal}
                dailyTargetProteinG={dailyTargetProteinG}
                weeklyCoachingFocus={weeklyCoachingFocus}
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
            className="mb-8 rounded-3xl border border-blue-500/20 bg-blue-500/10 p-4 text-blue-400 flex items-center justify-between"
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
            className="mb-8 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 flex items-center gap-3"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bento Secondary Grid */}
      <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Recent Activity */}
        <div className="bento-card group">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-colors">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white">Recent Activity</h3>
            </div>
            <Link href="/history" className="text-xs font-bold text-zinc-500 hover:text-white transition-colors">View All</Link>
          </div>
          
          <ul className="space-y-4">
            {recentMeals.slice(0, 4).map((m) => (
              <li key={m.id} className="group/item flex items-center justify-between rounded-2xl bg-white/5 p-4 transition-all hover:bg-white/10">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{m.rawInput}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    <span className="font-bold text-emerald-500">{Math.round(m.totalKcal)} kcal</span>
                    <span className="mx-2 opacity-20">|</span>
                    {isMounted ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                  </p>
                </div>
                <button 
                  onClick={() => logAgain(m.rawInput)}
                  className="rounded-xl bg-zinc-800 p-2 text-zinc-400 opacity-0 group-hover/item:opacity-100 hover:text-white transition-all"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </li>
            ))}
            {recentMeals.length === 0 && (
              <p className="py-8 text-center text-xs text-zinc-600">No recent meals. Time to eat something!</p>
            )}
          </ul>
        </div>

        {/* Templates / Favorites */}
        <div className="bento-card group">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400 group-hover:bg-lime-500/10 group-hover:text-lime-400 transition-colors">
                <Star className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-white">Quick Templates</h3>
            </div>
            {savePanelOpen && (
              <div className="text-xs font-bold text-emerald-500 animate-pulse">Save Mode Active</div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {savedMeals.slice(0, 6).map((s) => (
              <li 
                key={s.id}
                className="relative flex flex-col justify-between rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:border-white/10 hover:bg-white/10"
              >
                <div className="mb-4">
                  <p className="text-sm font-bold text-white mb-1">{s.title}</p>
                  <p className="line-clamp-2 text-[10px] text-zinc-500 leading-relaxed">{s.rawInput}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => runAnalyze(s.rawInput, { savedId: s.id })}
                    disabled={busy}
                    className="flex-1 rounded-xl bg-zinc-800 py-2 text-[10px] font-bold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
                  >
                    Log
                  </button>
                  <button 
                    onClick={() => removeSaved(s.id)}
                    className="rounded-xl bg-zinc-950 p-2 text-zinc-600 hover:bg-red-500/20 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </li>
            ))}
            {savedMeals.length === 0 && (
              <div className="col-span-full py-8 text-center">
                <p className="text-xs text-zinc-600">No favorites yet.</p>
                <p className="mt-1 text-[10px] text-zinc-700">Save a meal you eat often to see it here.</p>
              </div>
            )}
          </div>
        </div>
      </section>


      {/* Save Panel Popover */}
      <AnimatePresence>
        {savePanelOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-x-4 bottom-24 z-40 mx-auto w-full max-w-sm"
          >
            <div className="rounded-[2.5rem] bg-zinc-900 p-8 shadow-2xl ring-2 ring-emerald-500/50">
              <h3 className="text-xl font-bold text-white mb-2">Save as Template</h3>
              <p className="text-xs text-zinc-400 mb-6">Give this meal a quick name for future use.</p>
              
              <input
                type="text"
                value={favTitle}
                onChange={(e) => setFavTitle(e.target.value)}
                maxLength={100}
                className="w-full rounded-2xl bg-zinc-950 px-5 py-4 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none mb-6"
                placeholder="e.g., Post-Workout Bowl"
                autoFocus
                disabled={saveBusy}
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => void submitSaveFavorite()}
                  disabled={saveBusy || !canSaveFavorite}
                  className="btn-primary flex-1"
                >
                  {saveBusy ? "Saving..." : "Save Template"}
                </button>
                <button
                  onClick={() => setSavePanelOpen(false)}
                  disabled={saveBusy}
                  className="rounded-2xl bg-zinc-800 px-6 font-bold text-white hover:bg-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-12 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-700">
        Engineered for precision • v1.0
      </p>
    </div>
  );
}
