"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";

const MEALS = [
  { name: "Breakfast bowl", kcal: "412" },
  { name: "Chicken rice", kcal: "518" },
  { name: "Greek yogurt", kcal: "186" },
] as const;

const MACROS = [
  { label: "Protein", value: "142g", tint: "landing-tint-protein" },
  { label: "Carbs", value: "198g", tint: "landing-tint-carb" },
  { label: "Fat", value: "62g", tint: "landing-tint-fat" },
] as const;

const CHAR_MS = 42;
const KCAL_PAUSE_MS = 160;
const LINE_PAUSE_MS = 320;
const START_DELAY_MS = 520;
const MACRO_DELAY_MS = 280;

function fullLengths() {
  return MEALS.map((m) => m.name.length);
}

/** Hero product vignette — meal log types in, kcal follows each line. */
export function MacroHeroVisual() {
  const reduceMotion = useReducedMotion();
  const [lengths, setLengths] = useState(() => fullLengths().map(() => 0));
  const [kcalVisible, setKcalVisible] = useState([false, false, false]);
  const [macrosVisible, setMacrosVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const runId = useRef(0);

  useLayoutEffect(() => {
    if (reduceMotion) {
      setLengths(fullLengths());
      setKcalVisible([true, true, true]);
      setMacrosVisible(true);
      setActiveIndex(null);
    }
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion !== false) return;

    const id = ++runId.current;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(setTimeout(resolve, ms));
      });

    setLengths(MEALS.map(() => 0));
    setKcalVisible([false, false, false]);
    setMacrosVisible(false);
    setActiveIndex(0);

    void (async () => {
      await wait(START_DELAY_MS);
      if (runId.current !== id) return;

      for (let i = 0; i < MEALS.length; i++) {
        setActiveIndex(i);
        const { name } = MEALS[i];

        for (let c = 1; c <= name.length; c++) {
          await wait(CHAR_MS);
          if (runId.current !== id) return;
          setLengths((prev) => {
            const next = [...prev];
            next[i] = c;
            return next;
          });
        }

        await wait(KCAL_PAUSE_MS);
        if (runId.current !== id) return;
        setKcalVisible((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });

        if (i < MEALS.length - 1) {
          await wait(LINE_PAUSE_MS);
          if (runId.current !== id) return;
        }
      }

      setActiveIndex(null);
      await wait(MACRO_DELAY_MS);
      if (runId.current !== id) return;
      setMacrosVisible(true);
    })();

    return () => {
      runId.current += 1;
      timers.forEach(clearTimeout);
    };
  }, [reduceMotion]);

  return (
    <figure
      className="landing-hero-visual-wrap relative mx-auto w-full max-w-[min(100%,22rem)]"
      aria-labelledby="landing-hero-visual-title"
    >
      <figcaption id="landing-hero-visual-title" className="sr-only">
        Example today&apos;s log with three meals and protein, carb, and fat totals in label style.
      </figcaption>

      <div className="landing-hero-in delay-3 relative overflow-hidden rounded-[2rem] border border-black/[0.08] bg-white/90 p-5 shadow-[0_28px_80px_-48px_rgba(23,20,18,0.5)] sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full border border-dashed border-[color:var(--accent-secondary)]/25 opacity-60"
        />

        <p className="landing-kicker landing-kicker-signal">Today&apos;s log</p>

        <ul
          className="mt-4 space-y-2.5 border-b border-black/[0.06] pb-4 font-mono text-sm"
          aria-live="polite"
          aria-atomic="false"
        >
          {MEALS.map((meal, i) => {
            const typed = meal.name.slice(0, lengths[i]);
            const showCaret = !reduceMotion && activeIndex === i && lengths[i] < meal.name.length;

            return (
              <li key={meal.name} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 font-medium text-[color:var(--foreground)]">
                  {typed}
                  {showCaret ? (
                    <span className="landing-log-caret ml-px inline-block w-[2px]" aria-hidden />
                  ) : null}
                </span>
                <span
                  className={`landing-log-kcal shrink-0 min-w-[4.75rem] text-right tabular-nums text-zinc-500 ${
                    kcalVisible[i] ? "landing-log-kcal--visible" : ""
                  }`}
                >
                  {meal.kcal} kcal
                </span>
              </li>
            );
          })}
        </ul>

        <dl
          className={`mt-4 grid grid-cols-3 gap-2 ${
            macrosVisible ? "landing-log-macros--visible" : ""
          }`}
        >
          {MACROS.map((m, i) => (
            <div
              key={m.label}
              className={`landing-log-macro rounded-xl border border-black/[0.08] px-2 py-2.5 text-center ${m.tint}`}
              style={{ "--macro-i": i } as CSSProperties}
            >
              <dt className="landing-kicker text-[9px]">{m.label}</dt>
              <dd className="mt-1 font-mono text-sm font-bold tabular-nums text-[color:var(--foreground)]">
                {m.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </figure>
  );
}
