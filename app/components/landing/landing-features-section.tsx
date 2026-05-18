import { features } from "./landing-content";
import { LandingFeatureRow } from "./landing-feature-row";
import { LandingReveal, LandingRevealGroup, LandingRevealItem } from "./landing-reveal";

export function LandingFeaturesSection() {
  return (
    <section
      id="features"
      className="landing-section mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24"
      aria-labelledby="landing-features-heading"
    >
      <LandingReveal className="mb-12 max-w-2xl">
        <p className="landing-kicker">Built for daily logging</p>
        <h2
          id="landing-features-heading"
          className="mt-3 text-3xl font-black tracking-tight sm:text-4xl"
        >
          Precision that stays out of your way.
        </h2>
      </LandingReveal>

      <div className="landing-rule mb-10 h-px max-w-xs bg-black/[0.06]" aria-hidden />

      <LandingRevealGroup className="divide-y divide-black/[0.08] rounded-[1.75rem] border border-black/[0.08] bg-white/60">
        {features.map((f, index) => (
          <LandingRevealItem key={f.title}>
            <LandingFeatureRow
              icon={f.icon}
              title={f.title}
              body={f.body}
              index={index}
            />
          </LandingRevealItem>
        ))}
      </LandingRevealGroup>
    </section>
  );
}
