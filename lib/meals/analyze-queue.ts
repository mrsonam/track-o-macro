/** @deprecated Legacy localStorage key — migrated once into IndexedDB */
export const ANALYZE_QUEUE_STORAGE_KEY = "calorie-pwa:analyze-queue";

export const ANALYZE_QUEUE_BROADCAST = "calorie-pwa:analyze-queue";

const MIGRATION_FLAG = "calorie-pwa:analyze-idb-migrated";

const DB_NAME = "calorie-pwa-analyze-v1";
const DB_VERSION = 1;
const STORE = "pending";
const MAX_ITEMS = 30;

export type QueuedMeal = {
  id: string;
  rawInput: string;
  queuedAt: number;
};

function broadcastQueueChanged() {
  try {
    const bc = new BroadcastChannel(ANALYZE_QUEUE_BROADCAST);
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

async function idbGetAll(): Promise<QueuedMeal[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const st = tx.objectStore(STORE);
    const r = st.getAll();
    r.onerror = () => reject(r.error);
    r.onsuccess = () => resolve((r.result as QueuedMeal[]) ?? []);
  });
}

async function idbPut(item: QueuedMeal): Promise<void> {
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

async function migrateLegacyOnce(): Promise<void> {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(MIGRATION_FLAG) === "1") return;
  try {
    const raw = localStorage.getItem(ANALYZE_QUEUE_STORAGE_KEY);
    if (!raw) {
      sessionStorage.setItem(MIGRATION_FLAG, "1");
      return;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(ANALYZE_QUEUE_STORAGE_KEY);
      sessionStorage.setItem(MIGRATION_FLAG, "1");
      return;
    }
    const existing = await idbGetAll();
    const ids = new Set(existing.map((x) => x.id));
    for (const x of parsed) {
      if (!x || typeof x !== "object") continue;
      const row = x as Record<string, unknown>;
      const id = row.id;
      const rawInput = row.rawInput;
      if (typeof id !== "string" || typeof rawInput !== "string") continue;
      if (ids.has(id)) continue;
      await idbPut({
        id,
        rawInput,
        queuedAt:
          typeof row.queuedAt === "number" ? row.queuedAt : Date.now(),
      });
      ids.add(id);
    }
    localStorage.removeItem(ANALYZE_QUEUE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  sessionStorage.setItem(MIGRATION_FLAG, "1");
}

/** FIFO order */
export async function readAnalyzeQueue(): Promise<QueuedMeal[]> {
  if (typeof window === "undefined") return [];
  await migrateLegacyOnce();
  const rows = await idbGetAll();
  return [...rows].sort((a, b) => a.queuedAt - b.queuedAt);
}

export async function enqueueAnalyze(rawInput: string): Promise<void> {
  if (typeof window === "undefined") return;
  const trimmed = rawInput.trim();
  if (!trimmed) return;
  await migrateLegacyOnce();
  let items = await readAnalyzeQueue();
  while (items.length >= MAX_ITEMS) {
    const oldest = items[0];
    if (!oldest) break;
    await idbDelete(oldest.id);
    items = await readAnalyzeQueue();
  }
  await idbPut({
    id: crypto.randomUUID(),
    rawInput: trimmed,
    queuedAt: Date.now(),
  });
  broadcastQueueChanged();
}

export async function dequeueAnalyze(id: string): Promise<void> {
  await migrateLegacyOnce();
  await idbDelete(id);
  broadcastQueueChanged();
}
