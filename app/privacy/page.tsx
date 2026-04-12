import Link from "next/link";
import { 
  ShieldCheck, 
  Database, 
  MessageSquare, 
  Download, 
  HeartPulse, 
  BadgeDollarSign, 
  ArrowLeft,
  ChevronRight,
  Shield,
  BookOpen
} from "lucide-react";
import { motion } from "framer-motion";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <div className="flex flex-col items-start mb-12">
        <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 mb-6">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500 mb-2"> Protocol v1.4</p>
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
          Privacy & Safety
        </h1>
        <p className="mt-6 text-sm leading-relaxed text-zinc-500 max-w-xl">
          Calorie Agent is built on a foundation of data sovereignty. We prioritize clear disclosure of how your biometric and nutritional data is handled.
        </p>
      </div>

      <div className="space-y-6">
        <div className="bento-card bg-emerald-500/5 border-emerald-500/10 p-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Protocol Limitation</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-400">
            This platform is an analytical assistant for general self-tracking. It is <strong className="text-emerald-400">not medical advice</strong>. Always defer to clinical labels and professional guidance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bento-card border-white/5 bg-zinc-900/40 p-8">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 mb-6">
              <Database className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-white mb-4">Registry Storage</h2>
            <ul className="space-y-3 text-xs text-zinc-500 font-medium">
              <li className="flex items-start gap-2">
                <div className="h-1 w-1 rounded-full bg-zinc-700 mt-1.5 shrink-0" />
                <span><strong className="text-zinc-300">Identity:</strong> Email & salted password hashes.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1 w-1 rounded-full bg-zinc-700 mt-1.5 shrink-0" />
                <span><strong className="text-zinc-300">Biometrics:</strong> Onboarding metrics & targets.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1 w-1 rounded-full bg-zinc-700 mt-1.5 shrink-0" />
                <span><strong className="text-zinc-300">Log History:</strong> All meal text, macro totals, and custom foods.</span>
              </li>
            </ul>
          </section>

          <section className="bento-card border-white/5 bg-zinc-900/40 p-8">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 mb-6">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-white mb-4">NLP Transmission</h2>
            <p className="text-xs leading-relaxed text-zinc-500">
              Meal descriptions are synchronized with secure LLM endpoints for nutritional extraction. We do not transmit sensitive secrets—avoid logging PII within meal entries.
            </p>
          </section>
        </div>

        <section className="bento-card border-white/5 bg-zinc-900/40 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-400">
                <Download className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-white">Sovereignty & Deletion</h2>
              <p className="text-xs leading-relaxed text-zinc-500 max-w-sm">
                Personnel maintain 100% data access. Export your full registry or permanently terminate your account from the dashboard settings.
              </p>
            </div>
            <Link 
              href="/login" 
              className="group flex items-center gap-3 text-xs font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              Access Identity Control <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

        <section className="bento-card border-red-500/10 bg-red-500/5 p-8">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 mb-6">
            <HeartPulse className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold text-white mb-4">Safety Resources</h2>
          <p className="text-xs leading-relaxed text-zinc-500 mb-6">
            If you or someone in your network requires support for disordered eating, professional clinical resources are available.
          </p>
          <Link
            href="/resources/eating-disorders"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all"
          >
            Access Safety Registry <ArrowLeft className="h-4 w-4 rotate-180" />
          </Link>
        </section>

        <section className="bento-card border-white/5 bg-zinc-900/40 p-8">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 mb-6">
            <BadgeDollarSign className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold text-white mb-4">Zero Data Monetization</h2>
          <p className="text-xs leading-relaxed text-zinc-500">
            We do not sell personal data. Your progress is isolated within this environment. Any future sub-processors will be disclosed here.
          </p>
        </section>
      </div>

      <footer className="mt-16 pt-12 border-t border-white/5 flex flex-col items-center gap-6">
        <Link href="/login" className="flex items-center gap-2 text-xs font-bold text-zinc-600 hover:text-white transition-colors uppercase tracking-widest">
          <ArrowLeft className="h-4 w-4" /> Initialize Session
        </Link>
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-800">
          Sync Protocol Security v1.4
        </p>
      </footer>
    </div>
  );
}
