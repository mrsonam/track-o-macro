/** Background Sync tag — must match `sw.js` */
export const HISTORY_ACTION_QUEUE_SYNC_TAG = "history-action-queue";

/**
 * Ask the service worker to notify clients to flush the history action queue
 * when connectivity returns.
 */
export async function registerHistoryActionQueueSync(): Promise<void> {
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
      await sync.register(HISTORY_ACTION_QUEUE_SYNC_TAG);
    }
  } catch {
    /* SyncManager unsupported or quota */
  }
}
