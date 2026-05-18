"use client";

import { createContext, useContext } from "react";
import type { RollingWeekSummaryData } from "@/app/components/rolling-week-summary-body";
import type { IntelligenceBriefData } from "@/app/components/trends-intelligence-brief";

export type TrendsRecapState = {
  wins: string[];
  friction: string[];
  hadMeals: boolean;
  quietWeek: boolean;
};

export type TrendsInsightsContextValue = {
  online: boolean;
  loading: boolean;
  error: string | null;
  rolling7: RollingWeekSummaryData | null;
  brief: IntelligenceBriefData | null;
  recap: TrendsRecapState;
};

const TrendsInsightsContext = createContext<TrendsInsightsContextValue | null>(null);

export function useTrendsInsights(): TrendsInsightsContextValue | null {
  return useContext(TrendsInsightsContext);
}

export const TrendsInsightsContextProvider = TrendsInsightsContext.Provider;
