"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AuthShell } from "@/components/auth-shell";
import { 
  UserPlus, 
  Shield, 
  Zap, 
  Info, 
  ArrowRight, 
  CheckCircle2,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
      setError("Authorization required. Acknowledge the registry disclaimer.");
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
        setError(data.error ?? "Registry initialization failed");
        setLoading(false);
        return;
      }

      const sign = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (sign?.error) {
        setError("Account initialized. Manual sign-in required.");
        setLoading(false);
        return;
      }
      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("Network sync error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell size="lg">
      <div className="flex flex-col items-center text-center mb-10">
        <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 mb-6 relative">
          <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-xl scale-75" />
          <UserPlus className="h-7 w-7 relative" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500 mb-3">
          New Entry Initialization
        </p>
        <h1 className="text-3xl font-black tracking-tight text-white mb-3">
          Establish Account
        </h1>
        <p className="text-sm text-zinc-500 font-medium max-w-sm">
          Join the network to synchronize meals across your entire biometric stack.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Email Identifier</span>
            <input
              type="email"
              autoComplete="email"
              required
              placeholder="agent@network.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field py-4 bg-zinc-950"
            />
          </label>
          
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Access Protocol</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              placeholder="Min. 6 chars"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field py-4 bg-zinc-950"
            />
          </label>
        </div>

        <div className="rounded-[1.5rem] bg-zinc-950/80 border border-white/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Registry Disclaimer</h3>
          </div>
          
          <p className="text-[11px] leading-relaxed text-zinc-600">
            TrackOMacro is a research-grade assistant, <strong className="text-zinc-400">not a substitute for medical care</strong>. By proceeding, you acknowledge this is not for medical diagnosis or treatment.
          </p>

          <label className="flex items-start gap-3 cursor-pointer group mt-2">
            <div className="relative flex items-center mt-0.5">
              <input
                type="checkbox"
                checked={acceptedDisclaimer}
                onChange={(e) => setAcceptedDisclaimer(e.target.checked)}
                className="peer h-5 w-5 rounded-md border-white/10 bg-zinc-900 text-emerald-500 transition-all checked:bg-emerald-500 focus:ring-emerald-500/20"
                required
              />
              <CheckCircle2 className="absolute h-3 w-3 text-zinc-950 left-1 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
            </div>
            <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-300 transition-colors pt-0.5">
              I acknowledge the privacy protocols and clinical limitations.
            </span>
          </label>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-red-500 text-xs font-bold">
            <Shield className="h-4 w-4" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !acceptedDisclaimer}
          className="btn-primary flex items-center justify-center gap-3 py-5 text-base mt-2"
        >
          {loading ? (
             <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
               <Zap className="h-5 w-5 text-zinc-950" />
             </motion.div>
          ) : (
            <>
              Initialize Account
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-12 flex flex-col gap-4 items-center">
        <p className="text-xs text-zinc-500 font-medium">
          Registered personnel?{" "}
          <Link
            href="/login"
            className="text-white hover:text-emerald-400 transition-colors font-bold"
          >
            Authorize Session
          </Link>
        </p>
        
        <div className="flex items-center gap-4 mt-2">
          <Link
            href="/privacy"
            className="text-[10px] font-black uppercase tracking-widest text-zinc-700 hover:text-zinc-500 transition-colors"
          >
            Privacy
          </Link>
          <div className="h-1 w-1 rounded-full bg-zinc-800" />
          <Link
            href="/resources/eating-disorders"
            className="text-[10px] font-black uppercase tracking-widest text-zinc-700 hover:text-zinc-500 transition-colors"
          >
            Safety
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
