import Link from "next/link";

export default function DatabaseUnavailablePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
        Service
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
        Can&apos;t reach the database
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-stone-600">
        The app couldn&apos;t connect to your data store. This is usually a
        temporary network issue, or the database may be paused (for example on
        Supabase free tier).
      </p>
      <p className="mt-4 text-sm leading-relaxed text-stone-600">
        Check that{" "}
        <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[13px]">
          DATABASE_URL
        </code>{" "}
        is correct and the project is running, then try again.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Try again
        </Link>
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
        >
          Supabase dashboard
        </a>
      </div>
    </div>
  );
}
