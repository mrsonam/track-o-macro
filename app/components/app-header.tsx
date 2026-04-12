"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, User, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export function AppHeader() {
  const router = useRouter();

  async function onSignOut() {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.05] bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-3 transition-all hover:opacity-90"
          aria-label="Calorie Agent home"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-lime-400 p-[1px] shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
            <div className="flex h-full w-full items-center justify-center rounded-[15px] bg-zinc-950">
              <Sparkles className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white sm:text-base">
              Calorie Agent
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-emerald-500/80">
              Premium Intelligence
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/privacy"
            className="hidden items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-400 transition-all hover:bg-white/10 hover:text-white sm:flex"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Privacy
          </Link>
          
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-all hover:bg-red-500/10 hover:text-red-400"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
