import Link from "next/link";
import { Database, AlertCircle, RefreshCcw, ExternalLink } from "lucide-react";

export default function DatabaseUnavailablePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-8 py-16">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500">
          <Database className="h-5 w-5" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">
          Network Critical Error
        </p>
      </div>

      <h1 className="text-3xl font-black tracking-tight text-white mb-4">
        Database Link Severed
      </h1>
      
      <p className="text-sm font-medium leading-relaxed text-zinc-500 mb-6">
        The application is unable to establish a secure handshake with your data store. 
        This usually results from temporary network interference or a paused service layer.
      </p>

      <div className="bento-card border-white/5 bg-zinc-900/40 p-6 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="h-3 w-3 text-zinc-400" />
          <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Diagnostic Check</h2>
        </div>
        <p className="text-xs leading-relaxed text-zinc-500">
          Verify the <code className="rounded-md bg-zinc-950 px-2 py-1 font-mono text-zinc-300 border border-white/5">DATABASE_URL</code> 
          configuration and ensure the infrastructure is active.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/"
          className="btn-primary flex items-center justify-center gap-3 px-8 py-4 text-sm"
        >
          <RefreshCcw className="h-4 w-4" />
          Re-initialize Session
        </Link>
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center justify-center gap-3 rounded-2xl border border-white/10 px-8 py-4 text-sm font-bold text-zinc-400 hover:bg-white/5 hover:text-white transition-all"
        >
          Control Panel
          <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </div>

      <p className="mt-12 text-[10px] font-black uppercase tracking-[0.5em] text-zinc-800 text-center">
        Error Log: DB_HANDSHAKE_TIMEOUT
      </p>
    </div>
  );
}
