"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { stashMealLogPrefill } from "@/lib/meals/log-prefill";
import { notifyMealsChanged } from "@/lib/meals-sync";
import { useOnline } from "@/lib/meals/use-online";
import {
  composerRowsToRawInput,
  newComposerRow,
  seedComposerRowsFromRawInput,
  type ComposerRow,
} from "@/lib/meals/meal-composer";
import { MealItemComposer } from "./meal-item-composer";
import { formatLocaleTime12h } from "@/lib/datetime/format-locale-time-12h";
import {
  dayHeadingLabel,
  formatLocalYmd,
  localDayBoundsIsoFromYmd,
} from "@/lib/meals/local-date";
import {
  Search,
  Download,
  Trash2,
  Edit3,
  AlertCircle,
  Clock,
  ChevronDown,
  Plus,
  Filter,
  Keyboard,
  LayoutGrid,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type HistoryMealRow = {
  id: string;
  rawInput: string;
  totalKcal: number;
  createdAt: string;
};

export function HistoryMealList({
  meals,
  initialHasMore,
}: {
  meals: HistoryMealRow[];
  initialHasMore: boolean;
}) {
  const router = useRouter();
  const online = useOnline();
  const offline = !online;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [historyEditMode, setHistoryEditMode] = useState<"free" | "composer">(
    "free",
  );
  const [historyComposerRows, setHistoryComposerRows] = useState<ComposerRow[]>(
    () => [newComposerRow(), newComposerRow()],
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [remoteRows, setRemoteRows] = useState<HistoryMealRow[] | null>(null);
  const [remoteHasMore, setRemoteHasMore] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportFromYmd, setExportFromYmd] = useState("");
  const [exportToYmd, setExportToYmd] = useState("");
  const [extraMeals, setExtraMeals] = useState<HistoryMealRow[]>([]);
  const [moreAfterExtra, setMoreAfterExtra] = useState(initialHasMore);
  const [loadMoreBusy, setLoadMoreBusy] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const mealIdsFingerprint = useMemo(
    () => meals.map((m) => m.id).join(","),
    [meals],
  );

  useEffect(() => {
    setExtraMeals([]);
    setMoreAfterExtra(initialHasMore);
    setLoadMoreError(null);
    setRemoteRows(null);
    setRemoteHasMore(false);
  }, [mealIdsFingerprint, initialHasMore]);

  const displayMeals = useMemo(
    () => (remoteRows ?? [...meals, ...extraMeals]),
    [meals, extraMeals, remoteRows],
  );

  const filteredMeals = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return displayMeals;
    return displayMeals.filter((m) =>
      m.rawInput.toLowerCase().includes(q),
    );
  }, [displayMeals, search]);

  /** Newest day first; meals stay newest-first within each day (matches API order). */
  const mealsByDay = useMemo(() => {
    const groups: { dateKey: string; meals: HistoryMealRow[] }[] = [];
    for (const m of filteredMeals) {
      const dateKey = formatLocalYmd(new Date(m.createdAt));
      const last = groups[groups.length - 1];
      if (last?.dateKey === dateKey) {
        last.meals.push(m);
      } else {
        groups.push({ dateKey, meals: [m] });
      }
    }
    return groups;
  }, [filteredMeals]);

  function buildHistoryQuery(offset: number) {
    const p = new URLSearchParams();
    p.set("offset", String(offset));
    const q = search.trim();
    if (q) p.set("q", q);
    if (exportFromYmd && exportToYmd) {
      const { fromIso } = localDayBoundsIsoFromYmd(exportFromYmd);
      const { toIso } = localDayBoundsIsoFromYmd(exportToYmd);
      p.set("from", fromIso);
      p.set("to", toIso);
    }
    return p;
  }

  async function applyServerFilters() {
    if (offline) return;
    setLoadMoreBusy(true);
    setLoadMoreError(null);
    setError(null);
    try {
      if (exportFromYmd && exportToYmd && exportFromYmd > exportToYmd) {
        setError("End date must be on or after the start date.");
        return;
      }
      const p = buildHistoryQuery(0);
      const res = await fetch(`/api/meals/history?${p}`, {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        meals?: {
          id: string;
          rawInput: string;
          totalKcal: number;
          createdAt: string;
        }[];
        hasMore?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setLoadMoreError(
          typeof data.error === "string" ? data.error : "Could not filter",
        );
        return;
      }
      if (!Array.isArray(data.meals)) {
        setLoadMoreError("Unexpected response");
        return;
      }
      setRemoteRows(
        data.meals.map((m) => ({
          id: m.id,
          rawInput: m.rawInput,
          totalKcal: m.totalKcal,
          createdAt: m.createdAt,
        })),
      );
      setRemoteHasMore(Boolean(data.hasMore));
    } catch {
      setLoadMoreError("Network error");
    } finally {
      setLoadMoreBusy(false);
    }
  }

  function clearServerFilters() {
    setRemoteRows(null);
    setRemoteHasMore(false);
    setSearch("");
    setExportFromYmd("");
    setExportToYmd("");
    setLoadMoreError(null);
  }

  function logAgain(rawInput: string) {
    stashMealLogPrefill(rawInput);
    router.push("/");
  }

  function startEdit(m: HistoryMealRow) {
    setEditingId(m.id);
    setDraft(m.rawInput);
    setHistoryEditMode("free");
    setHistoryComposerRows(seedComposerRowsFromRawInput(m.rawInput));
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft("");
    setHistoryEditMode("free");
    setHistoryComposerRows([newComposerRow(), newComposerRow()]);
    setError(null);
  }

  function switchHistoryEditMode(next: "free" | "composer") {
    if (next === historyEditMode) return;
    if (next === "free") {
      const merged = composerRowsToRawInput(historyComposerRows).trim();
      if (merged) setDraft(merged);
    } else {
      const merged = draft.trim();
      setHistoryComposerRows(seedComposerRowsFromRawInput(merged));
    }
    setHistoryEditMode(next);
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this meal? This cannot be undone.")) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/meals/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(typeof d.error === "string" ? d.error : "Delete failed");
        return;
      }
      if (editingId === id) cancelEdit();
      notifyMealsChanged();
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function onLoadMoreMeals() {
    if (offline || loadMoreBusy) return;
    setLoadMoreBusy(true);
    setLoadMoreError(null);
    try {
      if (remoteRows != null) {
        const offset = remoteRows.length;
        const res = await fetch(
          `/api/meals/history?${buildHistoryQuery(offset)}`,
          { credentials: "same-origin" },
        );
        const data = (await res.json().catch(() => ({}))) as {
          meals?: {
            id: string;
            rawInput: string;
            totalKcal: number;
            createdAt: string;
          }[];
          hasMore?: boolean;
          error?: string;
        };
        if (!res.ok) {
          setLoadMoreError(
            typeof data.error === "string" ? data.error : "Could not load meals",
          );
          return;
        }
        if (!Array.isArray(data.meals)) {
          setLoadMoreError("Unexpected response");
          return;
        }
        const mapped = data.meals.map((m) => ({
          id: m.id,
          rawInput: m.rawInput,
          totalKcal: m.totalKcal,
          createdAt: m.createdAt,
        }));
        setRemoteRows((prev) => [...(prev ?? []), ...mapped]);
        setRemoteHasMore(Boolean(data.hasMore));
        return;
      }

      const offset = meals.length + extraMeals.length;
      const res = await fetch(`/api/meals/history?offset=${offset}`, {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        meals?: {
          id: string;
          rawInput: string;
          totalKcal: number;
          createdAt: string;
        }[];
        hasMore?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setLoadMoreError(
          typeof data.error === "string" ? data.error : "Could not load meals",
        );
        return;
      }
      if (!Array.isArray(data.meals)) {
        setLoadMoreError("Unexpected response");
        return;
      }
      const batch = data.meals.map((m) => ({
        id: m.id,
        rawInput: m.rawInput,
        totalKcal: m.totalKcal,
        createdAt: m.createdAt,
      }));
      setExtraMeals((prev) => [...prev, ...batch]);
      setMoreAfterExtra(Boolean(data.hasMore));
    } catch {
      setLoadMoreError("Network error");
    } finally {
      setLoadMoreBusy(false);
    }
  }

  async function onExportCsv() {
    if (offline) return;
    setExportBusy(true);
    setExportError(null);
    try {
      const f = exportFromYmd.trim();
      const t = exportToYmd.trim();
      let exportPath = "/api/meals/export";
      if (f || t) {
        if (!f || !t) {
          setExportError("Choose both start and end dates.");
          setExportBusy(false);
          return;
        }
        if (f > t) {
          setExportError("End date must be on or after the start date.");
          setExportBusy(false);
          return;
        }
        const { fromIso } = localDayBoundsIsoFromYmd(f);
        const { toIso } = localDayBoundsIsoFromYmd(t);
        exportPath = `/api/meals/export?${new URLSearchParams({ from: fromIso, to: toIso })}`;
      }

      const res = await fetch(exportPath, { credentials: "same-origin" });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setExportError(d.error ?? "Export failed");
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      const match = /filename="([^"]+)"/.exec(cd ?? "");
      const filename = match?.[1] ?? "calorie-meals.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Network error");
    } finally {
      setExportBusy(false);
    }
  }

  async function onSaveRecalculate(id: string) {
    const text =
      historyEditMode === "composer"
        ? composerRowsToRawInput(historyComposerRows).trim()
        : draft.trim();
    if (!text) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/meals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput: text }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Update failed");
        return;
      }
      cancelEdit();
      notifyMealsChanged();
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  const showLoadMore = remoteRows != null ? remoteHasMore : moreAfterExtra;

  return (
    <div className="flex flex-col gap-6">
      {/* Search and Action Bar */}
      <section className="bg-zinc-950/50 rounded-3xl p-6 border border-white/[0.05] glass-pane">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex min-w-0 flex-1 items-stretch rounded-2xl border border-white/5 bg-zinc-950 shadow-lg transition-all hover:bg-white/5 focus-within:border-emerald-500/50 focus-within:ring-4 focus-within:ring-emerald-500/10">
            <span
              className="flex shrink-0 items-center justify-center pl-4 pr-2 text-zinc-500"
              aria-hidden
            >
              <Search className="h-5 w-5 shrink-0" />
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search meal text…"
              className="min-w-0 flex-1 border-0 bg-transparent py-3 pr-4 text-white outline-none placeholder:text-zinc-500"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void applyServerFilters()}
              disabled={offline || loadMoreBusy}
              className="focus-ring tap-target flex items-center gap-2 rounded-2xl bg-emerald-600/90 px-5 py-4 text-sm font-bold text-zinc-950 transition-colors duration-200 hover:bg-emerald-500 disabled:opacity-30"
            >
              <Filter className="h-4 w-4" />
              {loadMoreBusy ? "…" : "Apply filters"}
            </button>
            <button
              type="button"
              onClick={clearServerFilters}
              disabled={offline}
              className="focus-ring tap-target rounded-2xl border border-white/10 px-4 py-4 text-xs font-bold text-zinc-500 transition-colors hover:text-white disabled:opacity-30"
            >
              Clear
            </button>
          <button
              onClick={() => void onExportCsv()}
              disabled={offline || exportBusy}
              className="focus-ring tap-target flex items-center gap-2 rounded-2xl bg-zinc-800 px-6 py-4 text-sm font-bold text-white transition-colors duration-200 hover:bg-zinc-700 disabled:opacity-30"
            >
              <Download className="h-4 w-4" />
              {exportBusy ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>

        {/* Date Filter Strip */}
        <div className="mt-6 pt-6 border-t border-white/[0.05] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Start Date</span>
             <input
              type="date"
              value={exportFromYmd}
              onChange={(e) => setExportFromYmd(e.target.value)}
              className="form-field-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">End Date</span>
             <input
              type="date"
              value={exportToYmd}
              onChange={(e) => setExportToYmd(e.target.value)}
              className="form-field-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setExportFromYmd("");
                setExportToYmd("");
              }}
              className="focus-ring tap-target h-11 rounded-xl px-4 text-xs font-bold text-zinc-500 transition-colors duration-200 hover:text-white"
            >
              Reset dates
            </button>
          </div>
        </div>
        <p className="mt-4 text-[10px] font-medium leading-relaxed text-zinc-600">
          Apply filters runs a server query (date range and search text). Quick
          search above also narrows the current list on the client.
        </p>
      </section>

      {/* Alerts */}
      <AnimatePresence>
        {offline && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 flex items-center gap-3 text-amber-500">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-xs font-bold leading-relaxed">
              You are offline. Filters, export, and editing saved meals need a
              connection.
            </p>
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 flex items-center gap-3 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <p className="text-xs font-bold">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meals by day */}
      {mealsByDay.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-zinc-950/30 px-6 py-12 text-center text-sm text-zinc-500">
          No meals in this view. Try clearing filters or search.
        </p>
      ) : (
      <div className="flex flex-col gap-10">
        {mealsByDay.map((group) => (
          <section key={group.dateKey} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-white/[0.06] pb-2">
              <h2 className="text-sm font-bold tracking-tight text-white sm:text-base">
                {dayHeadingLabel(group.dateKey)}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                {group.meals.length === 1
                  ? "1 meal"
                  : `${group.meals.length} meals`}{" "}
                <span className="font-mono text-zinc-500">·</span>{" "}
                <span className="tabular-nums text-zinc-500">
                  {Math.round(
                    group.meals.reduce((s, x) => s + x.totalKcal, 0),
                  )}{" "}
                  kcal
                </span>
              </p>
            </div>
            <ul className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {group.meals.map((m) => {
                  const isEditing = editingId === m.id;
                  const busy = busyId === m.id;

                  return (
                    <motion.li
                      key={m.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group relative rounded-3xl border border-white/[0.05] bg-zinc-900/50 p-6 transition-[color,background-color,border-color] duration-200 hover:border-white/[0.1] hover:bg-zinc-900/80"
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="min-w-0 flex-1">
                          <div className="mb-3 flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-950 text-zinc-500">
                              <Clock className="h-4 w-4" />
                            </div>
                            <time
                              dateTime={m.createdAt}
                              className="text-[10px] font-black uppercase tracking-widest text-zinc-500"
                            >
                              {isMounted
                                ? formatLocaleTime12h(m.createdAt)
                                : "—"}
                            </time>
                          </div>
                    
                    {isEditing ? (
                      <div className="mt-4 flex flex-col gap-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                            Edit as free text or structured rows
                          </p>
                          <div className="flex items-center gap-1 rounded-2xl bg-zinc-950/80 p-1 ring-1 ring-white/[0.06]">
                            <button
                              type="button"
                              onClick={() => switchHistoryEditMode("free")}
                              className={`focus-ring tap-target flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors duration-200 ${
                                historyEditMode === "free"
                                  ? "bg-zinc-800 text-white shadow-lg"
                                  : "text-zinc-500 hover:text-zinc-300"
                              }`}
                            >
                              <Keyboard className="h-3.5 w-3.5" />
                              Free
                            </button>
                            <button
                              type="button"
                              onClick={() => switchHistoryEditMode("composer")}
                              className={`focus-ring tap-target flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors duration-200 ${
                                historyEditMode === "composer"
                                  ? "bg-zinc-800 text-white shadow-lg"
                                  : "text-zinc-500 hover:text-zinc-300"
                              }`}
                            >
                              <LayoutGrid className="h-3.5 w-3.5" />
                              Build
                            </button>
                          </div>
                        </div>
                        {historyEditMode === "free" ? (
                          <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            className="form-field resize-none p-4 text-base leading-relaxed sm:text-sm"
                            rows={4}
                          />
                        ) : (
                          <MealItemComposer
                            rows={historyComposerRows}
                            onChange={setHistoryComposerRows}
                            disabled={busy || offline}
                          />
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onSaveRecalculate(m.id)}
                            disabled={busy || offline}
                            className="focus-ring tap-target rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-zinc-950 transition-colors duration-200 hover:bg-emerald-400 disabled:opacity-50 sm:py-2"
                          >
                            Save & recalculate
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={busy}
                            className="focus-ring tap-target rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-bold text-white transition-colors duration-200 hover:bg-zinc-700 disabled:opacity-50 sm:py-2"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="text-lg font-bold text-white leading-snug">
                          {m.rawInput}
                        </h4>
                      </>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="rounded-2xl bg-emerald-500/10 px-4 py-2 ring-1 ring-emerald-500/20">
                      <p className="text-xl font-black text-emerald-400 tabular-nums">
                        {Math.round(m.totalKcal)}
                        <span className="text-[10px] ml-1 opacity-60">kcal</span>
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => logAgain(m.rawInput)}
                        disabled={busy}
                        className="focus-ring tap-target rounded-xl bg-zinc-950 p-3 text-zinc-500 transition-colors duration-200 hover:text-white disabled:pointer-events-none disabled:opacity-40"
                        title="Log again (prefill on Home)"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(m)}
                        disabled={busy || offline}
                        className="focus-ring tap-target rounded-xl bg-zinc-950 p-3 text-zinc-500 transition-colors duration-200 hover:text-emerald-400 disabled:pointer-events-none disabled:opacity-40"
                        title={offline ? "Editing requires a connection" : "Edit"}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(m.id)}
                        disabled={busy || offline}
                        className="focus-ring tap-target rounded-xl bg-zinc-950 p-3 text-zinc-500 transition-colors duration-200 hover:text-red-400 disabled:pointer-events-none disabled:opacity-40"
                        title={offline ? "Delete requires a connection" : "Delete"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </section>
        ))}
      </div>
      )}

      {/* Load More */}
      {showLoadMore && (
        <div className="flex flex-col items-center gap-4 py-12">
           <button
            onClick={() => void onLoadMoreMeals()}
            className="group focus-ring tap-target flex items-center gap-3 rounded-full border border-white/[0.05] bg-zinc-900 px-8 py-4 text-sm font-bold text-white transition-colors duration-200 hover:bg-zinc-800"
          >
            {loadMoreBusy ? "Loading..." : "Load Older Entries"}
            <ChevronDown className={`h-4 w-4 transition-transform group-hover:translate-y-0.5 ${loadMoreBusy ? 'animate-bounce' : ''}`} />
          </button>
        </div>
      )}
    </div>
  );
}
