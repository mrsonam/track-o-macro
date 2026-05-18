import type { ReactNode } from "react";
import { Check } from "lucide-react";

type OnboardingChoiceProps = {
  selected: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  onSelect: () => void;
  name: string;
  compact?: boolean;
};

export function OnboardingChoice({
  selected,
  title,
  description,
  children,
  onSelect,
  name,
  compact = false,
}: OnboardingChoiceProps) {
  return (
    <label
      className={`flex cursor-pointer flex-col rounded-2xl border p-4 text-left transition-colors duration-200 sm:p-5 ${
        selected
          ? "border-[color:var(--accent-secondary)]/40 bg-[color:var(--protein-tint)] ring-1 ring-[color:var(--accent-secondary)]/25"
          : "border-black/[0.08] bg-white hover:border-black/15 hover:bg-[color:var(--surface)]/50"
      } ${compact ? "gap-1" : "gap-2"}`}
    >
      <input type="radio" name={name} className="sr-only" checked={selected} onChange={onSelect} />
      <div className="flex items-start justify-between gap-3">
        <span className="font-bold text-[color:var(--foreground)]">{title}</span>
        {selected ? (
          <Check className="h-5 w-5 shrink-0 text-[color:var(--accent-secondary)]" aria-hidden />
        ) : null}
      </div>
      {description ? <span className="text-sm text-zinc-600">{description}</span> : null}
      {children}
    </label>
  );
}
