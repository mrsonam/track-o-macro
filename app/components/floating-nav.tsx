"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, Home, Plus, Settings, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { navLayoutTransition } from "@/lib/motion";

const sideLinks = [
  { href: "/dashboard", icon: Home, label: "Today" },
  { href: "/prepared-meals", icon: ChefHat, label: "Prepared meals" },
  { href: "/trends", icon: TrendingUp, label: "Trends" },
  { href: "/settings", icon: Settings, label: "Settings" },
] as const;

export function FloatingNav() {
  const pathname = usePathname();
  const [hideNavForOverlay, setHideNavForOverlay] = useState(false);

  useEffect(() => {
    const sync = () =>
      setHideNavForOverlay(
        document.body.dataset.overlayOpen === "1" ||
          document.body.dataset.barcodeOverlayOpen === "1",
      );
    sync();
    window.addEventListener("overlay-change", sync);
    window.addEventListener("barcode-overlay-change", sync);
    return () => {
      window.removeEventListener("overlay-change", sync);
      window.removeEventListener("barcode-overlay-change", sync);
    };
  }, []);

  if (hideNavForOverlay) return null;

  const logActive = pathname === "/log" || pathname.startsWith("/log/");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-6 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 px-4"
    >
      <nav
        className="relative flex items-end justify-between gap-1 rounded-[2rem] border border-black/10 bg-[#171412] px-2 pb-2 pt-3 shadow-[0_24px_70px_-28px_rgba(23,20,18,0.8)]"
        aria-label="Main"
      >
        {sideLinks.slice(0, 2).map((link) => (
          <NavIconLink
            key={link.href}
            link={link}
            pathname={pathname}
          />
        ))}

        <Link
          href="/log"
          aria-current={logActive ? "page" : undefined}
          className="focus-ring tap-target group relative -mt-7 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-[#171412] bg-[#4f9d45] text-white shadow-[0_16px_40px_-12px_rgba(79,157,69,0.85)] transition-colors duration-200 hover:bg-[#449339]"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} aria-hidden />
          <span className="sr-only">Log meal</span>
        </Link>

        {sideLinks.slice(2).map((link) => (
          <NavIconLink
            key={link.href}
            link={link}
            pathname={pathname}
          />
        ))}
      </nav>
    </motion.div>
  );
}

function NavIconLink({
  link,
  pathname,
}: {
  link: (typeof sideLinks)[number];
  pathname: string;
}) {
  const isActive =
    pathname === link.href || pathname.startsWith(`${link.href}/`);
  const Icon = link.icon;

  return (
    <Link
      href={link.href}
      aria-current={isActive ? "page" : undefined}
      className={`focus-ring tap-target relative flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-200 ${
        isActive
          ? "text-[#171412]"
          : "text-white/55 hover:bg-white/10 hover:text-white"
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="active-nav"
          className="absolute inset-0 rounded-2xl bg-[#fbfaf5]"
          transition={navLayoutTransition}
        />
      )}
      <Icon className="relative z-10 h-6 w-6" aria-hidden />
      <span className="sr-only">{link.label}</span>
    </Link>
  );
}
