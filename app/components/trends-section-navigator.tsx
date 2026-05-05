"use client";

import { TRENDS_INSIGHT_ANCHORS } from "@/lib/meals/trends-insight-anchors";
import { BarChart3, Calendar, History, Scale, TrendingUp } from "lucide-react";

export function TrendsSectionNavigator() {
  const links = [
    { id: TRENDS_INSIGHT_ANCHORS.rollingWeek, label: "Rolling Week", icon: TrendingUp },
    { id: TRENDS_INSIGHT_ANCHORS.weightTrend, label: "Weight", icon: Scale },
    { id: TRENDS_INSIGHT_ANCHORS.weekRecap, label: "Recap", icon: History },
    { id: TRENDS_INSIGHT_ANCHORS.fortnight, label: "14-Day View", icon: BarChart3 },
    { id: TRENDS_INSIGHT_ANCHORS.month, label: "Monthly", icon: Calendar },
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
    <div className="mb-8 -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-4 no-scrollbar sm:mx-0 sm:px-0">
      {links.map((link) => (
        <button
          key={link.id}
          onClick={() => scrollToSection(link.id)}
          className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-[10px] font-black uppercase tracking-widest text-zinc-600 transition-colors hover:border-black/20 hover:bg-[#f7f3e9] hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f9d45]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbfaf5] active:scale-95"
        >
          <link.icon className="h-3.5 w-3.5 text-[#4f9d45]" />
          {link.label}
        </button>
      ))}
    </div>
  );
}
