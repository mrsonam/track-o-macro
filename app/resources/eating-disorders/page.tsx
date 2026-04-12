import Link from "next/link";

/**
 * Static resources only — no in-app treatment or diagnosis claims (Epic 9).
 * Organizations and URLs should be verified periodically.
 */
export default function EatingDisordersResourcesPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 py-12 sm:px-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-800/90">
        Support
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
        Eating concerns — outside help
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-stone-700">
        Calorie Agent is not a substitute for medical or mental health care. If
        food, weight, or eating feels overwhelming, reaching out to a
        qualified clinician or a crisis line can help. The links below are
        independent organizations; we are not affiliated with them.
      </p>
      <ul className="mt-8 space-y-5 text-sm text-stone-800">
        <li className="rounded-xl border border-stone-200/90 bg-white/90 p-4 shadow-sm">
          <p className="font-semibold text-stone-900">
            National Eating Disorders Association (NEDA) — USA
          </p>
          <p className="mt-1 text-stone-600">
            Information, screening tools, and provider directory.
          </p>
          <a
            href="https://www.nationaleatingdisorders.org/"
            className="mt-2 inline-block font-medium text-emerald-800 underline decoration-emerald-800/35 underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            nationaleatingdisorders.org
          </a>
        </li>
        <li className="rounded-xl border border-stone-200/90 bg-white/90 p-4 shadow-sm">
          <p className="font-semibold text-stone-900">Crisis Text Line — USA</p>
          <p className="mt-1 text-stone-600">
            Free, 24/7 support via text. Not only for eating disorders — use if
            you need someone to talk to.
          </p>
          <p className="mt-2 font-mono text-xs text-stone-600">
            Text HOME to 741741 (US)
          </p>
          <a
            href="https://www.crisistextline.org/"
            className="mt-2 inline-block font-medium text-emerald-800 underline decoration-emerald-800/35 underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            crisistextline.org
          </a>
        </li>
        <li className="rounded-xl border border-stone-200/90 bg-white/90 p-4 shadow-sm">
          <p className="font-semibold text-stone-900">
            Find local help (international)
          </p>
          <p className="mt-1 text-stone-600">
            Your GP, university counseling, or national health service can
            refer you to dietitians and therapists who specialize in eating
            disorders.
          </p>
        </li>
      </ul>
      <p className="mt-10 text-sm">
        <Link
          href="/login"
          className="font-medium text-emerald-800 underline decoration-emerald-800/35 underline-offset-2"
        >
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}
