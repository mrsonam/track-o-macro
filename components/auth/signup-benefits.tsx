import { BarChart3, ChefHat, ScanLine, Sparkles } from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Log in plain language",
    body: "Describe meals naturally and get USDA-backed macros.",
  },
  {
    icon: ChefHat,
    title: "Prepared meals",
    body: "Cook once, then log portions by weight from home.",
  },
  {
    icon: ScanLine,
    title: "Barcode scan",
    body: "Add packaged foods without typing nutrition labels.",
  },
  {
    icon: BarChart3,
    title: "Weekly clarity",
    body: "See trends and targets without spreadsheet friction.",
  },
] as const;

const STEPS = [
  { n: "1", label: "Create your account", detail: "Email and password only." },
  { n: "2", label: "Set your targets", detail: "A short onboarding for calories and macros." },
  { n: "3", label: "Log your first meal", detail: "Start from the dashboard in plain language." },
] as const;

/** Value panel for signup — desktop aside + mobile summary. */
export function SignupBenefits({ variant }: { variant: "aside" | "mobile" }) {
  if (variant === "mobile") {
    return (
      <section className="mb-8 lg:hidden" aria-labelledby="signup-benefits-mobile-heading">
        <h2 id="signup-benefits-mobile-heading" className="landing-kicker landing-kicker-signal mb-3">
          What you get
        </h2>
        <ul className="space-y-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--protein-tint)] text-[color:var(--accent-secondary)]">
                <f.icon className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[color:var(--foreground)]">{f.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <aside className="hidden flex-col justify-center lg:flex" aria-labelledby="signup-benefits-heading">
      <p className="landing-kicker landing-kicker-signal mb-3">TrackOMacro</p>
      <h2
        id="signup-benefits-heading"
        className="text-2xl font-black leading-tight tracking-tight text-[color:var(--foreground)] sm:text-3xl"
      >
        A calm workspace for honest macro tracking
      </h2>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-600">
        Built for daily logging at the table: accurate numbers, no guilt metrics, and a light
        interface you can install as a PWA.
      </p>

      <ul className="mt-8 space-y-4">
        {FEATURES.map((f) => (
          <li key={f.title} className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--protein-tint)] text-[color:var(--accent-secondary)]">
              <f.icon className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="font-bold text-[color:var(--foreground)]">{f.title}</p>
              <p className="mt-0.5 text-sm text-zinc-600">{f.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-10 rounded-2xl border border-black/[0.08] bg-[color:var(--warm-neutral)]/60 p-5">
        <p className="landing-kicker mb-4 text-zinc-500">What happens next</p>
        <ol className="space-y-3">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-3 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color:var(--foreground)] font-mono text-xs font-bold text-white">
                {s.n}
              </span>
              <div>
                <p className="font-bold text-[color:var(--foreground)]">{s.label}</p>
                <p className="text-zinc-600">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
