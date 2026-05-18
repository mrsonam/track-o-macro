"use client";

import Link from "next/link";
import { Activity } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { LandingCtaPrimary } from "./landing-ctas";
import { navAnchors } from "./landing-content";
import { useLandingMotion } from "./reveal";

type LandingHeaderProps = {
  /** Fixed overlay on the hero (no cream strip above hero). */
  overlay?: boolean;
};

export function LandingHeader({ overlay = false }: LandingHeaderProps) {
  const { motionOn } = useLandingMotion();
  const { scrollY } = useScroll();
  const headerShadow = useTransform(scrollY, [0, 32], [
    "0 0 0 rgba(23,20,18,0)",
    "0 14px 44px -28px rgba(23,20,18,0.14)",
  ]);

  const inner = (
    <div
      className={`landing-hero-in mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 ${
        overlay ? "h-14 sm:h-16" : "h-16"
      }`}
    >
      <Link
        href="/"
        className="focus-ring flex cursor-pointer items-center gap-2 rounded-xl transition-opacity duration-200 hover:opacity-80"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#171412] text-[#eaf7df] shadow-[0_12px_28px_-18px_rgba(23,20,18,0.8)]">
          <Activity className="h-5 w-5" />
        </div>
        <span className="text-base font-black tracking-tight sm:text-lg">TrackOMacro</span>
      </Link>
      <nav className="hidden items-center gap-1 md:flex" aria-label="On this page">
        {navAnchors.map((a) => (
          <a
            key={a.href}
            href={a.href}
            className="focus-ring tap-target cursor-pointer rounded-xl px-3 text-xs font-bold uppercase tracking-wider text-zinc-500 transition-colors duration-200 hover:text-[#171412]"
          >
            {a.label}
          </a>
        ))}
      </nav>
      <div className="hidden items-center gap-2 md:flex md:gap-3">
        <Link
          href="/login"
          className="focus-ring tap-target cursor-pointer rounded-xl px-3 text-sm font-bold text-zinc-600 transition-colors duration-200 hover:text-[#171412]"
        >
          Sign in
        </Link>
        <LandingCtaPrimary href="/signup" size="compact">
          Get started
        </LandingCtaPrimary>
      </div>
    </div>
  );

  const barClass =
    "landing-header-bar mx-auto max-w-6xl overflow-hidden rounded-2xl border border-black/[0.08] bg-[#fbfaf5]/92 backdrop-blur-md";

  const wrapClass = overlay
    ? "px-3 sm:px-4"
    : "sticky top-3 z-50 px-3 sm:top-4 sm:px-4";

  if (!motionOn) {
    return (
      <div className={wrapClass}>
        <header className={barClass}>{inner}</header>
      </div>
    );
  }

  return (
    <div className={wrapClass}>
      <motion.header className={barClass} style={{ boxShadow: headerShadow }}>
        {inner}
      </motion.header>
    </div>
  );
}
