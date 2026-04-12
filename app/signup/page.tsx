"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AuthShell } from "@/components/auth-shell";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!acceptedDisclaimer) {
      setError("Please confirm the disclaimer below.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          acceptedDisclaimer: true,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not create account");
        setLoading(false);
        return;
      }

      const sign = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (sign?.error) {
        setError("Account created. Please sign in.");
        setLoading(false);
        return;
      }
      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800/90">
        Join
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
        Create account
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        One account syncs your meals across devices. Next we&apos;ll set up how
        you like to track.
      </p>
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
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200/90 bg-stone-50/60 p-3 text-sm leading-relaxed text-stone-800">
          <input
            type="checkbox"
            checked={acceptedDisclaimer}
            onChange={(e) => setAcceptedDisclaimer(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-emerald-700"
            required
          />
          <span>
            I understand Calorie Agent is{" "}
            <strong>not medical advice</strong> and is not for diagnosing,
            treating, or preventing any disease. I will talk to a qualified
            professional for pregnancy, diabetes medications, eating disorders,
            or other medical concerns.             I have read the{" "}
            <Link
              href="/privacy"
              className="font-semibold text-emerald-800 underline decoration-emerald-800/35 underline-offset-2"
            >
              Privacy summary
            </Link>
            .
          </span>
        </label>
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading || !acceptedDisclaimer}
          className="btn-primary mt-1 w-full"
        >
          {loading ? "Creating…" : "Sign up"}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-stone-600">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-emerald-800 underline decoration-emerald-800/30 underline-offset-2 hover:decoration-emerald-800"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
