/** Branded Suspense fallback for auth routes using search params. */
export function AuthPageFallback() {
  return (
    <div className="fresh-shell flex min-h-dvh flex-col">
      <header className="w-full px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:px-6" aria-hidden>
        <div className="landing-header-bar mx-auto flex h-14 max-w-6xl animate-pulse items-center justify-between px-4 sm:h-16">
          <div className="h-9 w-32 rounded-xl bg-[color:var(--warm-neutral)]" />
          <div className="h-9 w-28 rounded-2xl bg-[color:var(--warm-neutral)]" />
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center p-4">
        <div
          className="w-full max-w-md animate-pulse rounded-3xl border border-black/[0.08] bg-white/95 p-8 sm:p-12"
          aria-hidden
        >
          <div className="mx-auto mb-6 h-14 w-14 rounded-2xl bg-[color:var(--warm-neutral)]" />
          <div className="mx-auto mb-8 h-8 w-48 rounded-lg bg-[color:var(--warm-neutral)]" />
          <div className="space-y-6">
            <div className="h-12 rounded-2xl bg-[color:var(--warm-neutral)]" />
            <div className="h-12 rounded-2xl bg-[color:var(--warm-neutral)]" />
            <div className="h-14 rounded-2xl bg-[color:var(--warm-neutral)]" />
          </div>
        </div>
        <p className="sr-only">Loading sign-in</p>
      </div>
    </div>
  );
}
