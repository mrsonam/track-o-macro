"use client";

import type { ReactNode } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAppMotion } from "@/lib/motion";

type AuthSubmitButtonProps = {
  loading: boolean;
  loadingLabel: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
};

export function AuthSubmitButton({
  loading,
  loadingLabel,
  children,
  disabled = false,
  className = "",
}: AuthSubmitButtonProps) {
  const { motionOn } = useAppMotion();

  return (
    <button
      type="submit"
      disabled={disabled || loading}
      aria-busy={loading}
      className={`btn-primary mt-2 flex items-center justify-center gap-3 py-5 text-base ${className}`.trim()}
    >
      {loading ? (
        <>
          {motionOn ? (
            <Loader2 className="auth-submit-spinner h-5 w-5 shrink-0" aria-hidden />
          ) : null}
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
        </>
      )}
    </button>
  );
}
