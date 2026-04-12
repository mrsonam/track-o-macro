/** Background Sync tag — must match `sw.js` */
export const ANALYZE_QUEUE_SYNC_TAG = "analyze-queue";

/**
 * Ask the service worker to run a one-shot sync when connectivity returns
 * (fires `sync` → SW tells clients to flush the analyze queue).
 */
export async function registerAnalyzeQueueSync(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sync = (
      reg as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      }
    ).sync;
    if (sync?.register) {
      await sync.register(ANALYZE_QUEUE_SYNC_TAG);
    }
  } catch {
    /* SyncManager unsupported or quota */
  }
}
