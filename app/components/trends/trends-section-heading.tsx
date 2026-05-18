import type { LucideIcon } from "lucide-react";
import {
  trendsSectionAccent,
  type TrendsSectionAccent,
} from "@/lib/ui/trends-tokens";

type TrendsSectionHeadingProps = {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  accent?: TrendsSectionAccent;
};

export function TrendsSectionHeading({
  id,
  title,
  description,
  icon: Icon,
  accent = "neutral",
}: TrendsSectionHeadingProps) {
  const tone = trendsSectionAccent[accent];

  return (
    <header className="mb-5 min-w-0">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white shadow-sm ${tone.icon}`}
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            id={id}
            className={`text-[10px] font-black uppercase tracking-[0.32em] ${tone.label}`}
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-600">{description}</p>
          ) : null}
        </div>
        <div
          className={`hidden h-px min-w-[2rem] flex-1 bg-gradient-to-r sm:block ${tone.rule} to-transparent`}
          aria-hidden
        />
      </div>
    </header>
  );
}
