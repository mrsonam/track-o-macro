/** Broadcast when the history duplicate/split queue changes (IndexedDB). */
export const HISTORY_ACTION_QUEUE_BROADCAST = "calorie-pwa:history-action-queue";

const DB_NAME = "calorie-pwa-history-actions-v1";
const DB_VERSION = 1;
const STORE = "pending";
const MAX_ITEMS = 30;

export type QueuedHistoryDuplicate = {
  kind: "duplicate";
  id: string;
  rawInput: string;
  queuedAt: number;
};

export type QueuedHistorySplit = {
  kind: "split";
  id: string;
  mealId: string;
  partA: string;
  partB: string;
  queuedAt: number;
};

export type QueuedHistoryAction = QueuedHistoryDuplicate | QueuedHistorySplit;

function broadcastQueueChanged() {
  try {
    const bc = new BroadcastChannel(HISTORY_ACTION_QUEUE_BROADCAST);
    bc.postMessage({ type: "changed" });
    bc.close();
  } catch {
    /* optional */
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
  });
}

async function idbGetAll(): Promise<QueuedHistoryAction[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const r = tx.objectStore(STORE).getAll();
    r.onerror = () => reject(r.error);
    r.onsuccess = () => resolve((r.result as QueuedHistoryAction[]) ?? []);
  });
}

async function idbPut(item: QueuedHistoryAction): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(item);
  });
}

async function idbDelete(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(id);
  });
}

/** FIFO order */
export async function readHistoryActionQueue(): Promise<QueuedHistoryAction[]> {
  if (typeof window === "undefined") return [];
  const rows = await idbGetAll();
  return [...rows].sort((a, b) => a.queuedAt - b.queuedAt);
}

export async function enqueueHistoryDuplicate(rawInput: string): Promise<void> {
  if (typeof window === "undefined") return;
  const trimmed = rawInput.trim();
  if (!trimmed) return;
  let items = await readHistoryActionQueue();
  while (items.length >= MAX_ITEMS) {
    const oldest = items[0];
    if (!oldest) break;
    await idbDelete(oldest.id);
    items = await readHistoryActionQueue();
  }
  await idbPut({
    kind: "duplicate",
    id: crypto.randomUUID(),
    rawInput: trimmed,
    queuedAt: Date.now(),
  });
  broadcastQueueChanged();
}

export async function enqueueHistorySplit(
  mealId: string,
  partA: string,
  partB: string,
): Promise<void> {
  if (typeof window === "undefined") return;
  const a = partA.trim();
  const b = partB.trim();
  if (!a || !b) return;
  let items = await readHistoryActionQueue();
  while (items.length >= MAX_ITEMS) {
    const oldest = items[0];
    if (!oldest) break;
    await idbDelete(oldest.id);
    items = await readHistoryActionQueue();
  }
  await idbPut({
    kind: "split",
    id: crypto.randomUUID(),
    mealId,
    partA: a,
    partB: b,
    queuedAt: Date.now(),
  });
  broadcastQueueChanged();
}

export async function dequeueHistoryAction(id: string): Promise<void> {
  await idbDelete(id);
  broadcastQueueChanged();
}
