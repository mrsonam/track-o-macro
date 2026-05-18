"use client";

import { useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import { useLandingMotion } from "./reveal";

/** Sets `html.landing-motion-ready` for CSS-only hero animations (kept out of the server shell). */
export function LandingMotionReady() {
  const reduceMotion = useReducedMotion();
  const { hydrated } = useLandingMotion();

  useEffect(() => {
    if (!hydrated || reduceMotion) return;
    document.documentElement.classList.add("landing-motion-ready");
    return () => document.documentElement.classList.remove("landing-motion-ready");
  }, [hydrated, reduceMotion]);

  return null;
}
