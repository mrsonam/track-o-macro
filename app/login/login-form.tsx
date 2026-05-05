"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AuthShell } from "@/components/auth-shell";
import { Shield, Zap, Info, ArrowRight, Lock } from "lucide-react";
import { motion } from "framer-motion";

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
      <div className="flex flex-col items-center text-center mb-10">
        <div className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf7df] text-[#4f9d45]">
          <div className="absolute inset-0 scale-75 rounded-2xl bg-[#4f9d45]/20 blur-xl" />
          <Lock className="h-7 w-7 relative" />
        </div>
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.4em] text-[#4f9d45]">
          Agent Registry
        </p>
        <h1 className="mb-3 text-3xl font-black tracking-tight text-[#171412]">
          Initialize Session
        </h1>
        <p className="max-w-[280px] text-sm font-medium text-zinc-600">
          Synchronize your profile with the TrackOMacro analytics network.
        </p>
      </div>

      {accountDeleted && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex gap-3 text-xs font-bold text-emerald-500"
        >
          <Info className="h-4 w-4 shrink-0" />
          <p>Personnel record termination complete. A new account may be initialized.</p>
        </motion.div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <label className="flex flex-col gap-2">
          <span className="ml-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">Email Identifier</span>
          <input
            type="email"
            autoComplete="email"
            required
            placeholder="agent@network.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field bg-white py-4"
          />
        </label>
        
        <label className="flex flex-col gap-2">
          <span className="ml-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">Access Protocol</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field bg-white py-4"
          />
        </label>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-red-500 text-xs font-bold">
            <Shield className="h-4 w-4" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex items-center justify-center gap-3 py-5 text-base mt-2"
        >
          {loading ? (
             <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
               <Zap className="h-5 w-5 text-zinc-950" />
             </motion.div>
          ) : (
            <>
              Authorize Session
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-12 flex flex-col gap-4 items-center">
        <p className="text-xs font-medium text-zinc-500">
          New personnel?{" "}
          <Link
            href="/signup"
            className="font-bold text-[#171412] transition-colors hover:text-[#4f9d45]"
          >
            Initialize Account
          </Link>
        </p>
        
        <Link
          href="/privacy"
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-[#171412]"
        >
          Privacy Protocol <Info className="h-3 w-3" />
        </Link>
      </div>
    </AuthShell>
  );
}
