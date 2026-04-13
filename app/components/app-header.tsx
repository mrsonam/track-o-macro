"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Activity, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export function AppHeader() {
  const router = useRouter();

  async function onSignOut() {
    await signOut({ redirect: false });
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.05] bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          aria-label="TrackOMacro home"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/20">
            <Activity className="h-5 w-5 text-zinc-950" />
          </div>
          <span className="text-lg font-black tracking-tight text-white sm:block">
            TrackOMacro
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/privacy"
            className="hidden items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-400 transition-colors duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:flex"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Privacy
          </Link>
          
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="focus-ring tap-target flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-400"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
