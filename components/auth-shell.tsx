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
        <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-br from-[#4f9d45]/15 to-sky-500/10 opacity-45 blur-2xl" />
        
        <div className="bento-card relative overflow-visible border-black/[0.08] bg-white/88 p-8 shadow-2xl backdrop-blur-3xl sm:p-12">
          <div className="absolute left-1/2 top-0 h-[2px] w-24 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#4f9d45]/60 to-transparent" />
          {children}
        </div>
      </motion.div>
    </div>
  );
}
