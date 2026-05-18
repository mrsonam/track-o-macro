import { formatLocalYmd } from "@/lib/meals/local-date";

export function logHrefForDateKey(dateKey: string): string {
  const todayKey = formatLocalYmd(new Date());
  if (dateKey === todayKey) return "/log";
  return `/log?date=${encodeURIComponent(dateKey)}`;
}
