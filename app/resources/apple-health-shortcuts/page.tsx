import Link from "next/link";
import { Activity, ArrowLeft, BookOpen, Shield } from "lucide-react";

/**
 * User + developer reference for Apple Health → Shortcuts → Track-o-Macro ingestion.
 */
export default function AppleHealthShortcutsResourcePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <Link
        href="/settings"
        className="mb-10 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-cyan-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </Link>

      <div className="mb-10 flex flex-col items-start">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
          <Activity className="h-6 w-6" />
        </div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.35em] text-cyan-500/80">
          Automation registry
        </p>
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
          Apple Health via Shortcuts
        </h1>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-zinc-500">
          Send Health samples to Track-o-Macro with a simple POST. Your data is
          deduplicated, merged into the same 7-day dashboard as meals, and weight
          samples can mirror into your weight log automatically.
        </p>
      </div>

      <section className="mb-12 space-y-4 rounded-3xl border border-white/5 bg-zinc-900/30 p-8">
        <div className="flex items-center gap-2 text-white">
          <Shield className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-bold uppercase tracking-widest">
            Security
          </h2>
        </div>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-400">
          <li>
            Create a sync token in Settings → Automation. Treat it like a password:
            anyone with the token can post metrics for your account.
          </li>
          <li>
            Revoke tokens you no longer use. The server stores only a hash of the
            token, not the plaintext.
          </li>
          <li>
            Authenticate with{" "}
            <code className="rounded bg-zinc-950 px-1 py-0.5 text-xs text-cyan-100">
              Authorization: Bearer &lt;token&gt;
            </code>{" "}
            or header{" "}
            <code className="rounded bg-zinc-950 px-1 py-0.5 text-xs text-cyan-100">
              X-Track-O-Macro-Sync-Token
            </code>
            .
          </li>
        </ul>
      </section>

      <section className="mb-12 space-y-6">
        <div className="flex items-center gap-2 text-white">
          <BookOpen className="h-4 w-4 text-cyan-400" />
          <h2 className="text-lg font-bold">Developer reference</h2>
        </div>

        <div className="rounded-2xl border border-white/5 bg-zinc-950/40 p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">
            Endpoint
          </h3>
          <pre className="mt-3 overflow-x-auto text-xs text-cyan-100">
            POST /api/health/apple/sync
          </pre>
          <p className="mt-2 text-xs text-zinc-500">
            Full URL: your app origin + path above (shown in Settings).
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-zinc-950/40 p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">
            JSON body
          </h3>
          <pre className="mt-3 overflow-x-auto text-xs leading-relaxed text-zinc-300">
{`{
  "source": "apple_health_shortcuts",
  "device": "iphone",
  "sentAt": "2026-04-22T22:15:00.000Z",
  "samples": [
    {
      "type": "steps",
      "value": 8421,
      "unit": "count",
      "recordedAt": "2026-04-22T12:00:00.000Z",
      "externalId": "optional-healthkit-id",
      "metadata": {}
    },
    {
      "type": "active_energy",
      "value": 480,
      "unit": "kcal",
      "recordedAt": "2026-04-22T12:00:00.000Z"
    }
  ]
}`}
          </pre>
          <p className="mt-3 text-xs text-zinc-500">
            Supported <code className="text-zinc-400">type</code> values include:{" "}
            <code className="text-zinc-400">steps</code>,{" "}
            <code className="text-zinc-400">active_energy</code>,{" "}
            <code className="text-zinc-400">resting_energy</code>,{" "}
            <code className="text-zinc-400">weight</code>,{" "}
            <code className="text-zinc-400">body_fat</code>,{" "}
            <code className="text-zinc-400">workout</code> (use{" "}
            <code className="text-zinc-400">kcal</code> or{" "}
            <code className="text-zinc-400">min</code> as <code>unit</code>),{" "}
            <code className="text-zinc-400">exercise_minutes</code>,{" "}
            <code className="text-zinc-400">stand_hours</code>,{" "}
            <code className="text-zinc-400">distance</code>,{" "}
            <code className="text-zinc-400">sleep</code>,{" "}
            <code className="text-zinc-400">heart_rate</code>. Aliases like{" "}
            <code className="text-zinc-400">step_count</code> map to canonical names.
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-zinc-950/40 p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">
            Response
          </h3>
          <pre className="mt-3 overflow-x-auto text-xs text-zinc-300">
{`{
  "success": true,
  "ingested": 8,
  "duplicates": 2,
  "errors": []
}`}
          </pre>
          <p className="mt-3 text-xs text-zinc-500">
            Partial success: some rows may ingest while others return validation
            errors with an <code className="text-zinc-400">index</code> into{" "}
            <code className="text-zinc-400">samples</code>. Retries with the same{" "}
            <code className="text-zinc-400">externalId</code> or fingerprint are
            counted as duplicates, not double-stored.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-lg font-bold text-white">Shortcut setup (iOS)</h2>
        <ol className="list-decimal space-y-4 pl-5 text-sm leading-relaxed text-zinc-400">
          <li>
            In Track-o-Macro web → Settings → Automation, create a sync token and
            copy it.
          </li>
          <li>
            Open the Shortcuts app → new shortcut. Add{" "}
            <strong className="text-zinc-200">Get Health Samples</strong> (type +
            date range you want).
          </li>
          <li>
            Add <strong className="text-zinc-200">Repeat with Each</strong> on the
            samples list.
          </li>
          <li>
            Inside the loop, add <strong className="text-zinc-200">Dictionary</strong>{" "}
            with keys: <code className="text-zinc-300">type</code>,{" "}
            <code className="text-zinc-300">value</code>,{" "}
            <code className="text-zinc-300">unit</code>,{" "}
            <code className="text-zinc-300">recordedAt</code> — map from the Health
            sample fields (use ISO 8601 strings for <code>recordedAt</code>).
          </li>
          <li>
            After the loop, add <strong className="text-zinc-200">Dictionary</strong>{" "}
            for the wrapper: <code className="text-zinc-300">source</code> ={" "}
            <code className="text-cyan-200">apple_health_shortcuts</code>,{" "}
            <code className="text-zinc-300">device</code> ={" "}
            <code className="text-cyan-200">iphone</code>,{" "}
            <code className="text-zinc-300">sentAt</code> = current date (ISO),{" "}
            <code className="text-zinc-300">samples</code> = collected list.
          </li>
          <li>
            Add <strong className="text-zinc-200">Get Contents of URL</strong>: URL =
            your POST endpoint, Method = POST, Headers include your auth header and{" "}
            <code className="text-zinc-300">Content-Type: application/json</code>,
            Request Body = the wrapper dictionary (Shortcuts serializes to JSON).
          </li>
        </ol>
        <p className="text-xs text-zinc-600">
          Apply database migrations (for example{" "}
          <code className="text-zinc-400">npx prisma migrate dev</code> or your hosted
          migration pipeline) so <code className="text-zinc-400">health_samples</code>
          , <code className="text-zinc-400">health_sync_tokens</code>, and weight log
          columns exist before calling the API.
        </p>
      </section>
    </div>
  );
}
