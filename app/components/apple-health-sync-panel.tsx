"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Copy, KeyRound, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/app/components/confirm-dialog";

type TokenRow = {
  id: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

export function AppleHealthSyncPanel() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<TokenRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/health/sync-token", {
        credentials: "same-origin",
      });
      const j = (await res.json().catch(() => ({}))) as {
        tokens?: TokenRow[];
        error?: string;
      };
      if (!res.ok) {
        setError(j.error ?? "Could not load tokens");
        return;
      }
      setTokens(Array.isArray(j.tokens) ? j.tokens : []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createToken() {
    setBusy(true);
    setError(null);
    setNewToken(null);
    try {
      const res = await fetch("/api/health/sync-token", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim() || null,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        token?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(j.error ?? "Could not create token");
        return;
      }
      if (typeof j.token === "string") {
        setNewToken(j.token);
        setLabel("");
        await load();
      }
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function executeRevoke() {
    const id = revokeTarget?.id;
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/health/sync-token?id=${encodeURIComponent(id)}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Could not revoke");
        setRevokeTarget(null);
        return;
      }
      setRevokeTarget(null);
      await load();
    } catch {
      setError("Network error");
      setRevokeTarget(null);
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="bento-card border border-black/10 bg-white/95 p-6 sm:p-8">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-carb-sky text-sky-800">
          <Activity className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-black tracking-tight text-foreground">
            Apple Health (Shortcuts)
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Automate sending steps, active energy, sleep, and more from the Health
            app via an iPhone Shortcut. Data merges into your daily dashboard next to
            meals and hydration.
          </p>
          <Link
            href="/resources/apple-health-shortcuts"
            className="focus-ring tap-target mt-3 inline-flex cursor-pointer text-xs font-bold text-sky-800 underline-offset-4 transition-colors duration-200 hover:text-sky-950 hover:underline"
          >
            Shortcut setup guide
          </Link>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      {newToken ? (
        <div className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
          <p className="text-xs font-bold text-amber-200/90">
            Copy this token now. It is only shown once. Paste it into your Shortcut
            header (see guide).
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="block flex-1 break-all rounded-xl border border-black/10 bg-[#fffdf7] px-3 py-2 text-xs text-zinc-800">
              {newToken}
            </code>
            <button
              type="button"
              onClick={() => void copy(newToken)}
              className="focus-ring tap-target inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-bold text-zinc-800 hover:bg-[#f7f3e9]"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>
        </div>
      ) : null}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
            Label (optional)
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Morning automation"
            className="mt-1 w-full rounded-xl border border-black/10 bg-[#fffdf7] px-4 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-500 focus:border-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            maxLength={120}
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void createToken()}
          className="focus-ring tap-target inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-40"
        >
          <KeyRound className="h-4 w-4" />
          New sync token
        </button>
      </div>

      <div className="mb-4 rounded-xl border border-black/10 bg-[#f7f3e9] p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
          Endpoint (POST JSON)
        </p>
        <code className="mt-2 block text-xs text-zinc-700">
          {origin || "https://your-domain"}/api/health/apple/sync
        </code>
      </div>

      <div>
        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">
          Active tokens
        </p>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No tokens yet. Create one for your Shortcut.
          </p>
        ) : (
          <ul className="space-y-2">
            {tokens.map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-2 rounded-xl border border-black/10 bg-[#fffdf7] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-bold text-zinc-950">
                    {t.label ?? "Unlabeled token"}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    Created {new Date(t.createdAt).toLocaleString()}
                    {t.lastUsedAt
                      ? ` · Last used ${new Date(t.lastUsedAt).toLocaleString()}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRevokeTarget(t)}
                  className="focus-ring tap-target inline-flex items-center gap-2 self-start rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/10 sm:self-center"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={revokeTarget != null}
        title="Revoke sync token?"
        description={
          revokeTarget ? (
            <>
              Shortcuts using{" "}
              <span className="font-semibold text-zinc-800">
                {revokeTarget.label ?? "this token"}
              </span>{" "}
              will stop working until you create a new token and update your Shortcut.
            </>
          ) : null
        }
        confirmLabel="Revoke"
        cancelLabel="Cancel"
        variant="danger"
        busy={busy}
        onCancel={() => {
          if (!busy) setRevokeTarget(null);
        }}
        onConfirm={() => void executeRevoke()}
      />
    </div>
  );
}
