import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 py-12 sm:px-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-800/90">
        Calorie Agent
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
        Privacy &amp; safety
      </h1>
      <div className="mt-6 space-y-5 text-sm leading-relaxed text-stone-700">
        <p>
          This page is a plain-language overview for early users. Before a
          public launch, have counsel review a full privacy policy and terms of
          service for your jurisdiction.
        </p>

        <section>
          <h2 className="text-base font-semibold text-stone-900">
            Not medical advice
          </h2>
          <p className="mt-2">
            Calorie Agent estimates nutrition from descriptions you provide. It
            does not diagnose, treat, or prevent any medical condition. Always
            follow your clinician&apos;s guidance and packaged food labels.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-900">
            What we store
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>Account:</strong> email and a password hash (never your
              plain password).
            </li>
            <li>
              <strong>Profile:</strong> onboarding and settings you save (e.g.
              height, goals, dietary preferences).
            </li>
            <li>
              <strong>Meals:</strong> free-text meal descriptions, parsed line
              items, and totals for your history.
            </li>
            <li>
              <strong>My foods:</strong> custom foods you define in Settings.
            </li>
            <li>
              <strong>Favorites:</strong> saved meal templates you create.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-900">
            How meal text is used
          </h2>
          <p className="mt-2">
            Descriptions may be sent to third-party services you configure
            (for example, an OpenAI-compatible API or nutrition providers) to
            parse ingredients and estimate calories. Do not paste secrets or
            highly sensitive health information you are not comfortable storing.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-900">
            Export &amp; deletion
          </h2>
          <p className="mt-2">
            While signed in, you can download your meal history as CSV from{" "}
            <strong>Settings → Data &amp; account</strong> (same export as
            History). You can permanently delete your account there; your data is
            removed from our database and cannot be recovered.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-900">
            Eating disorders &amp; support
          </h2>
          <p className="mt-2">
            If you or someone you know needs help with disordered eating, see{" "}
            <Link
              href="/resources/eating-disorders"
              className="font-medium text-emerald-800 underline decoration-emerald-800/35 underline-offset-2 hover:decoration-emerald-800"
            >
              resources we link to
            </Link>
            . Calorie Agent is not a substitute for professional care.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-900">
            Selling data
          </h2>
          <p className="mt-2">
            We do not sell your personal information. Update this section when
            you add analytics, advertising, or subprocessors so users know who
            sees their data.
          </p>
        </section>

        <p className="pt-2">
          <Link
            href="/login"
            className="font-medium text-emerald-800 underline decoration-emerald-800/35 underline-offset-2 hover:decoration-emerald-800"
          >
            Back to sign in
          </Link>
          {" · "}
          <Link
            href="/signup"
            className="font-medium text-emerald-800 underline decoration-emerald-800/35 underline-offset-2 hover:decoration-emerald-800"
          >
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
