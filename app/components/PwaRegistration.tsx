"use client";

import { useEffect } from "react";

/**
 * Registers `/sw.js` for PWA install and light offline cache.
 */
export function PwaRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    async function register() {
      try {
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
      } catch {
        // Dev or unsupported context
      }
    }

    register();
  }, []);

  return null;
}
