// Calorie Agent — install + offline assets + analyze queue background sync
// v5: never precache HTML (stale shells break hashed chunks after deploy); network-first
// for navigations and Next assets; do not intercept third-party fetches (avoids SW CSP issues).

const CACHE_NAME = "calorie-agent-sw-v5";
const PRECACHE = [
  "/manifest.webmanifest",
  "/icon-192x192.svg",
  "/icon-512x512.svg",
];

/** Origin this worker controls (scope may include trailing slash). */
function appOrigin() {
  return new URL(self.registration.scope).origin;
}

function isSameOriginRequest(url) {
  return url.origin === appOrigin();
}

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

  const url = new URL(event.request.url);
  // Third-party (fonts, Vercel toolbar, etc.): do not intercept — avoids SW CSP blocking
  // connect-src and pointless caching.
  if (!isSameOriginRequest(url)) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Next hashed bundles — always network first so new deploys load valid chunks.
      if (url.pathname.startsWith("/_next/static/")) {
        try {
          const res = await fetch(event.request);
          if (res && res.ok) {
            cache.put(event.request, res.clone());
          }
          return res;
        } catch (err) {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          throw err;
        }
      }

      // Full document navigations — network first so we never serve a cached HTML
      // shell that references deleted /_next/static chunk hashes after a deploy.
      if (event.request.mode === "navigate") {
        try {
          const res = await fetch(event.request);
          if (res && res.ok) {
            cache.put(event.request, res.clone());
          }
          return res;
        } catch (err) {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          throw err;
        }
      }

      const cached = await cache.match(event.request);
      if (cached) return cached;
      const res = await fetch(event.request);
      return res;
    })(),
  );
});
