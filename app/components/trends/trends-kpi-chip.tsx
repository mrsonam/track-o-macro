import type { TrendsSectionAccent } from "@/lib/ui/trends-tokens";
import { trendsSectionAccent } from "@/lib/ui/trends-tokens";

type TrendsKpiChipProps = {
  label: string;
  value: string;
  accent?: TrendsSectionAccent;
};

export function TrendsKpiChip({ label, value, accent = "signal" }: TrendsKpiChipProps) {
  const tone = trendsSectionAccent[accent];
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${tone.chip}`}
    >
      <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{label}</p>
      <p className="mt-0.5 font-mono text-base font-black tabular-nums tracking-tight">{value}</p>
    </div>
  );
}
