import Link from "next/link";
import { ArrowRight } from "lucide-react";

type CtaSize = "default" | "compact";

export function LandingCtaPrimary({
  href,
  children,
  size = "default",
}: {
  href: string;
  children: React.ReactNode;
  size?: CtaSize;
}) {
  const sizeClass =
    size === "compact" ? "px-4 text-sm" : "px-6 py-3.5 text-sm";

  return (
    <Link
      href={href}
      className={`btn-primary focus-ring tap-target gap-2 ${sizeClass}`}
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}

export function LandingCtaSecondary({
  href,
  children,
  size = "default",
}: {
  href: string;
  children: React.ReactNode;
  size?: CtaSize;
}) {
  const sizeClass =
    size === "compact" ? "px-3 text-sm" : "px-6 py-3.5 text-sm";

  return (
    <Link
      href={href}
      className={`landing-cta-secondary focus-ring tap-target ${sizeClass}`}
    >
      {children}
    </Link>
  );
}

export function LandingCtaOnDark({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="focus-ring tap-target mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#fffdf7] px-8 py-3.5 text-sm font-black text-[#171412] shadow-[0_16px_40px_-18px_rgba(23,20,18,0.45)] transition-[transform,background-color] duration-200 ease-out active:scale-[0.97] hover:bg-white"
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}
