"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { stashMealLogPrefill } from "@/lib/meals/log-prefill";
import { notifyMealsChanged } from "@/lib/meals-sync";
import { defaultSplitParts } from "@/lib/meals/default-split-parts";
import {
  dequeueHistoryAction,
  enqueueHistoryDuplicate,
  enqueueHistorySplit,
  readHistoryActionQueue,
  HISTORY_ACTION_QUEUE_BROADCAST,
  type QueuedHistoryAction,
} from "@/lib/meals/history-action-queue";
import { registerHistoryActionQueueSync } from "@/lib/meals/register-history-sync";
import { useOnline } from "@/lib/meals/use-online";
import { localDayBoundsIsoFromYmd } from "@/lib/meals/local-date";
import { HISTORY_MEALS_PAGE_SIZE } from "@/lib/meals/history-meals-page";
import { 
  Search, 
  Download, 
  Trash2, 
  Edit3, 
  Copy, 
  Scissors, 
  MoreVertical, 
  AlertCircle,
  Clock,
  ChevronDown,
  X,
  Plus,
  ArrowRight
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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [splittingFor, setSplittingFor] = useState<HistoryMealRow | null>(
    null,
  );
  const [splitPartA, setSplitPartA] = useState("");
  const [splitPartB, setSplitPartB] = useState("");
  const [splitDraft, setSplitDraft] = useState("");
  const splitDraftRef = useRef<HTMLTextAreaElement>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportFromYmd, setExportFromYmd] = useState("");
  const [exportToYmd, setExportToYmd] = useState("");
  const [extraMeals, setExtraMeals] = useState<HistoryMealRow[]>([]);
  const [moreAfterExtra, setMoreAfterExtra] = useState(initialHasMore);
  const [loadMoreBusy, setLoadMoreBusy] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [historyQueue, setHistoryQueue] = useState<QueuedHistoryAction[]>([]);
  const [historyFlushBusy, setHistoryFlushBusy] = useState(false);
  const flushingHistoryRef = useRef(false);

  const loadHistoryQueue = useCallback(async () => {
    setHistoryQueue(await readHistoryActionQueue());
  }, []);

  const flushHistoryActionQueue = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (flushingHistoryRef.current) return;
    flushingHistoryRef.current = true;
    setHistoryFlushBusy(true);

    async function runFlush() {
      let anySuccess = false;
      for (;;) {
        const items = await readHistoryActionQueue();
        if (items.length === 0) break;
        const item = items[0]!;
        try {
          if (item.kind === "duplicate") {
            const res = await fetch("/api/meals/analyze", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ rawInput: item.rawInput }),
            });
            if (res.ok) {
              await dequeueHistoryAction(item.id);
              anySuccess = true;
              setHistoryQueue(await readHistoryActionQueue());
              continue;
            }
            break;
          }
          const res = await fetch(`/api/meals/${item.mealId}/split`, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ partA: item.partA, partB: item.partB }),
          });
          if (res.ok) {
            await dequeueHistoryAction(item.id);
            anySuccess = true;
            setHistoryQueue(await readHistoryActionQueue());
            continue;
          }
          break;
        } catch {
          break;
        }
      }
      setHistoryQueue(await readHistoryActionQueue());
      if (anySuccess) {
        notifyMealsChanged();
        router.refresh();
      }
    }

    try {
      if (typeof navigator !== "undefined" && navigator.locks?.request) {
        await navigator.locks.request("calorie-history-action-flush", () =>
          runFlush(),
        );
      } else {
        await runFlush();
      }
    } finally {
      flushingHistoryRef.current = false;
      setHistoryFlushBusy(false);
    }
  }, [router]);

  useEffect(() => {
    void loadHistoryQueue();
  }, [loadHistoryQueue]);

  useEffect(() => {
    const bc = new BroadcastChannel(HISTORY_ACTION_QUEUE_BROADCAST);
    bc.onmessage = () => void loadHistoryQueue();
    return () => bc.close();
  }, [loadHistoryQueue]);

  useEffect(() => {
    function onOnline() {
      void flushHistoryActionQueue();
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flushHistoryActionQueue]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void flushHistoryActionQueue();
    }
  }, [flushHistoryActionQueue]);

  useEffect(() => {
    function onSwMessage(e: MessageEvent) {
      if (e.data?.type === "FLUSH_HISTORY_ACTION_QUEUE") {
        void flushHistoryActionQueue();
      }
    }
    navigator.serviceWorker?.addEventListener?.("message", onSwMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener?.("message", onSwMessage);
    };
  }, [flushHistoryActionQueue]);

  const mealIdsFingerprint = useMemo(
    () => meals.map((m) => m.id).join(","),
    [meals],
  );

  useEffect(() => {
    setExtraMeals([]);
    setMoreAfterExtra(initialHasMore);
    setLoadMoreError(null);
  }, [mealIdsFingerprint, initialHasMore]);

  const displayMeals = useMemo(
    () => [...meals, ...extraMeals],
    [meals, extraMeals],
  );

  const filteredMeals = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return displayMeals;
    return displayMeals.filter((m) =>
      m.rawInput.toLowerCase().includes(q),
    );
  }, [displayMeals, search]);

  function logAgain(rawInput: string) {
    stashMealLogPrefill(rawInput);
    router.push("/");
  }

  function startEdit(m: HistoryMealRow) {
    setEditingId(m.id);
    setDraft(m.rawInput);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft("");
    setError(null);
  }

  function openSplit(m: HistoryMealRow) {
    const { partA, partB } = defaultSplitParts(m.rawInput);
    setSplittingFor(m);
    setSplitPartA(partA);
    setSplitPartB(partB);
    setSplitDraft(m.rawInput.trim());
    setError(null);
  }

  function closeSplitModal() {
    if (splittingFor && busyId === splittingFor.id) return;
    setSplittingFor(null);
    setSplitPartA("");
    setSplitPartB("");
    setSplitDraft("");
  }

  function splitAtCursor() {
    const el = splitDraftRef.current;
    if (!el) return;
    const full = el.value;
    const pos = Math.min(
      Math.max(0, el.selectionStart ?? 0),
      full.length,
    );
    const a = full.slice(0, pos).trim();
    const b = full.slice(pos).trim();
    if (!a || !b) {
      setError(
        "Place the cursor between two parts so both sides have text, then try again.",
      );
      return;
    }
    setError(null);
    setSplitPartA(a);
    setSplitPartB(b);
    setSplitDraft(`${a}\n\n${b}`);
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
      if (splittingFor?.id === id) {
        setSplittingFor(null);
        setSplitPartA("");
        setSplitPartB("");
        setSplitDraft("");
      }
      notifyMealsChanged();
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function onDuplicate(mealId: string, rawInput: string) {
    setBusyId(mealId);
    setError(null);
    try {
      if (offline) {
        await enqueueHistoryDuplicate(rawInput);
        await registerHistoryActionQueueSync();
        await loadHistoryQueue();
        return;
      }
      const res = await fetch("/api/meals/analyze", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Duplicate failed");
        return;
      }
      notifyMealsChanged();
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function onSplitSubmit() {
    if (!splittingFor) return;
    const id = splittingFor.id;
    const a = splitPartA.trim();
    const b = splitPartB.trim();
    if (!a || !b) {
      setError("Enter two non-empty parts.");
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      if (offline) {
        await enqueueHistorySplit(id, a, b);
        await registerHistoryActionQueueSync();
        await loadHistoryQueue();
        setSplittingFor(null);
        setSplitPartA("");
        setSplitPartB("");
        setSplitDraft("");
        return;
      }
      const res = await fetch(`/api/meals/${id}/split`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partA: a, partB: b }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Split failed");
        return;
      }
      setSplittingFor(null);
      setSplitPartA("");
      setSplitPartB("");
      setSplitDraft("");
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
      const offset = meals.length + extraMeals.length;
      const res = await fetch(`/api/meals/history?offset=${offset}`, {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        meals?: HistoryMealRow[];
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
      const batch = data.meals;
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
    const text = draft.trim();
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

  return (
    <div className="flex flex-col gap-6">
      {/* Search and Action Bar */}
      <section className="bg-zinc-950/50 rounded-3xl p-6 border border-white/[0.05] glass-pane">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search meal history..."
              className="w-full rounded-2xl bg-zinc-950 px-12 py-4 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none border border-white/[0.05]"
            />
          </div>
          
          <div className="flex items-center gap-3">
             <button
              onClick={() => void onExportCsv()}
              disabled={offline || exportBusy}
              className="flex items-center gap-2 rounded-2xl bg-zinc-800 px-6 py-4 text-sm font-bold text-white hover:bg-zinc-700 transition-all disabled:opacity-30"
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
              className="rounded-xl bg-zinc-950 px-4 py-3 text-sm text-white border border-white/5"
            />
          </div>
          <div className="flex flex-col gap-2">
             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">End Date</span>
             <input
              type="date"
              value={exportToYmd}
              onChange={(e) => setExportToYmd(e.target.value)}
              className="rounded-xl bg-zinc-950 px-4 py-3 text-sm text-white border border-white/5"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setExportFromYmd(""); setExportToYmd(""); }}
              className="h-11 rounded-xl px-4 text-xs font-bold text-zinc-500 hover:text-white transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </section>

      {/* Alerts */}
      <AnimatePresence>
        {offline && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 flex items-center gap-3 text-amber-500">
            <AlertCircle className="h-5 w-5" />
            <p className="text-xs font-bold">You are currently offline. Some actions will be queued.</p>
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 flex items-center gap-3 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <p className="text-xs font-bold">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meals List */}
      <ul className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredMeals.map((m) => {
            const isEditing = editingId === m.id;
            const busy = busyId === m.id;
            
            return (
              <motion.li
                key={m.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative rounded-3xl border border-white/[0.05] bg-zinc-900/50 p-6 transition-all hover:border-white/[0.1] hover:bg-zinc-900/80"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-950 text-zinc-500">
                        <Clock className="h-4 w-4" />
                      </div>
                      <time className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        {new Date(m.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })} · {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                    
                    {isEditing ? (
                      <div className="mt-4 flex flex-col gap-4">
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          className="w-full rounded-2xl bg-zinc-950 p-4 text-white focus:ring-1 focus:ring-emerald-500 outline-none border border-white/5"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={() => onSaveRecalculate(m.id)}
                            className="bg-emerald-500 text-zinc-950 px-4 py-2 rounded-xl font-bold text-xs"
                          >
                            Save
                          </button>
                          <button 
                            onClick={cancelEdit}
                            className="bg-zinc-800 text-white px-4 py-2 rounded-xl font-bold text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <h4 className="text-lg font-bold text-white leading-snug">{m.rawInput}</h4>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="rounded-2xl bg-emerald-500/10 px-4 py-2 ring-1 ring-emerald-500/20">
                      <p className="text-xl font-black text-emerald-400 tabular-nums">
                        {Math.round(m.totalKcal)}
                        <span className="text-[10px] ml-1 opacity-60">kcal</span>
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => logAgain(m.rawInput)}
                        className="rounded-xl p-3 bg-zinc-950 text-zinc-500 hover:text-white transition-colors"
                        title="Log Again"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => void onDuplicate(m.id, m.rawInput)}
                        className="rounded-xl p-3 bg-zinc-950 text-zinc-500 hover:text-violet-400 transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => openSplit(m)}
                        className="rounded-xl p-3 bg-zinc-950 text-zinc-500 hover:text-blue-400 transition-colors"
                        title="Split"
                      >
                        <Scissors className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => startEdit(m)}
                        className="rounded-xl p-3 bg-zinc-950 text-zinc-500 hover:text-emerald-400 transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button 
                         onClick={() => onDelete(m.id)}
                        className="rounded-xl p-3 bg-zinc-950 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Delete"
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

      {/* Load More */}
      {moreAfterExtra && (
        <div className="flex flex-col items-center gap-4 py-12">
           <button
            onClick={() => void onLoadMoreMeals()}
            className="group flex items-center gap-3 rounded-full bg-zinc-900 border border-white/[0.05] px-8 py-4 text-sm font-bold text-white transition-all hover:bg-zinc-800"
          >
            {loadMoreBusy ? "Loading..." : "Load Older Entries"}
            <ChevronDown className={`h-4 w-4 transition-transform group-hover:translate-y-0.5 ${loadMoreBusy ? 'animate-bounce' : ''}`} />
          </button>
        </div>
      )}

      {/* Split Modal Overlay */}
      <AnimatePresence>
        {splittingFor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-zinc-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-2xl rounded-3xl bg-zinc-900 p-8 shadow-2xl border border-white/[0.05] relative"
            >
              <button onClick={closeSplitModal} className="absolute right-6 top-6 text-zinc-500 hover:text-white">
                <X className="h-6 w-6" />
              </button>
              
              <h3 className="text-2xl font-black text-white mb-2">Split Meal</h3>
              <p className="text-xs text-zinc-400 mb-8 uppercase tracking-widest font-black">Divide into two separate logs</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl bg-zinc-950 p-4 border border-white/5">
                    <span className="text-[10px] font-black uppercase text-zinc-500">Part A</span>
                    <textarea 
                      value={splitPartA}
                      onChange={(e) => setSplitPartA(e.target.value)}
                      className="w-full bg-transparent mt-2 text-white outline-none resize-none"
                      rows={4}
                    />
                  </div>
                </div>
                
                <div className="hidden md:flex flex-col justify-center items-center text-zinc-800">
                  <ArrowRight className="h-10 w-10" />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl bg-zinc-950 p-4 border border-white/5">
                    <span className="text-[10px] font-black uppercase text-zinc-500">Part B</span>
                    <textarea 
                      value={splitPartB}
                      onChange={(e) => setSplitPartB(e.target.value)}
                      className="w-full bg-transparent mt-2 text-white outline-none resize-none"
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button onClick={onSplitSubmit} className="btn-primary flex-1">
                  Commit Split
                </button>
                <button onClick={closeSplitModal} className="bg-zinc-800 text-white px-8 rounded-2xl font-bold">
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
