"use client";

import { HISTORY_INSIGHT_ANCHORS } from "@/lib/meals/history-insight-anchors";
import { motion } from "framer-motion";
import { BarChart3, Calendar, History, Scale, TrendingUp } from "lucide-react";

export function TrendsSectionNavigator() {
  const links = [
    { id: HISTORY_INSIGHT_ANCHORS.rollingWeek, label: "Rolling Week", icon: TrendingUp },
    { id: HISTORY_INSIGHT_ANCHORS.weightTrend, label: "Weight", icon: Scale },
    { id: HISTORY_INSIGHT_ANCHORS.weekRecap, label: "Recap", icon: History },
    { id: HISTORY_INSIGHT_ANCHORS.fortnight, label: "14-Day View", icon: BarChart3 },
    { id: HISTORY_INSIGHT_ANCHORS.month, label: "Monthly", icon: Calendar },
  ];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 100; // Account for sticky header
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 mb-8">
      {links.map((link) => (
        <button
          key={link.id}
          onClick={() => scrollToSection(link.id)}
          className="flex shrink-0 items-center gap-2 rounded-full border border-white/5 bg-zinc-900/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-all hover:bg-white/5 hover:text-white active:scale-95"
        >
          <link.icon className="h-3 w-3" />
          {link.label}
        </button>
      ))}
    </div>
  );
}
