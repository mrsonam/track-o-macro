"use client";

import { useEffect, useState } from "react";
import { TRENDS_INSIGHT_ANCHORS } from "@/lib/meals/trends-insight-anchors";
import { scrollToTrendsSection } from "@/lib/meals/trends-scroll";
import { trends, trendsSectionAccent } from "@/lib/ui/trends-tokens";
import type { TrendsSectionAccent } from "@/lib/ui/trends-tokens";
import { BarChart3, Calendar, History, Scale, TrendingUp } from "lucide-react";

const SECTION_IDS = [
  TRENDS_INSIGHT_ANCHORS.rollingWeek,
  TRENDS_INSIGHT_ANCHORS.weightTrend,
  TRENDS_INSIGHT_ANCHORS.weekRecap,
  TRENDS_INSIGHT_ANCHORS.fortnight,
  TRENDS_INSIGHT_ANCHORS.month,
] as const;

const links: ReadonlyArray<{
  id: string;
  label: string;
  icon: typeof TrendingUp;
  accent: TrendsSectionAccent;
}> = [
  { id: TRENDS_INSIGHT_ANCHORS.rollingWeek, label: "Rolling week", icon: TrendingUp, accent: "signal" },
  { id: TRENDS_INSIGHT_ANCHORS.weightTrend, label: "Weight", icon: Scale, accent: "neutral" },
  { id: TRENDS_INSIGHT_ANCHORS.weekRecap, label: "Recap", icon: History, accent: "carb" },
  { id: TRENDS_INSIGHT_ANCHORS.fortnight, label: "14 days", icon: BarChart3, accent: "neutral" },
  { id: TRENDS_INSIGHT_ANCHORS.month, label: "Monthly", icon: Calendar, accent: "neutral" },
];

export function TrendsSectionNavigator() {
  const [activeId, setActiveId] = useState<string | null>(TRENDS_INSIGHT_ANCHORS.rollingWeek);

  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-18% 0px -52% 0px", threshold: [0, 0.12, 0.35] },
    );

    for (const el of sections) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={trends.stickyNav}>
      <nav aria-label="Jump to trends sections" className="overflow-x-auto no-scrollbar">
        <div className="flex min-w-max items-center gap-2 pb-0.5">
          {links.map((link) => {
            const isActive = activeId === link.id;
            const tone = trendsSectionAccent[link.accent];
            const Icon = link.icon;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollToTrendsSection(link.id)}
                aria-current={isActive ? "true" : undefined}
                className={`focus-ring tap-target flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors duration-200 ${
                  isActive
                    ? `${tone.chip} shadow-sm`
                    : "border-black/10 bg-white text-zinc-600 hover:border-black/20 hover:bg-warm-neutral hover:text-foreground"
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 ${isActive ? tone.icon : "text-zinc-500"}`}
                  aria-hidden
                />
                {link.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
