import type { ReactNode } from "react";
import { AuthNav, type AuthNavVariant } from "@/components/auth/auth-nav";

type AuthShellProps = {
  children: ReactNode;
  size?: "md" | "lg" | "split";
  /** Accessible name for the auth landmark (e.g. "Sign in", "Create account"). */
  title: string;
  /** Which auth page — drives navbar alternate action. */
  nav: AuthNavVariant;
  /** Optional left column (signup value prop). */
  aside?: ReactNode;
};

const maxWidth = {
  md: "max-w-md",
  lg: "max-w-xl",
  split: "max-w-7xl",
} as const;

export function AuthShell({ children, size = "md", title, nav, aside }: AuthShellProps) {
  const max = maxWidth[size];

  return (
    <div className="fresh-shell flex min-h-dvh flex-col">
      <AuthNav variant={nav} />
      <main
        id="main"
        aria-label={title}
        className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:py-12"
      >
        <div className={`w-full ${max}`}>
          {aside ? (
            <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
              {aside}
              <div className="bento-card border-black/[0.08] bg-white/95 p-6 sm:p-8 lg:p-10">
                {children}
              </div>
            </div>
          ) : (
            <div className="bento-card border-black/[0.08] bg-white/95 p-8 sm:p-12">{children}</div>
          )}
        </div>
      </main>
    </div>
  );
}
