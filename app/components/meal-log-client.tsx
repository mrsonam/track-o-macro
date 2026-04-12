"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  /** Daily calorie target from profile (Mifflin–St Jeor + goal), if set */
  dailyTargetKcal?: number | null;
  /** Optional protein goal (g/day) from advanced onboarding / settings */
  dailyTargetProteinG?: number | null;
  /** Epic 1 — for expectation copy on the log screen */
  loggingStyle?: LoggingStyle | null;
  /** Epic 5 — optional week-card tip theme from Settings */
  weeklyCoachingFocus?: WeeklyCoachingFocus | null;
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
  savedMeals = [],
  recentMeals = [],
}: MealLogClientProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
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
          msg = `Server returned HTTP ${res.status} with no response body. If this persists, check the server logs (unhandled errors often produce an empty body).`;
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
      if (mode === "form" && logInputMode === "composer") {
        setComposerRows([newComposerRow(), newComposerRow()]);
      }
      if (mode !== "form") {
        setText("");
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
      setError("Type a short phrase (3+ characters) before saving.");
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
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-12 pt-8 sm:px-6">
      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-800/90">
          Log
        </p>
        {dailyTargetKcal != null || dailyTargetProteinG != null ? (
          <p className="mt-2 flex flex-wrap gap-2">
            {dailyTargetKcal != null ? (
              <span className="inline-flex rounded-full border border-emerald-200/90 bg-emerald-50/90 px-3 py-1 text-xs font-medium text-emerald-950">
                Daily target: ~{Math.round(dailyTargetKcal)} kcal
              </span>
            ) : null}
            {dailyTargetProteinG != null ? (
              <span className="inline-flex rounded-full border border-teal-200/90 bg-teal-50/90 px-3 py-1 text-xs font-medium text-teal-950">
                Protein goal: ~{Math.round(dailyTargetProteinG)} g/day
              </span>
            ) : null}
          </p>
        ) : null}
        <WeekCalorieStrip
          dateKeys={dateKeys}
          selectedDateKey={selectedDateKey}
          onSelectDateKey={setSelectedDateKey}
          dailyTargetKcal={dailyTargetKcal}
          summariesByKey={summariesByKey}
          batchLoading={weekBatchLoading}
        />
        <DaySummaryCard
          dateKey={selectedDateKey}
          dailyTargetKcal={dailyTargetKcal}
          dailyTargetProteinG={dailyTargetProteinG}
          loading={weekBatchLoading}
          batchError={weekBatchError}
          summary={summariesByKey[selectedDateKey]}
        />
        <WeekInsightsCard
          dailyTargetKcal={dailyTargetKcal}
          dailyTargetProteinG={dailyTargetProteinG}
          weeklyCoachingFocus={weeklyCoachingFocus}
          loading={weekBatchLoading}
          batchError={weekBatchError}
          data={weekInsightData}
        />
        <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          What did you eat?
        </h1>
        <p className="mt-3 max-w-xl text-pretty text-sm leading-relaxed text-stone-600">
          Describe it in plain language—amounts help. We match USDA data when
          we can and estimate only when needed.
        </p>
        {loggingStyle ? (
          <p className="mt-2 max-w-xl text-pretty text-xs leading-relaxed text-stone-500">
            {loggingStyleBlurb(loggingStyle)}
          </p>
        ) : null}
        <p className="mt-3 max-w-xl rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs leading-relaxed text-amber-950/90">
          Estimates are not medical advice. Always check packaged foods on the
          label.
        </p>
      </header>

      {analyzeQueue.length > 0 ? (
        <div
          className="mb-6 rounded-xl border border-sky-200/90 bg-sky-50/90 px-4 py-3 text-sm text-sky-950 shadow-sm shadow-sky-900/5"
          role="status"
        >
          <p className="font-medium">
            {analyzeQueue.length} meal{analyzeQueue.length === 1 ? "" : "s"}{" "}
            queued
            {typeof navigator !== "undefined" && !navigator.onLine
              ? " · offline"
              : ""}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-sky-900/85">
            {truncate(analyzeQueue[0]!.rawInput, 140)}
            {analyzeQueue.length > 1
              ? ` · +${analyzeQueue.length - 1} more`
              : ""}
          </p>
          <p className="mt-1 text-[11px] text-sky-800/80">
            Saved in this browser (IndexedDB). Kept after refresh; syncs when
            you&apos;re online.
          </p>
          {typeof navigator !== "undefined" && navigator.onLine ? (
            <button
              type="button"
              disabled={flushBusy}
              onClick={() => void flushAnalyzeQueue()}
              className="mt-2 text-xs font-semibold text-sky-900 underline decoration-sky-800/35 underline-offset-2 hover:decoration-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {flushBusy ? "Sending…" : "Send now"}
            </button>
          ) : null}
        </div>
      ) : null}

      {savedMeals.length > 0 ? (
        <section className="mb-10" aria-labelledby="saved-meals-heading">
          <h2
            id="saved-meals-heading"
            className="text-sm font-semibold text-stone-900"
          >
            Templates & saved meals
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Named templates with your exact meal text—log in one tap. Edit
            updates the name and text.
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {savedMeals.map((s) => {
              const logging = loggingSavedId === s.id;
              const editing = editingSavedId === s.id;

              if (editing) {
                return (
                  <li
                    key={s.id}
                    className="sm:col-span-2 w-full rounded-xl border border-emerald-200/90 bg-white/95 p-4 shadow-sm"
                  >
                    <p className="text-xs font-medium text-stone-600">
                      Edit favorite
                    </p>
                    <label className="mt-2 block text-xs font-medium text-stone-600">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editSavedTitle}
                      onChange={(e) => setEditSavedTitle(e.target.value)}
                      maxLength={100}
                      className="input-field mt-1"
                      disabled={editSavedBusy}
                    />
                    <label className="mt-3 block text-xs font-medium text-stone-600">
                      Meal text (used when you tap Log)
                    </label>
                    <textarea
                      value={editSavedRaw}
                      onChange={(e) => setEditSavedRaw(e.target.value)}
                      rows={4}
                      maxLength={8000}
                      className="input-field mt-1 resize-y text-[15px] leading-relaxed"
                      disabled={editSavedBusy}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={
                          editSavedBusy ||
                          !editSavedTitle.trim() ||
                          !editSavedRaw.trim()
                        }
                        onClick={() => void submitEditSaved(s.id)}
                        className="btn-primary px-4 py-2 text-sm"
                      >
                        {editSavedBusy ? "Saving…" : "Save changes"}
                      </button>
                      <button
                        type="button"
                        disabled={editSavedBusy}
                        onClick={cancelEditSaved}
                        className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </li>
                );
              }

              return (
                <li
                  key={s.id}
                  className="flex min-h-[8.5rem] flex-col rounded-xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50/50 to-white/95 p-4 shadow-sm shadow-emerald-900/5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-emerald-950">
                      {s.title}
                    </p>
                    <p
                      className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-600"
                      title={s.rawInput}
                    >
                      {s.rawInput}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-emerald-200/60 pt-3">
                    <button
                      type="button"
                      disabled={busy && !logging}
                      onClick={() => runAnalyze(s.rawInput, { savedId: s.id })}
                      className="btn-primary min-h-[40px] flex-1 px-4 py-2 text-sm sm:flex-none"
                    >
                      {logging ? "Logging…" : "Log this meal"}
                    </button>
                    <button
                      type="button"
                      disabled={busy && !logging}
                      onClick={() => beginEditSaved(s)}
                      className="rounded-lg border border-emerald-300/80 bg-white px-3 py-2 text-xs font-medium text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy && !logging}
                      onClick={() => removeSaved(s.id)}
                      className="rounded-lg px-2 py-2 text-xs text-stone-500 hover:bg-emerald-100/80 hover:text-stone-800 disabled:opacity-50"
                      aria-label={`Remove ${s.title}`}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {recentMeals.length > 0 ? (
        <section className="mb-10" aria-labelledby="recent-meals-heading">
          <h2
            id="recent-meals-heading"
            className="text-sm font-semibold text-stone-900"
          >
            Recent meals
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Tap Log again to copy text into the box below—edit if needed, then
            calculate.
          </p>
          <ul className="mt-3 space-y-2">
            {recentMeals.map((m) => (
              <li
                key={m.id}
                className="flex flex-col gap-2 rounded-xl border border-stone-200/90 bg-white/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-stone-900">
                    {truncate(m.rawInput, 120)}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    <span className="font-medium tabular-nums text-emerald-800">
                      {Math.round(m.totalKcal)} kcal
                    </span>
                    <span className="text-stone-400"> · </span>
                    <time
                      dateTime={m.createdAt}
                      suppressHydrationWarning
                    >
                      {new Date(m.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => logAgain(m.rawInput)}
                  className="shrink-0 rounded-lg border border-stone-300 bg-stone-50 px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-100"
                >
                  Log again
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label
              htmlFor={
                logInputMode === "free" ? "meal-log-text" : "meal-composer-a11y"
              }
              className="text-sm font-medium text-stone-800"
            >
              Meal
            </label>
            <div
              className="flex rounded-xl border border-stone-200/90 bg-stone-100/80 p-0.5"
              role="group"
              aria-label="Log input mode"
            >
              <button
                type="button"
                disabled={busy}
                onClick={() => switchInputMode("free")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  logInputMode === "free"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Write freely
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => switchInputMode("composer")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  logInputMode === "composer"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Build items
              </button>
            </div>
          </div>
          <p id="meal-composer-a11y" className="sr-only">
            Structured rows for each food item, or switch to Write freely for a
            single text box.
          </p>
          {logInputMode === "composer" ? (
            <p className="text-xs text-stone-500">
              Switching from <span className="font-medium">Write freely</span>{" "}
              does not auto-split your text into rows—use this when you want
              separate amount / unit fields.
            </p>
          ) : null}

          <div className="rounded-xl border border-stone-200/90 bg-stone-50/60 px-3 py-3 sm:px-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
              Quick repeat
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Starters append a new line. &quot;Repeat last&quot; replaces the
              box with your last logged meal.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {lastLoggedRaw ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => logAgain(lastLoggedRaw)}
                  className="rounded-full border border-violet-300/90 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-950 hover:bg-violet-100/90 disabled:opacity-50"
                >
                  Repeat last
                </button>
              ) : null}
              {STARTER_QUICK_PATTERNS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  disabled={busy}
                  onClick={() => appendToMeal(p.text)}
                  title={p.text}
                  className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-50"
                >
                  + {p.label}
                </button>
              ))}
            </div>
            {quickSnippets.length > 0 ? (
              <div className="mt-3 border-t border-stone-200/80 pt-3">
                <p className="text-[11px] font-medium text-stone-500">
                  My phrases (this device)
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {quickSnippets.map((q) => (
                    <li
                      key={q.id}
                      className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-teal-200/90 bg-teal-50/90 pl-2.5 shadow-sm"
                    >
                      <button
                        type="button"
                        disabled={busy}
                        title={q.text}
                        onClick={() => appendToMeal(q.text)}
                        className="min-w-0 py-1.5 pr-0.5 text-left text-xs font-medium text-teal-950 hover:text-teal-900 disabled:opacity-50"
                      >
                        {truncate(q.label, 28)}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removeQuickPhrase(q.id)}
                        className="rounded-full px-2 py-1.5 text-stone-500 hover:bg-teal-100/80 hover:text-stone-800 disabled:opacity-50"
                        aria-label={`Remove phrase ${q.label}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="mt-3">
              <button
                type="button"
                disabled={busy || effectiveMealRaw.length < 3}
                onClick={saveBoxAsQuickPhrase}
                className="text-xs font-medium text-teal-900 underline decoration-teal-800/35 underline-offset-2 hover:decoration-teal-900 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
              >
                Save box as quick phrase
              </button>
            </div>
          </div>

          <div className="mt-2">
            <MealPortionHints />
          </div>

          {logInputMode === "free" ? (
            <textarea
              id="meal-log-text"
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="e.g. 2 scrambled eggs, 1 slice sourdough with 15g butter, black coffee"
              className="input-field resize-y text-[15px] leading-relaxed"
            />
          ) : (
            <MealItemComposer
              rows={composerRows}
              onChange={setComposerRows}
              disabled={busy}
            />
          )}
        </div>
        <button
          type="submit"
          disabled={
            loading ||
            (logInputMode === "free"
              ? !text.trim()
              : !composerHasAnalyzableContent(composerRows))
          }
          className="btn-primary w-full sm:w-auto sm:self-start"
        >
          {loading ? "Analyzing…" : "Calculate calories"}
        </button>
      </form>

      <div className="mt-4">
        {!savePanelOpen ? (
          <button
            type="button"
            disabled={!canSaveFavorite || busy}
            onClick={openSavePanel}
            className="text-sm font-medium text-emerald-800 underline decoration-emerald-800/35 underline-offset-2 hover:decoration-emerald-800 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
          >
            Save as favorite
          </button>
        ) : (
          <div className="rounded-xl border border-stone-200/90 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-medium text-stone-600">
              Name (optional — defaults to a short snippet of the meal text)
            </p>
            <input
              type="text"
              value={favTitle}
              onChange={(e) => setFavTitle(e.target.value)}
              maxLength={100}
              className="input-field mt-2"
              placeholder="e.g. Weekday breakfast"
              disabled={saveBusy}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saveBusy || !canSaveFavorite}
                onClick={() => void submitSaveFavorite()}
                className="btn-primary px-4 py-2 text-sm"
              >
                {saveBusy ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                disabled={saveBusy}
                onClick={() => setSavePanelOpen(false)}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {error ? (
        <div
          className="mt-6 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {result ? (
        <section className="mt-10 overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-[0_20px_50px_-28px_rgba(28,25,23,0.35)]">
          <div className="border-b border-stone-100 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 px-5 py-4">
            {result.meal_label ? (
              <p className="text-sm font-semibold text-stone-900">
                {result.meal_label}
              </p>
            ) : (
              <p className="text-sm font-medium text-stone-700">Breakdown</p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-stone-600">
              When possible we match{" "}
              <span className="font-medium text-stone-800">
                USDA FoodData Central
              </span>
              ; otherwise we show an estimate and how confident the match is.
            </p>
            {result.lines.length > 0 ? (
              <p className="mt-1 text-[11px] text-stone-500">
                USDA:{" "}
                {result.lines.filter((l) => l.source === "fdc").length} · My
                foods:{" "}
                {result.lines.filter((l) => l.source === "custom").length} ·
                Estimates:{" "}
                {result.lines.filter((l) => l.source === "estimate").length}{" "}
                (of {result.lines.length} lines)
              </p>
            ) : null}
          </div>
          <ul className="divide-y divide-stone-100">
            {result.lines.map((line, i) => {
              const usdaHref = resolveUsdaLink(line.detail, line.fdc_id);
              const fdcDesc = fdcDescriptionText(line.detail);
              const confidenceLine = formatSourceConfidence(line.detail);
              const customNote = sourceNoteFromDetail(line.detail);
              const portionNote =
                typeof line.detail.unit_note === "string" &&
                line.detail.unit_note.trim()
                  ? line.detail.unit_note.trim()
                  : null;
              return (
                <li
                  key={`${line.label}-${i}`}
                  className="flex flex-col gap-2 border-l-[3px] border-emerald-500/35 px-5 py-4 pl-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-stone-900">
                      {line.label}
                      <span className="ml-1.5 font-normal text-stone-500">
                        ({line.quantity}
                        {line.unit})
                      </span>
                    </span>
                    <span className="tabular-nums text-base font-semibold text-stone-900">
                      {line.kcal}{" "}
                      <span className="text-sm font-medium text-stone-500">
                        kcal
                      </span>
                    </span>
                  </div>
                  {portionNote ? (
                    <p className="text-[11px] leading-relaxed text-stone-600">
                      <span className="font-medium text-stone-700">
                        Your portion:
                      </span>{" "}
                      {portionNote}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span
                      className={
                        line.source === "fdc"
                          ? "rounded-full bg-emerald-100 px-2.5 py-0.5 font-medium text-emerald-900"
                          : line.source === "custom"
                            ? "rounded-full bg-violet-100 px-2.5 py-0.5 font-medium text-violet-950"
                            : "rounded-full bg-amber-100 px-2.5 py-0.5 font-medium text-amber-950"
                      }
                    >
                      {line.source === "fdc"
                        ? "USDA match"
                        : line.source === "custom"
                          ? "My food"
                          : "Estimate"}
                    </span>
                    {line.fdc_id != null ? (
                      <span className="tabular-nums text-stone-500">
                        FDC #{line.fdc_id}
                      </span>
                    ) : null}
                    {line.source !== "custom" && usdaHref ? (
                      <a
                        href={usdaHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-emerald-800 underline decoration-emerald-800/35 underline-offset-2 hover:decoration-emerald-800"
                      >
                        Open in FoodData Central
                      </a>
                    ) : null}
                  </div>
                  {customNote ? (
                    <p className="text-[11px] leading-relaxed text-violet-900/90">
                      {customNote}
                    </p>
                  ) : null}
                  {fdcDesc ? (
                    <p className="text-xs leading-relaxed text-stone-500">
                      <span className="font-medium text-stone-600">
                        Matched food:
                      </span>{" "}
                      {fdcDesc}
                    </p>
                  ) : null}
                  {confidenceLine ? (
                    <p className="text-[11px] leading-relaxed text-stone-500">
                      {confidenceLine}
                    </p>
                  ) : null}
                  {line.source === "estimate" &&
                  "reasoning" in line.detail &&
                  typeof line.detail.reasoning === "string" ? (
                    <p className="text-xs leading-relaxed text-stone-600">
                      {line.detail.reasoning}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {result.assumptions?.length ? (
            <div className="border-t border-stone-100 bg-stone-50/80 px-5 py-4 text-xs text-stone-700">
              <p className="font-semibold text-stone-800">Assumptions</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {result.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-wrap items-end justify-between gap-4 border-t border-emerald-100/80 bg-gradient-to-br from-emerald-50/90 px-5 py-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-900/80">
                Total
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-emerald-900">
                {result.totals.kcal}
                <span className="ml-1 text-lg font-medium text-emerald-800/80">
                  kcal
                </span>
              </p>
            </div>
            <div className="text-right text-sm text-stone-600">
              <p className="font-medium text-stone-800">Macros</p>
              <p className="mt-1 tabular-nums">
                P {result.totals.protein_g}g · C {result.totals.carbs_g}g · F{" "}
                {result.totals.fat_g}g
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
