export function SettingsPageSkeleton() {
  return (
    <div className="space-y-12">
      <section>
        <div className="mb-6 h-7 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="space-y-4 rounded-3xl border border-white/[0.06] bg-zinc-950/40 p-6">
          <div className="h-10 w-full animate-pulse rounded-xl bg-zinc-900/80" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-zinc-900/80" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-zinc-900/80" />
        </div>
      </section>
      <section>
        <div className="mb-6 h-7 w-56 animate-pulse rounded bg-zinc-800" />
        <div className="h-48 animate-pulse rounded-3xl bg-zinc-900/50" />
      </section>
      <section>
        <div className="mb-6 h-7 w-52 animate-pulse rounded bg-zinc-800" />
        <div className="h-32 animate-pulse rounded-3xl bg-zinc-900/50" />
      </section>
    </div>
  );
}
