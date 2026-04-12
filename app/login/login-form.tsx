"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AuthShell } from "@/components/auth-shell";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const accountDeleted = searchParams.get("deleted") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <AuthShell>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800/90">
        Welcome back
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
        Sign in
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        Log meals in plain language—calories from USDA-backed data when
        possible.
      </p>
      {accountDeleted ? (
        <p
          className="mt-4 rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-950"
          role="status"
        >
          Your account and data have been deleted. You can create a new account
          anytime.
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-stone-800">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-stone-800">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />
        </label>
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary mt-1 w-full"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-stone-600">
        No account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-emerald-800 underline decoration-emerald-800/30 underline-offset-2 hover:decoration-emerald-800"
        >
          Create one
        </Link>
      </p>
      <p className="mt-4 text-center text-xs text-stone-500">
        <Link
          href="/privacy"
          className="font-medium text-emerald-800/80 underline decoration-emerald-800/25 underline-offset-2 hover:text-emerald-900"
        >
          Privacy &amp; safety
        </Link>
      </p>
    </AuthShell>
  );
}
