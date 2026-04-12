"use client";

import { useEffect, useState } from "react";
import {
  MEALS_BROADCAST_CHANNEL,
  MEALS_CHANGED_EVENT,
} from "@/lib/meals-sync";

/** Shared bump for refetching meal aggregates (visibility, focus, cross-tab). */
export function useMealsSyncTick() {
  const [syncTick, setSyncTick] = useState(0);

  useEffect(() => {
    let lastBump = 0;
    function bump() {
      const now = Date.now();
      if (now - lastBump < 400) return;
      lastBump = now;
      setSyncTick((t) => t + 1);
    }

    function onVisibility() {
      if (document.visibilityState === "visible") bump();
    }

    let focusTimer: ReturnType<typeof setTimeout> | null = null;
    function onFocus() {
      if (focusTimer) clearTimeout(focusTimer);
      focusTimer = setTimeout(() => bump(), 400);
    }

    function onPageshow(e: PageTransitionEvent) {
      if (e.persisted) bump();
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(MEALS_CHANGED_EVENT, bump);
    window.addEventListener("pageshow", onPageshow);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(MEALS_BROADCAST_CHANNEL);
      bc.onmessage = () => bump();
    } catch {
      /* optional */
    }

    return () => {
      if (focusTimer) clearTimeout(focusTimer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(MEALS_CHANGED_EVENT, bump);
      window.removeEventListener("pageshow", onPageshow);
      bc?.close();
    };
  }, []);

  return syncTick;
}
