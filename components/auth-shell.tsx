import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
  /** Default `md` (28rem); onboarding uses `lg`. */
  size?: "md" | "lg";
};

export function AuthShell({ children, size = "md" }: AuthShellProps) {
  const max = size === "lg" ? "max-w-lg" : "max-w-md";
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div
        className={`w-full ${max} rounded-2xl border border-stone-200/80 bg-white/85 p-8 shadow-[0_24px_64px_-24px_rgba(28,25,23,0.18)] backdrop-blur-md`}
      >
        {children}
      </div>
    </div>
  );
}
