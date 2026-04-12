import Link from "next/link";
import { 
  HeartPulse, 
  MessageCircle, 
  Globe, 
  ArrowLeft, 
  ExternalLink,
  ChevronRight,
  ShieldAlert
} from "lucide-react";
import { motion } from "framer-motion";

/**
 * Static resources only — no in-app treatment or diagnosis claims (Epic 9).
 * Organizations and URLs should be verified periodically.
 */
export default function EatingDisordersResourcesPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <div className="flex flex-col items-start mb-12">
        <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 mb-6">
          <HeartPulse className="h-6 w-6" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 mb-2">Safety Support Registry</p>
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
          Eating Concerns
        </h1>
        <p className="mt-6 text-sm leading-relaxed text-zinc-500 max-w-xl">
          Calorie Agent is a tracking assistant, not a clinical solution. If food, weight, or body image feel overwhelming, professional support is the most effective path forward.
        </p>
      </div>

      <div className="space-y-6">
        <div className="bento-card bg-red-500/5 border-red-500/10 p-8 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Protocol Notice</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-400">
            The organizations listed below are independent clinical entities. We are not affiliated with them, but we recognize their leadership in health support.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-6">
          <li className="bento-card border-white/5 bg-zinc-900/40 p-10 group hover:border-emerald-500/20 transition-all">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="h-12 w-12 shrink-0 flex items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                <Globe className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">National Eating Disorders Association (NEDA)</h2>
                <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
                  The primary US resource for screening tools, clinical provider directories, and educational materials.
                </p>
                <a
                  href="https://www.nationaleatingdisorders.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  Visit Registry <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </li>

          <li className="bento-card border-white/5 bg-zinc-900/40 p-10 group hover:border-violet-500/20 transition-all">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="h-12 w-12 shrink-0 flex items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">Crisis Text Line</h2>
                <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
                  Immediate, 24/7 clinical support via encrypted text protocol. Available for any psychological distress.
                </p>
                <div className="p-4 rounded-xl bg-zinc-950 border border-white/5 mb-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Access Command</p>
                  <p className="text-sm font-mono text-zinc-300">Text <span className="text-violet-400">HOME</span> to 741741 (US)</p>
                </div>
                <a
                  href="https://www.crisistextline.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-violet-500 hover:text-violet-400 transition-colors"
                >
                  Secure Access <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </li>

          <li className="bento-card border-white/5 bg-zinc-900/40 p-10">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="h-12 w-12 shrink-0 flex items-center justify-center rounded-2xl bg-zinc-800 text-zinc-500">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">Local & Institutional Help</h2>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Your university counseling center, general practitioner, or national health service (like the NHS) can facilitate professional referrals to specialized dietitians and psychologists.
                </p>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <footer className="mt-16 pt-12 border-t border-white/5 flex flex-col items-center gap-6">
        <Link href="/login" className="flex items-center gap-2 text-xs font-bold text-zinc-600 hover:text-white transition-colors uppercase tracking-widest">
          <ArrowLeft className="h-4 w-4" /> Return to Session
        </Link>
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-800">
          Safety Protocol v1.4
        </p>
      </footer>
    </div>
  );
}
