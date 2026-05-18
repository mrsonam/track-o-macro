"use client";

import { useEffect } from "react";

/** Keeps `--landing-chrome-h` in sync with the fixed header (mobile + desktop). */
export function LandingChromeMetrics() {
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".landing-shell");
    const chrome = document.querySelector<HTMLElement>(".landing-chrome");
    if (!shell || !chrome) return;

    const sync = () => {
      shell.style.setProperty("--landing-chrome-h", `${chrome.offsetHeight}px`);
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(chrome);
    window.addEventListener("resize", sync);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
      shell.style.removeProperty("--landing-chrome-h");
    };
  }, []);

  return null;
}
