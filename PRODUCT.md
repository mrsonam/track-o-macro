# Product

## Register

product

Default register for authenticated app surfaces: dashboard, meal log, prepared meals, trends, settings, onboarding. The public marketing landing at `/` is a **brand** surface when designing that route alone; override register per task when the work is landing, signup hero, or long-form resource pages.

## Users

**Who:** Adults who track food intake, from first-time loggers to advanced macro trackers. Many use the app daily on a phone (PWA install) or desktop between meals.

**Context:** Quick sessions at the table, after cooking, or reviewing the week. Ambient light is usually normal indoor daylight or evening kitchen lighting; the UI is light-first and high-contrast for glances, not late-night terminal work.

**Job to be done:** Log what they ate with minimal friction (plain language, search, barcode, prepared batches), see honest nutrition breakdowns, and understand patterns over days without spreadsheet overhead or moralizing copy.

## Product Purpose

TrackOMacro is a Next.js PWA for natural-language meal logging, USDA-backed (and related API) nutrition resolution, calorie and macro tracking, hydration, weight trends, and rolling insights. Success means users trust the numbers enough to log consistently, adjust targets when life changes, and recover after off days without abandoning the tool.

The product is a **research-grade tracking assistant**, not medical care. It emphasizes accuracy with stated uncertainty, actionable weekly feedback, and privacy for weight, photos, and free-text notes.

## Brand Personality

**Three words:** Fresh, precise, calm.

**Voice:** Direct and useful. Encouraging without cheerleading. Neutral about food choices; no guilt, streak shame, or "clean eating" framing. Clinical disclaimers are short and plain ("tracking assistant, not a substitute for medical care").

**Emotional goal:** Confidence that logging is fast and honest; calm focus during review; relief that the UI feels like a nutrition workspace, not a diet billboard.

## Copy and punctuation

Applies to all user-facing writing: UI labels, buttons, errors, onboarding, marketing, help text, and release notes. Agents and designers must follow this when drafting or editing copy.

**Do not use dash punctuation.** Never use em dashes, en dashes, or double hyphens (`--`) to join clauses, add asides, or separate phrases.

| Avoid | Use instead |
|-------|-------------|
| Em dash (—) | Comma, colon, period, or parentheses |
| En dash (–) for ranges or breaks | The word `to`, `from`, `through`, or rewrite |
| Double hyphen (`--`) | Same as em dash; not allowed |

**Allowed:** Hyphens inside standard compound words when the dictionary spells them that way (for example `USDA-backed`, `follow-up`, `sign-in`). Those are word hyphens, not sentence dashes.

**Examples**

- Bad: `Log meals in plain language — see macros for the week.`
- Good: `Log meals in plain language. See macros for the week.`
- Bad: `Ages 13–120`
- Good: `Ages 13 to 120`
- Bad: `Not medical care -- tracking only`
- Good: `Not medical care. Tracking only.`

**Lists in UI:** Prefer short sentences or a colon intro with bullets. Do not use an em dash before a clarifying phrase at the end of a line.

## Anti-references

- **Dark-mode-first fitness dashboards** (neon charts, slate backgrounds, trading-terminal density).
- **Orange-forward calorie apps** (MyFitnessPal-style saturated orange as default accent, focus, and selected state).
- **Generic AI SaaS landing pages** (purple-blue gradients, glass hero blobs, hero-metric template: giant number + gradient label + three stat cards).
- **Wellness pastels with no data hierarchy** (low-contrast gray on beige, decorative illustrations instead of readable macros).
- **Moralizing or gamified diet copy** (streak punishment, "cheat day" language, before/after promises).
- **Medical product positioning** (diagnosis, treatment plans, therapy claims in-product).
- **Nested card stacks and side-stripe alert borders** (layout noise that fights scanning macros).

## Design Principles

1. **Accuracy without obsession:** Show ranges and assumptions where estimates matter; advanced controls exist without blocking beginners.
2. **Task-first layout:** Logging and latest analysis stay above decorative sections; mobile stacks in job order (log, review, context).
3. **Practice what you preach:** Targets and copy match how people actually eat (prepared meals, quick estimates, recovery days).
4. **Trust through restraint:** Green signals progress and focus; amber only for surplus or warning; black ink for primary actions, not rainbow chrome.
5. **Privacy by default:** Sensitive fields (weight, notes) treated carefully in copy and settings; export and account controls discoverable.

## Accessibility & Inclusion

- **Target:** WCAG 2.1 Level AA for text and interactive controls in the core app (4.5:1 body text on warm paper surfaces).
- **Motion:** Respect `prefers-reduced-motion` (landing and product motion already gate animations).
- **Touch:** Minimum ~44px tap targets on primary nav and logging actions.
- **Safety content:** Static eating-disorder and professional-help resources linked where appropriate; no in-app therapy claims.
- **Open for product owner input:** Known color-vision needs, mandatory contrast audits, or locale/i18n requirements beyond English v1.
