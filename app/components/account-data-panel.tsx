"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { 
  Download, 
  Trash2, 
  ShieldCheck, 
  Lock, 
  AlertTriangle, 
  ExternalLink,
  ChevronRight,
  Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
      setError("Authorization required. Enter password.");
      return;
    }
    if (!ack) {
      setError("Safety protocol not acknowledged.");
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
        setError(data.error ?? "Authentication failed");
        return;
      }
      await signOut({ redirect: false });
      router.push("/login?deleted=1");
      router.refresh();
    } catch {
      setError("Network sync failure");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Privacy and Disclosure */}
      <section className="rounded-3xl bg-zinc-950 p-8 border border-white/5 shadow-inner">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold text-white">Trust & Compliance</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-zinc-500">
              TrackOMacro is a research-grade tracking tool. Data is stored securely and used only for analysis within your profile.
            </p>
            <Link 
              href="/privacy" 
              className="flex items-center gap-2 text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              Protocol Privacy Statement <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          
          <div className="rounded-2xl bg-zinc-900/50 p-6 border border-white/5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Support Registry</h4>
            <p className="text-xs text-zinc-600 mb-4 italic">
              Health is holistic. If you need support regarding dietary habits, professional resources are available.
            </p>
            <Link 
              href="/resources/eating-disorders" 
              className="group flex items-center justify-between text-xs font-bold text-white hover:text-emerald-500 transition-colors"
            >
              Access Resources <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Export Section */}
      <section className="bento-card bg-zinc-900/40 p-1 ring-1 ring-white/5">
        <div className="p-8">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <Download className="h-4 w-4 text-emerald-500" />
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Data Extraction</h4>
            </div>
            <span className="text-[10px] font-bold text-zinc-700">v1.2 CSV FORMAT</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <p className="text-sm text-zinc-400 leading-relaxed max-w-md">
              Extract up to 5,000 recent entries in a standard UTF-8 CSV package. Compatible with all major analytical software.
            </p>
            <a
              href="/api/meals/export"
              className="flex items-center justify-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-4 rounded-2xl text-sm font-bold transition-all shadow-xl"
            >
              <Download className="h-4 w-4" />
              Download Payload
            </a>
          </div>
        </div>
      </section>

      {/* Destructive Actions */}
      <section className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Danger Zone</h4>
        </div>

        {!open ? (
          <div>
            <p className="text-sm text-red-950/40 dark:text-red-400/60 leading-relaxed mb-6">
              Account termination protocol is permanent. This will erase all profiles, histories, and custom ingredient registries.
            </p>
            <button
              onClick={() => { setOpen(true); setError(null); }}
              className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-red-500 hover:text-red-400 p-2 -ml-2 transition-colors"
            >
              Initiate Account Deletion <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <label className="flex flex-col gap-2">
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-900/60 transition-colors">
                  <Lock className="h-3 w-3" /> Authorization Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  className="w-full rounded-2xl bg-zinc-950 px-5 py-4 text-white focus:ring-1 focus:ring-red-500 outline-none border border-red-500/20"
                />
              </label>

              <div className="flex flex-col justify-end">
                <label className="flex cursor-pointer items-start gap-4 p-4 rounded-2xl border border-red-500/10 hover:bg-red-500/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={ack}
                    onChange={(e) => setAck(e.target.checked)}
                    disabled={busy}
                    className="mt-1 h-5 w-5 rounded border-red-500/50 text-red-600 focus:ring-red-500 bg-transparent"
                  />
                  <span className="text-xs font-bold text-red-900/80 leading-tight">
                    I acknowledge that data recovery is impossible once this process finishes.
                  </span>
                </label>
              </div>
            </div>

            {error && (
              <p className="text-xs font-black uppercase text-red-500 flex items-center gap-2">
                 <Shield className="h-3 w-3" /> {error}
              </p>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => void deleteAccount()}
                disabled={busy}
                className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-2xl text-sm font-bold shadow-2xl transition-all disabled:opacity-50"
              >
                {busy ? "Terminating..." : "Terminate Account"}
              </button>
              <button
                onClick={() => { setOpen(false); setPassword(""); setAck(false); setError(null); }}
                className="bg-zinc-800 text-white px-8 py-4 rounded-2xl text-sm font-bold hover:bg-zinc-700 transition-colors"
                disabled={busy}
              >
                Abort
              </button>
            </div>
          </motion.div>
        )}
      </section>
    </div>
  );
}
