"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Settings, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function FloatingNav() {
  const pathname = usePathname();
  const [hideNavForBarcodeOverlay, setHideNavForBarcodeOverlay] = useState(false);

  useEffect(() => {
    const sync = () =>
      setHideNavForBarcodeOverlay(
        document.body.dataset.barcodeOverlayOpen === "1",
      );
    sync();
    window.addEventListener("barcode-overlay-change", sync);
    return () => window.removeEventListener("barcode-overlay-change", sync);
  }, []);

  const links = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/trends", icon: TrendingUp, label: "Trends" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  if (hideNavForBarcodeOverlay) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4 w-full max-w-md">
      <motion.nav 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-around gap-2 rounded-[2rem] border border-black/10 bg-[#171412] p-2 shadow-[0_24px_70px_-28px_rgba(23,20,18,0.8)]"
      >
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
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
                  transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                />
              )}
              <Icon className="relative z-10 h-6 w-6" />
              <span className="sr-only">{link.label}</span>
            </Link>
          );
        })}
      </motion.nav>
    </div>
  );
}
