import Link from "next/link";
import { ChefHat, ScanLine, Smartphone } from "lucide-react";
import { LandingCtaOnDark, LandingCtaPrimary, LandingCtaSecondary } from "./landing-ctas";
import { navAnchors, painPoints, steps } from "./landing-content";
import { LandingFeaturesSection } from "./landing-features-section";
import { LandingChromeMetrics } from "./landing-chrome-metrics";
import { LandingHeader } from "./landing-header";
import { LandingHeroParallax } from "./landing-hero-parallax";
import { LandingLivePreview } from "./landing-live-preview";
import { LandingMotionReady } from "./landing-motion-ready";
import { LandingReveal, LandingRevealGroup, LandingRevealItem } from "./landing-reveal";
import { LandingStepRow } from "./landing-step-row";
import { MacroHeroVisual } from "./macro-hero-visual";

export function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <div className="landing-shell min-h-dvh text-[color:var(--foreground)]">
      <LandingMotionReady />
      <a href="#main" className="landing-skip">
        Skip to content
      </a>

      <div className="landing-chrome pointer-events-none fixed inset-x-0 top-0 z-50">
        <LandingChromeMetrics />
        <div className="pointer-events-auto">
          <LandingHeader overlay />
        </div>
      </div>

      <main id="main">
        <section className="relative overflow-hidden border-b border-black/[0.06]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 landing-hero-bg"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(79,157,69,0.14), transparent 55%), radial-gradient(ellipse 70% 50% at 80% 30%, rgba(223,241,255,0.55), transparent 50%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(23,20,18,0.04), transparent 60%)",
              backgroundSize: "200% 200%",
            }}
          />
          <div
            aria-hidden
            className="landing-hero-orb pointer-events-none absolute -right-24 top-24 h-64 w-64 rounded-full bg-[color:var(--accent-secondary)]/12 blur-2xl landing-hero-orb-a"
          />
          <div
            aria-hidden
            className="landing-hero-orb pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[color:var(--carb-sky)]/45 blur-2xl landing-hero-orb-b"
          />

          <div className="landing-hero-content relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 sm:px-6 sm:pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pb-28">
            <div className="max-w-xl">
              <p className="landing-hero-in landing-kicker landing-kicker-signal delay-1 mb-4">
                Macro tracking, refined
              </p>
              <h1 className="landing-hero-in delay-2 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.25rem]">
                Know your macros
                <span className="block text-zinc-500">without the spreadsheet.</span>
              </h1>
              <p className="landing-hero-in delay-3 mt-6 max-w-prose text-base leading-relaxed text-zinc-600 sm:text-lg">
                TrackOMacro turns everyday meal descriptions into precise nutrition: search, scan,
                batch cook, and log portions by weight.
              </p>
              <div className="landing-hero-in delay-4 mt-9 flex flex-wrap items-center gap-3">
                <LandingCtaPrimary href="/signup">Start free</LandingCtaPrimary>
                <LandingCtaSecondary href="/login">Sign in</LandingCtaSecondary>
              </div>
              <ul className="landing-hero-in delay-5 mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
                <li className="flex items-center gap-2">
                  <ScanLine className="h-3.5 w-3.5 text-[color:var(--accent-secondary)]" />
                  Barcode scan
                </li>
                <li className="flex items-center gap-2">
                  <ChefHat className="h-3.5 w-3.5 text-[color:var(--accent-secondary)]" />
                  Prepared meals
                </li>
                <li className="flex items-center gap-2">
                  <Smartphone className="h-3.5 w-3.5 text-[color:var(--accent-secondary)]" aria-hidden />
                  PWA ready
                </li>
              </ul>
              <nav
                className="landing-hero-mobile-nav mt-8 flex gap-2 overflow-x-auto md:hidden"
                aria-label="Page sections"
              >
                {navAnchors.map((a) => (
                  <a
                    key={a.href}
                    href={a.href}
                    className="focus-ring tap-target shrink-0 rounded-full border border-black/[0.08] bg-white/80 px-3.5 text-[11px] font-bold uppercase tracking-wider text-zinc-600 transition-colors duration-200 hover:border-[color:var(--accent-secondary)]/30 hover:text-[color:var(--foreground)]"
                  >
                    {a.label}
                  </a>
                ))}
              </nav>
            </div>

            <LandingHeroParallax>
              <MacroHeroVisual />
            </LandingHeroParallax>
          </div>
        </section>

        <section
          id="why"
          className="landing-section border-b border-black/[0.06] bg-[color:var(--surface)]/60"
          aria-labelledby="landing-why-heading"
        >
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <LandingReveal className="max-w-lg">
              <p className="landing-kicker landing-kicker-signal">The problem</p>
              <h2
                id="landing-why-heading"
                className="mt-3 text-3xl font-black tracking-tight sm:text-4xl"
              >
                Tracking should feel like a ledger, not a second job.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-zinc-600 sm:text-lg">
                Most tools push charts, streaks, and shame. TrackOMacro is built for adults who want
                accurate macros at the table, then a calm weekly read without spreadsheet friction.
              </p>
            </LandingReveal>
            <LandingRevealGroup className="space-y-4">
              {painPoints.map((p) => (
                <LandingRevealItem key={p.title}>
                  <article className="flex gap-4 rounded-2xl border border-black/[0.08] bg-white/80 p-5 transition-colors duration-200 hover:border-[color:var(--accent-secondary)]/20">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--warm-neutral)] text-[color:var(--foreground)]">
                      <p.icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <h3 className="font-bold text-[color:var(--foreground)]">{p.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-600">{p.body}</p>
                    </div>
                  </article>
                </LandingRevealItem>
              ))}
            </LandingRevealGroup>
          </div>
        </section>

        <LandingFeaturesSection />

        <section
          id="how-it-works"
          className="landing-section border-y border-black/[0.06] bg-[color:var(--surface)]/80"
          aria-labelledby="landing-how-heading"
        >
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center">
            <div>
              <LandingReveal>
                <p className="landing-kicker">How it works</p>
                <h2
                  id="landing-how-heading"
                  className="mt-3 text-3xl font-black tracking-tight sm:text-4xl"
                >
                  From kitchen to clarity in three beats.
                </h2>
              </LandingReveal>

              <LandingRevealGroup
                as="ol"
                className="mt-10 list-none space-y-6 p-0"
              >
                {steps.map((s) => (
                  <LandingStepRow key={s.n} step={s} />
                ))}
              </LandingRevealGroup>
            </div>

            <LandingReveal>
              <LandingLivePreview />
            </LandingReveal>
          </div>
        </section>

        <section
          className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28"
          aria-labelledby="landing-cta-heading"
        >
          <LandingReveal>
            <div className="relative overflow-hidden rounded-[2.5rem] bg-[color:var(--foreground)] px-8 py-14 text-center sm:px-12 sm:py-16">
              <div
                aria-hidden
                className="landing-cta-glow pointer-events-none absolute inset-0 opacity-40"
                style={{
                  background:
                    "radial-gradient(circle at 30% 20%, rgba(79,157,69,0.35), transparent 45%), radial-gradient(circle at 70% 80%, rgba(223,241,255,0.12), transparent 40%)",
                }}
              />

              <LandingRevealGroup className="relative">
                <LandingRevealItem>
                  <h2
                    id="landing-cta-heading"
                    className="text-3xl font-black tracking-tight text-white sm:text-4xl"
                  >
                    Ready to log with confidence?
                  </h2>
                </LandingRevealItem>
                <LandingRevealItem>
                  <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
                    Install as a PWA, set your targets once, and keep macros visible every day.
                  </p>
                </LandingRevealItem>
                <LandingRevealItem>
                  <LandingCtaOnDark href="/signup">Create your account</LandingCtaOnDark>
                </LandingRevealItem>
              </LandingRevealGroup>
            </div>
          </LandingReveal>
        </section>
      </main>

      <LandingReveal className="border-t border-black/[0.06] py-10">
        <footer>
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
            <div>
              <p className="text-xs font-medium text-zinc-500">© {year} TrackOMacro</p>
              <p className="mt-2 max-w-sm text-[11px] leading-relaxed text-zinc-500">
                Research-grade tracking assistant, not a substitute for medical care.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
              <Link
                href="/privacy"
                className="focus-ring tap-target rounded-xl px-3 text-xs font-medium text-zinc-500 transition-colors duration-200 hover:text-[color:var(--foreground)]"
              >
                Privacy
              </Link>
              <Link
                href="/login"
                className="focus-ring tap-target rounded-xl px-3 text-xs font-medium text-zinc-500 transition-colors duration-200 hover:text-[color:var(--foreground)]"
              >
                Sign in
              </Link>
            </div>
          </div>
        </footer>
      </LandingReveal>
    </div>
  );
}
