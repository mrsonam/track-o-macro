import type { ReactNode } from "react";

/** CSS scroll reveal — always visible; motion is transform-only via view timeline. */
export function LandingReveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`landing-reveal ${className}`.trim()}>{children}</div>;
}

export function LandingRevealGroup({
  children,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "ol";
}) {
  const classes = `landing-reveal-group ${className}`.trim();
  if (as === "ol") {
    return <ol className={classes}>{children}</ol>;
  }
  return <div className={classes}>{children}</div>;
}

export function LandingRevealItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`landing-reveal-item ${className}`.trim()}>{children}</div>;
}
