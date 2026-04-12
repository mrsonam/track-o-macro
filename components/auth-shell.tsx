import type { ReactNode } from "react";
import { motion } from "framer-motion";

type AuthShellProps = {
  children: ReactNode;
  /** Default `md` (28rem); onboarding uses `lg`. */
  size?: "md" | "lg";
};

export function AuthShell({ children, size = "md" }: AuthShellProps) {
  const max = size === "lg" ? "max-w-xl" : "max-w-md";
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`w-full ${max} relative`}
      >
        <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-br from-emerald-500/20 to-violet-500/10 blur-2xl opacity-50" />
        
        <div className="relative bento-card border-white/5 bg-zinc-900/40 p-8 sm:p-12 shadow-2xl backdrop-blur-3xl overflow-visible">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-24 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
          {children}
        </div>
      </motion.div>
    </div>
  );
}
