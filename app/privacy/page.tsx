import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Database,
  MessageSquare,
  Download,
  BadgeDollarSign,
  ArrowLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { dash } from "@/lib/ui/dashboard-tokens";

export const metadata: Metadata = {
  title: "Privacy & Safety · TrackOMacro",
  description: "How TrackOMacro stores, uses, and lets you control your data.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <div className="mb-12 flex flex-col items-start">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-black/10 bg-protein-tint text-signal-deep">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <p className={`mb-2 ${dash.labelEyebrow}`}>Privacy</p>
        <h1 className="font-mono text-4xl font-black tracking-tight text-foreground sm:text-5xl">
          Privacy & Safety
        </h1>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-zinc-600">
          Here is a plain-language breakdown of what TrackOMacro stores, how your data is used,
          and how to manage or delete it whenever you want.
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex items-start gap-4 rounded-2xl border border-black/10 bg-warm-neutral p-6 sm:p-8">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/10 bg-white text-zinc-600">
            <Info className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
              Not medical advice
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              TrackOMacro is a self-tracking tool, not a medical device or a substitute for advice
              from a doctor or registered dietitian. Always check food labels and follow guidance
              from a qualified professional.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="bento-card border-black/10 bg-white/85 p-6 sm:p-8">
            <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-carb-sky text-sky-800">
              <Database className="h-5 w-5" />
            </div>
            <h2 className="mb-4 text-lg font-bold text-foreground">What we store</h2>
            <ul className="space-y-3 text-sm text-zinc-600">
              <li className="flex items-start gap-2">
                <div className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-400" />
                <span>
                  <strong className="font-semibold text-zinc-800">Account:</strong> your email
                  address and a securely hashed password.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-400" />
                <span>
                  <strong className="font-semibold text-zinc-800">Profile:</strong> the height,
                  weight, and goals you enter during onboarding.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-400" />
                <span>
                  <strong className="font-semibold text-zinc-800">Meal logs:</strong> everything
                  you log, including macro totals and custom foods.
                </span>
              </li>
            </ul>
          </section>

          <section className="bento-card border-black/10 bg-white/85 p-6 sm:p-8">
            <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-protein-tint text-signal-deep">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h2 className="mb-4 text-lg font-bold text-foreground">How meal logging works</h2>
            <p className="text-sm leading-relaxed text-zinc-600">
              When you describe a meal in plain language, that text is sent to a secure AI service
              to estimate its nutrition. Avoid including personal details you would not want
              stored, like full names or addresses, in your meal entries.
            </p>
          </section>
        </div>

        <section className="bento-card border-black/10 bg-white/85 p-6 sm:p-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-protein-tint text-signal-deep">
                <Download className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Your data, your control</h2>
              <p className="max-w-sm text-sm leading-relaxed text-zinc-600">
                You keep full access to your data. Export everything you have logged, or
                permanently delete your account, from your settings at any time.
              </p>
            </div>
            <Link
              href="/login?next=/settings"
              className="focus-ring tap-target group flex shrink-0 items-center gap-2 rounded-xl px-2 text-xs font-black uppercase tracking-widest text-signal-deep transition-colors hover:text-accent-secondary"
            >
              Go to account settings
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

        <section className="bento-card border-black/10 bg-white/85 p-6 sm:p-8">
          <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <BadgeDollarSign className="h-5 w-5" />
          </div>
          <h2 className="mb-3 text-lg font-bold text-foreground">We do not sell your data</h2>
          <p className="text-sm leading-relaxed text-zinc-600">
            We never sell your personal data or meal logs to advertisers. If we ever add
            third-party data processors, we will disclose them here.
          </p>
        </section>
      </div>

      <footer className="mt-16 flex flex-col items-center gap-4 border-t border-black/10 pt-12">
        <Link
          href="/login"
          className="focus-ring tap-target flex items-center gap-2 rounded-xl px-3 text-xs font-bold uppercase tracking-widest text-zinc-500 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-400">
          TrackOMacro
        </p>
      </footer>
    </div>
  );
}
