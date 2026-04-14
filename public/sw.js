// Calorie Agent — install + offline shell + analyze queue background sync
const CACHE_NAME = "calorie-agent-sw-v4";
const PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/icon-192x192.svg",
  "/icon-512x512.svg",
];

/** Tells open tabs to flush IndexedDB meal queue (same-origin cookies on fetch). */
const ANALYZE_QUEUE_SYNC_TAG = "analyze-queue";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) =>
            key !== CACHE_NAME ? caches.delete(key) : undefined,
          ),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag !== ANALYZE_QUEUE_SYNC_TAG) {
    return;
  }
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          client.postMessage({ type: "FLUSH_ANALYZE_QUEUE" });
        }
      }),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches
      .match(event.request)
      .then((cached) => cached || fetch(event.request)),
  );
});
