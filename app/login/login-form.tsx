"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Lock, PlayCircle } from "lucide-react";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { AuthShell } from "@/components/auth-shell";
import { getSafeNextPath } from "@/lib/auth/safe-next-path";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo/constants";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = getSafeNextPath(searchParams.get("next"));
  const accountDeleted = searchParams.get("deleted") === "1";
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    if (res?.ok) {
      router.push(next);
      router.refresh();
    }
  }

  async function onViewDemo() {
    setDemoError(null);
    setDemoLoading(true);
    const res = await signIn("credentials", {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      redirect: false,
    });
    setDemoLoading(false);
    if (res?.error) {
      setDemoError("Demo account is temporarily unavailable. Please try again shortly.");
      return;
    }
    if (res?.ok) {
      router.push(next);
      router.refresh();
    }
  }

  return (
    <AuthShell title="Sign in" nav="login">
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--protein-tint)] text-[color:var(--accent-secondary)]">
          <Lock className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="mb-3 text-3xl font-black tracking-tight text-[color:var(--foreground)]">
          Sign in
        </h1>
        <p className="max-w-[280px] text-sm font-medium text-zinc-600">
          Log meals, review macros, and pick up where you left off.
        </p>
      </div>

      {accountDeleted ? (
        <div
          role="status"
          aria-live="polite"
          className="mb-8 flex gap-3 rounded-2xl border border-[color:var(--accent-secondary)]/25 bg-[color:var(--protein-tint)] p-4 text-xs font-bold text-[color:var(--accent-secondary)]"
        >
          <p>Your account was deleted. You can create a new one anytime.</p>
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-6"
        aria-busy={loading}
      >
        <label className="flex flex-col gap-2">
          <span className="landing-kicker ml-1 text-zinc-500">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="input-field bg-white py-4"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="landing-kicker ml-1 text-zinc-500">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="input-field bg-white py-4"
          />
        </label>

        {error ? (
          <div
            id={errorId}
            role="alert"
            className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs font-bold text-red-600"
          >
            {error}
          </div>
        ) : null}

        <AuthSubmitButton loading={loading} loadingLabel="Signing in…">
          Sign in
        </AuthSubmitButton>
      </form>

      <div className="mt-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200" />
        <span>or</span>
        <span className="h-px flex-1 bg-zinc-200" />
      </div>

      <button
        type="button"
        onClick={onViewDemo}
        disabled={demoLoading || loading}
        aria-busy={demoLoading}
        className="btn-secondary mt-6 flex w-full items-center justify-center gap-2 py-4 text-sm"
      >
        <PlayCircle className="h-4 w-4 shrink-0" aria-hidden />
        {demoLoading ? "Loading demo…" : "View demo"}
      </button>

      {demoError ? (
        <p role="alert" className="mt-3 text-center text-xs font-bold text-red-600">
          {demoError}
        </p>
      ) : null}

      <div className="mt-12 flex flex-col items-center gap-4">
        <p className="text-xs font-medium text-zinc-500">
          New here?{" "}
          <Link
            href="/signup"
            className="focus-ring font-bold text-[color:var(--foreground)] transition-colors duration-200 hover:text-[color:var(--accent-secondary)]"
          >
            Create account
          </Link>
        </p>

        <Link
          href="/privacy"
          className="focus-ring tap-target rounded-xl px-3 text-xs font-bold uppercase tracking-wider text-zinc-500 transition-colors duration-200 hover:text-[color:var(--foreground)]"
        >
          Privacy
        </Link>
      </div>
    </AuthShell>
  );
}
