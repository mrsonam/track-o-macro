import type { steps } from "./landing-content";

export function LandingStepRow({ step }: { step: (typeof steps)[number] }) {
  return (
    <li className="landing-reveal-item flex gap-4">
      <span className="font-mono text-sm font-black tabular-nums text-[color:var(--accent-secondary)]">
        {step.n}
      </span>
      <div>
        <p className="font-bold text-[color:var(--foreground)]">{step.label}</p>
        <p className="mt-1 text-sm leading-relaxed text-zinc-600">{step.detail}</p>
      </div>
    </li>
  );
}
