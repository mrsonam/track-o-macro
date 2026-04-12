"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, History, Settings, Plus, User } from "lucide-react";
import { motion } from "framer-motion";

export function FloatingNav() {
  const pathname = usePathname();

  const links = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/history", icon: History, label: "History" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4 w-full max-w-md">
      <motion.nav 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-around gap-2 rounded-3xl glass-pane p-2 shadow-2xl"
      >
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all ${
                isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute inset-0 rounded-2xl bg-zinc-800"
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
