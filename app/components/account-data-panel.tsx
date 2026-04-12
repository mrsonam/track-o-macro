"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

export function AccountDataPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    setError(null);
    if (!password.trim()) {
      setError("Enter your password to confirm.");
      return;
    }
    if (!ack) {
      setError("Check the box to confirm you understand this is permanent.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not delete account");
        return;
      }
      await signOut({ redirect: false });
      router.push("/login?deleted=1");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="mt-12 border-t border-stone-200/90 pt-10"
      aria-labelledby="account-data-heading"
    >
      <h2
        id="account-data-heading"
        className="text-sm font-semibold text-stone-900"
      >
        Data &amp; account
      </h2>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-stone-600">
        Calorie Agent is for personal tracking only—not medical advice. See{" "}
        <Link
          href="/privacy"
          className="font-medium text-emerald-800 underline decoration-emerald-800/35 underline-offset-2 hover:decoration-emerald-800"
        >
          Privacy
        </Link>{" "}
        for how we use your data. If you need support around eating disorders,{" "}
        <Link
          href="/resources/eating-disorders"
          className="font-medium text-emerald-800 underline decoration-emerald-800/35 underline-offset-2 hover:decoration-emerald-800"
        >
          these resources
        </Link>{" "}
        may help.
      </p>

      <div className="mt-6 rounded-xl border border-stone-200/90 bg-white/90 p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
          Export
        </p>
        <p className="mt-1 text-sm text-stone-600">
          Download up to 5,000 meals as a CSV (UTF-8). On History you can pick an
          optional local date range; this link exports your most recent rows.
        </p>
        <a
          href="/api/meals/export"
          className="mt-3 inline-flex rounded-xl border border-emerald-200/90 bg-emerald-50/80 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-100/90"
        >
          Download meal history (CSV)
        </a>
      </div>

      <div className="mt-6 rounded-xl border border-red-200/80 bg-red-50/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-900/80">
          Delete account
        </p>
        <p className="mt-2 text-sm leading-relaxed text-red-950/90">
          Permanently removes your profile, meals, saved foods, and favorites.
          This cannot be undone.
        </p>
        {!open ? (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setError(null);
            }}
            className="mt-3 rounded-lg border border-red-300/90 bg-white px-3 py-2 text-sm font-semibold text-red-900 shadow-sm hover:bg-red-50"
          >
            Delete my account…
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-stone-700">
              Current password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                className="input-field mt-1"
              />
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-800">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                disabled={busy}
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-emerald-700"
              />
              <span>
                I understand my account and all stored data will be permanently
                deleted.
              </span>
            </label>
            {error ? (
              <p className="text-sm text-red-800" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void deleteAccount()}
                className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-800 disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Permanently delete account"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  setPassword("");
                  setAck(false);
                  setError(null);
                }}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
