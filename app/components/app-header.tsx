"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Activity, ShieldCheck } from "lucide-react";

export function AppHeader() {
  const router = useRouter();

  async function onSignOut() {
    await signOut({ redirect: false });
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/[0.06] bg-[#fbfaf5]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f9d45]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbfaf5]"
          aria-label="TrackOMacro home"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#171412] text-[#eaf7df] shadow-[0_12px_28px_-18px_rgba(23,20,18,0.8)]">
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-lg font-black tracking-tight text-[#171412] sm:block">
            TrackOMacro
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/privacy"
            className="hidden items-center gap-2 rounded-xl border border-[#4f9d45]/20 bg-[#eaf7df] px-3 py-2 text-xs font-bold text-[#356d30] transition-colors duration-200 hover:bg-[#dff1d1] hover:text-[#1f471c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f9d45]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbfaf5] sm:flex"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Privacy
          </Link>
          
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="focus-ring tap-target flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-500"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
