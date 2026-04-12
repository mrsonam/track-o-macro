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
  /** Full meal text for optional “split at cursor” (kept in sync when parts blur). */
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
          setExportError(
            "Choose both start and end dates for a range export, or clear both to export recent meals (up to 5,000).",
          );
          setExportBusy(false);
          return;
        }
        if (f > t) {
          setExportError("End date must be on or after the start date.");
          setExportBusy(false);
          return;
        }
        try {
          const { fromIso } = localDayBoundsIsoFromYmd(f);
          const { toIso } = localDayBoundsIsoFromYmd(t);
          exportPath = `/api/meals/export?${new URLSearchParams({ from: fromIso, to: toIso })}`;
        } catch {
          setExportError("Invalid date.");
          setExportBusy(false);
          return;
        }
      }

      const res = await fetch(exportPath, { credentials: "same-origin" });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setExportError(
          typeof d.error === "string" ? d.error : "Could not export",
        );
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
      a.rel = "noopener";
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
    <>
      {offline ? (
        <div
          className="mt-6 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p className="font-medium">You&apos;re offline.</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-950/90">
            <strong>Duplicate</strong> and <strong>Split</strong> can be queued
            here and run when you&apos;re back online.{" "}
            <strong>Edit</strong>, <strong>Delete</strong>, and CSV export still
            need a connection. <strong>Log again</strong> opens the home screen
            with this meal&apos;s text.
          </p>
        </div>
      ) : null}
      {historyQueue.length > 0 ? (
        <div
          className="mt-4 rounded-xl border border-sky-200/90 bg-sky-50/90 px-4 py-3 text-sm text-sky-950 shadow-sm shadow-sky-900/5"
          role="status"
        >
          <p className="font-medium">
            {historyQueue.length} history action
            {historyQueue.length === 1 ? "" : "s"} queued
            {offline ? " · offline" : ""}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-sky-900/85">
            Duplicate and split requests saved in this browser (IndexedDB). They
            run in order when the server is reachable.
          </p>
          {!offline ? (
            <button
              type="button"
              disabled={historyFlushBusy}
              onClick={() => void flushHistoryActionQueue()}
              className="mt-2 text-xs font-semibold text-sky-900 underline decoration-sky-800/35 underline-offset-2 hover:decoration-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {historyFlushBusy ? "Sending…" : "Send now"}
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="mt-6">
        <label htmlFor="history-search" className="sr-only">
          Search meals by description
        </label>
        <input
          id="history-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your meal descriptions…"
          autoComplete="off"
          className="input-field max-w-md"
        />
        {search.trim() ? (
          <p className="mt-2 text-xs text-stone-500">
            Showing {filteredMeals.length} of {displayMeals.length} loaded meals
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={offline || exportBusy}
            onClick={() => void onExportCsv()}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 shadow-sm hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportBusy ? "Preparing…" : "Export CSV"}
          </button>
          <span className="text-xs text-stone-500">
            Up to 5,000 rows, UTF-8 (opens in Excel). Leave dates empty for your
            most recent meals.
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-stone-200/80 bg-stone-50/60 px-3 py-3">
          <p className="w-full text-[11px] font-medium text-stone-500">
            Optional range (your local calendar)
          </p>
          <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
            From
            <input
              type="date"
              value={exportFromYmd}
              onChange={(e) => setExportFromYmd(e.target.value)}
              disabled={offline || exportBusy}
              className="input-field py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
            Through
            <input
              type="date"
              value={exportToYmd}
              onChange={(e) => setExportToYmd(e.target.value)}
              disabled={offline || exportBusy}
              className="input-field py-2 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={offline || exportBusy}
            onClick={() => {
              setExportFromYmd("");
              setExportToYmd("");
              setExportError(null);
            }}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-50"
          >
            Clear dates
          </button>
        </div>
        {exportError ? (
          <p className="mt-2 text-xs text-red-800" role="alert">
            {exportError}
          </p>
        ) : null}
      </div>
      {error ? (
        <div
          className="mb-4 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {filteredMeals.length === 0 && displayMeals.length > 0 ? (
        <p className="mt-8 text-sm text-stone-600">
          No meals match &ldquo;{search.trim()}&rdquo;. Try different words.
        </p>
      ) : null}
      <ul className="mt-8 space-y-3">
        {filteredMeals.map((m) => {
          const isEditing = editingId === m.id;
          const busy = busyId === m.id;

          return (
            <li
              key={m.id}
              className="group flex flex-col gap-3 rounded-2xl border border-stone-200/90 bg-white/90 px-5 py-4 shadow-sm shadow-stone-900/5 transition-[box-shadow,transform] hover:shadow-md"
            >
              {isEditing ? (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-stone-600">
                    Edit description — we&apos;ll recalculate calories
                  </label>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={4}
                    className="input-field resize-y text-[15px] leading-relaxed"
                    disabled={busy}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || offline || !draft.trim()}
                      onClick={() => onSaveRecalculate(m.id)}
                      className="btn-primary px-4 py-2 text-sm"
                    >
                      {busy ? "Recalculating…" : "Save & recalculate"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={cancelEdit}
                      className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[15px] leading-snug text-stone-900">
                  {m.rawInput}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3 text-xs text-stone-500">
                <span className="font-semibold tabular-nums text-emerald-800">
                  {Math.round(m.totalKcal)} kcal
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <time
                    dateTime={m.createdAt}
                    className="text-stone-500"
                    suppressHydrationWarning
                  >
                    {new Date(m.createdAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                  {!isEditing ? (
                    <span className="hidden sm:inline text-stone-300">·</span>
                  ) : null}
                  {!isEditing ? (
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => logAgain(m.rawInput)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
                      >
                        Log again
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        title={
                          offline
                            ? "Queues a new log when you are back online"
                            : undefined
                        }
                        onClick={() => void onDuplicate(m.id, m.rawInput)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-violet-800 hover:bg-violet-50 disabled:opacity-50"
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        title={
                          offline
                            ? "Prepare split now; saves when you are back online"
                            : undefined
                        }
                        onClick={() => openSplit(m)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-sky-800 hover:bg-sky-50 disabled:opacity-50"
                      >
                        Split
                      </button>
                      <button
                        type="button"
                        disabled={busy || offline}
                        title={
                          offline
                            ? "Connect to the internet to edit"
                            : undefined
                        }
                        onClick={() => startEdit(m)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy || offline}
                        title={
                          offline
                            ? "Connect to the internet to delete"
                            : undefined
                        }
                        onClick={() => onDelete(m.id)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
                        aria-label={`Delete meal logged ${m.createdAt}`}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {loadMoreError ? (
        <p className="mt-4 text-xs text-red-800" role="alert">
          {loadMoreError}
        </p>
      ) : null}
      {moreAfterExtra ? (
        <div className="mt-6 flex flex-col items-center gap-2 border-t border-stone-100 pt-6">
          <button
            type="button"
            disabled={offline || loadMoreBusy}
            title={offline ? "Connect to the internet to load more" : undefined}
            onClick={() => void onLoadMoreMeals()}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadMoreBusy ? "Loading…" : "Load older meals"}
          </button>
          <p className="max-w-sm text-center text-xs leading-relaxed text-stone-500">
            Fetches up to {HISTORY_MEALS_PAGE_SIZE} older entries at a time (same
            order as above).
          </p>
        </div>
      ) : null}

      {splittingFor ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-4 sm:items-center"
          role="presentation"
          onClick={(e) => {
            if (e.target !== e.currentTarget) return;
            if (splittingFor && busyId === splittingFor.id) return;
            closeSplitModal();
          }}
        >
          <div
            className="max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="split-dialog-title"
          >
            <h2
              id="split-dialog-title"
              className="text-base font-semibold text-stone-900"
            >
              Split into two meals
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              We pre-fill from blank lines or the first line break. Edit both
              parts, then save. The original entry is removed and replaced by
              two new logs (newest first in this list).
            </p>
            <p className="mt-2 rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2 text-xs leading-relaxed text-sky-950/90">
              Tip: use a blank line between breakfast and lunch—we pre-fill
              from that—or put the cursor in the box below and use Split at
              cursor.
            </p>
            {offline ? (
              <p className="mt-2 text-xs leading-relaxed text-amber-900/95">
                You&apos;re offline — you can still edit the two parts below;
                <strong> Split &amp; save</strong> queues the split for when
                you&apos;re back online.
              </p>
            ) : null}
            <label
              htmlFor="split-draft-text"
              className="mt-4 block text-xs font-medium text-stone-600"
            >
              Quick split (optional)
            </label>
            <textarea
              id="split-draft-text"
              ref={splitDraftRef}
              value={splitDraft}
              onChange={(e) => setSplitDraft(e.target.value)}
              rows={4}
              disabled={busyId === splittingFor.id}
              className="input-field mt-1 resize-y text-[15px] leading-relaxed"
              placeholder="Full meal text — click where one meal ends and the next begins"
            />
            <div className="mt-2">
              <button
                type="button"
                disabled={busyId === splittingFor.id || !splitDraft.trim()}
                onClick={splitAtCursor}
                className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-900 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Split at cursor
              </button>
            </div>
            <label className="mt-4 block text-xs font-medium text-stone-600">
              Part 1
            </label>
            <textarea
              value={splitPartA}
              onChange={(e) => setSplitPartA(e.target.value)}
              rows={3}
              disabled={busyId === splittingFor.id}
              className="input-field mt-1 resize-y text-[15px] leading-relaxed"
            />
            <label className="mt-3 block text-xs font-medium text-stone-600">
              Part 2
            </label>
            <textarea
              value={splitPartB}
              onChange={(e) => setSplitPartB(e.target.value)}
              rows={3}
              disabled={busyId === splittingFor.id}
              className="input-field mt-1 resize-y text-[15px] leading-relaxed"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={
                  busyId === splittingFor.id ||
                  !splitPartA.trim() ||
                  !splitPartB.trim()
                }
                onClick={() => void onSplitSubmit()}
                className="btn-primary px-4 py-2 text-sm"
              >
                {busyId === splittingFor.id
                  ? offline
                    ? "Queuing…"
                    : "Splitting…"
                  : offline
                    ? "Queue split"
                    : "Split & save"}
              </button>
              <button
                type="button"
                disabled={busyId === splittingFor.id}
                onClick={closeSplitModal}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
