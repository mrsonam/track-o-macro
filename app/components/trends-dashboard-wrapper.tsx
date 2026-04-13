"use client";

import { useEffect, useState } from "react";
import { rolling7WindowBoundsIso } from "@/lib/meals/local-date";
import { TrendsIntelligenceBrief, type IntelligenceBriefData } from "./trends-intelligence-brief";
import { TrendsSectionNavigator } from "./trends-section-navigator";
import { useOnline } from "@/lib/meals/use-online";
import { useMealsSyncTick } from "@/lib/meals/use-meals-sync-tick";

type TrendsDashboardWrapperProps = {
  dailyTargetKcal: number | null;
};

export function TrendsDashboardWrapper({ dailyTargetKcal }: TrendsDashboardWrapperProps) {
  const [data, setData] = useState<IntelligenceBriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const online = useOnline();
  const syncTick = useMealsSyncTick();

  useEffect(() => {
    async function load() {
      if (!online) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { fromIso, toIso } = rolling7WindowBoundsIso();
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const q = new URLSearchParams({
          from: fromIso,
          to: toIso,
          timeZone,
          windowDays: "7"
        });
        const res = await fetch(`/api/meals/insights?${q}`);
        if (res.ok) {
          const json = await res.json();
          
          // Calculate consistency score (logs / window days)
          const score = Math.round((json.daysWithLogs / json.daysInWindow) * 100);
          
          setData({
            daysWithLogs: json.daysWithLogs,
            avgKcal: json.averages.kcalPerDay,
            targetKcal: dailyTargetKcal,
            weekendDrift: json.drifts.weekendAvgKcal != null && json.drifts.weekdayAvgKcal != null 
              ? json.drifts.weekendAvgKcal - json.drifts.weekdayAvgKcal 
              : null,
            lateEatingPercent: null, // Could add if needed
            consistencyScore: score,
          });
        }
      } catch (e) {
        console.error("Brief load error", e);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [online, syncTick, dailyTargetKcal]);

  return (
    <>
      <TrendsSectionNavigator />
      <TrendsIntelligenceBrief data={data} loading={loading} />
    </>
  );
}
