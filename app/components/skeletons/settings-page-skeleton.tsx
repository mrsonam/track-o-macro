export function SettingsPageSkeleton() {
  return (
    <div className="space-y-12">
      <section>
        <div className="mb-6 h-7 w-48 animate-pulse rounded bg-zinc-200" />
        <div className="space-y-4 rounded-3xl border border-black/10 bg-white/85 p-6">
          <div className="h-10 w-full animate-pulse rounded-xl bg-zinc-100" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-zinc-100" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-zinc-100" />
        </div>
      </section>
      <section>
        <div className="mb-6 h-7 w-56 animate-pulse rounded bg-zinc-200" />
        <div className="h-48 animate-pulse rounded-3xl border border-black/10 bg-white/80" />
      </section>
      <section>
        <div className="mb-6 h-7 w-52 animate-pulse rounded bg-zinc-200" />
        <div className="h-32 animate-pulse rounded-3xl border border-black/10 bg-white/80" />
      </section>
    </div>
  );
}
