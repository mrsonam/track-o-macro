export function OnboardingLoading() {
  return (
    <div className="fresh-shell flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div
          className="mx-auto mb-6 h-12 w-12 animate-pulse rounded-2xl bg-[color:var(--protein-tint)]"
          aria-hidden
        />
        <p className="text-sm font-medium text-zinc-600">Loading your setup…</p>
      </div>
    </div>
  );
}
