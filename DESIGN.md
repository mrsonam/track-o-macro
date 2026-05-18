---
name: TrackOMacro
description: Bright nutrition workspace on warm paper — ink controls, green signal, label-like macro data.
colors:
  background: "#fbfaf5"
  foreground: "#171412"
  surface: "#fffdf7"
  accent-ink: "#171412"
  accent-ink-hover: "#2a2420"
  signal-green: "#4f9d45"
  protein-tint: "#eaf7df"
  carb-sky: "#dff1ff"
  warm-neutral: "#f7f3e9"
  border-subtle: "rgba(23, 20, 18, 0.1)"
  focus-ring: "rgba(79, 157, 69, 0.42)"
  error: "#ef4444"
typography:
  body:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  label:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.12em"
  data:
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.1
rounded:
  control: "16px"
  card: "24px"
  pill: "32px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent-ink}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "14px 24px"
  button-primary-hover:
    backgroundColor: "{colors.accent-ink-hover}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
  bento-card:
    backgroundColor: "rgba(255, 255, 255, 0.85)"
    textColor: "{colors.foreground}"
    rounded: "{rounded.card}"
    padding: "24px"
  input-field:
    backgroundColor: "#ffffff"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
---

# Design System: TrackOMacro

## Overview

**Creative North Star: "The Kitchen Table Ledger"**

TrackOMacro looks like a bright nutrition workspace on warm paper: subtle grid on the body, white and cream surfaces, black ink for commands, green for "active and on-track," sky tint for hydration and carbs, warm beige for fat and secondary context. Macro blocks read like food labels: compact uppercase labels, large mono numbers, clear tints.

Density is **product-realistic**: two-column dashboard on desktop, single column on mobile, floating bottom nav, sticky translucent header. The landing page at `/` may use slower reveal motion and hero illustration; the logged-in app keeps motion short (150–250ms) and state-driven.

**Key characteristics:**

- Light mode only for core app (`color-scheme: light`).
- Restrained color strategy: tinted neutrals + ink primary actions + green signal (not full-spectrum SaaS accents).
- Bento cards for modules; no nested cards.
- Geist Sans + Geist Mono; Lucide icons.
- Framer Motion for nav indicator and layout transitions; CSS ease-out for press and hover.

**Rejects (from PRODUCT.md):** dark financial dashboards, orange calorie-app chrome, purple gradient AI landings, hero-metric marketing templates, glassmorphism as default decoration.

## Colors

Warm paper neutrals tinted toward ink hue `#171412`; never pure `#000` / `#fff` as large fields (existing tokens are already warm).

### Primary

- **Warm Paper** (`#fbfaf5` / ~oklch(0.99 0.01 95)): App background, `fresh-shell`, landing shell gradient endpoints.
- **Ink Command** (`#171412` / ~oklch(0.22 0.01 55)): Primary buttons (`btn-primary`), floating nav shell, logo mark, default text. Primary *action* color, not decorative fill across the page.

### Secondary

- **Signal Green** (`#4f9d45` / ~oklch(0.62 0.14 142)): Focus rings, selected week days, success, protein emphasis, active nav accents, analyzing pulse dots. The "on track" accent.
- **Input Cream** (`#fffdf7` / ~oklch(0.99 0.01 95)): Elevated surfaces, meal textareas, active nav pill on dark bar.

### Tertiary

- **Protein Mint** (`#eaf7df`): Protein macro panels and green-tinted badges.
- **Hydration Sky** (`#dff1ff`): Carbs, hydration, Apple Health activity panels.
- **Warm Neutral** (`#f7f3e9`): Fat, weight, assumptions, skeleton panels.
- **Surplus Amber** (muted, sparing): Only days over target or warning; never default accent.

### Neutral

- **Foreground** (`#171412`): Body copy, headings.
- **Border Subtle** (`rgba(23, 20, 18, 0.1)`): Cards, inputs, dividers.
- **Zinc secondary text** (Tailwind `zinc-500`–`600`): Supporting labels where contrast still passes AA on white/cream.

### Named Rules

**The Ink vs Green Rule.** Black ink owns primary CTAs and chrome; green owns focus, selection, and positive nutrition signal. Do not swap green onto full-width primary buttons except explicit "active/success" states (`btn-state-active` pattern).

**The Amber Sparingly Rule.** Muted amber appears only for surplus calories or warnings, never for focus rings or default selected UI.

## Typography

**Body font:** Geist Sans (`--font-geist-sans`) with system-ui fallback.

**Data / accent font:** Geist Mono (`--font-geist-mono`) for macro values, tabular numbers where possible.

**Character:** Useful, precise, compact. Headings are heavy (`font-black`) and tight; section labels are 9–11px uppercase with wide tracking; numbers are high-contrast mono.

### Hierarchy

- **Display** (900, ~1.75–2.25rem, tight leading): Page titles, onboarding wordmark, landing hero headlines.
- **Title** (800–900, 1–1.125rem): Card titles, feature headings.
- **Body** (400–500, 0.875–1rem, ~1.5 leading, max ~65–75ch for prose): Descriptions, form help, resource pages.
- **Label** (800, 0.625–0.6875rem, uppercase, tracking ~0.12em): Macro column headers, status chips, dashboard section tags.

### Named Rules

**The Label Rule.** Macro and day-summary UI uses label + mono value pairs; do not use display serifs or decorative fonts in app chrome.

## Elevation

Depth is **soft paper shadow + border**, not Material elevation stacks. Surfaces sit on `#fbfaf5` with a faint 28px grid on `body`.

### Shadow vocabulary

- **Control** (`0 16px 32px -18px rgba(23, 20, 18, 0.65)`): Primary buttons.
- **Bento** (`0 18px 60px -38px rgba(23, 20, 18, 0.42)`): `.bento-card`, dashboard modules.
- **Floating nav** (`0 24px 70px -28px rgba(23, 20, 18, 0.8)`): Bottom navigation bar.

### Named Rules

**The Hover Lift Rule.** Cards and primary buttons may translate Y -1px to -2px on hover with pointer fine; never scale in ways that reflow layout. Press uses `scale(0.97)` on `.motion-press` / `.btn-primary` with reduced-motion override.

**Glass is exceptional.** `.glass-pane` and landing header blur are allowed for sticky chrome; do not blanket the dashboard in glass cards.

## Components

### Buttons

- **Shape:** `rounded-2xl` (16px), bold weight on primary.
- **Primary (`.btn-primary`):** Ink background, white text, shadow control level; hover lifts 1px and darkens to `#2a2420`; focus visible green ring with cream offset.
- **Ghost (`.btn-ghost`):** Transparent, zinc text, hover `black/5` fill.
- **Active state:** Green fill `#4f9d45` white text when indicating selected/success tool state.

### Cards / containers

- **`.bento-card`:** White 85% fill, `rounded-3xl`, subtle border, bento shadow; hover border darken + 2px lift (desktop); `focus-within` green border tint.
- **`.fresh-shell`:** Page shell gradient over warm paper for authenticated routes.
- **No nested bento cards.** Use full-width sections or tinted bands between modules.

### Inputs / fields

- **`.input-field` / `.form-field`:** White fill, `rounded-2xl`, `border-black/10`; focus border and ring use signal green at 15–25% opacity.
- **`.focus-ring`:** Shared focus-visible utility (green ring + offset on cream background).

### Navigation

- **App header:** Sticky, translucent cream, black wordmark, compact status links.
- **Floating nav:** Dark ink pill (`#171412`), cream active pill with `layoutId` spring indicator; icons only with `sr-only` labels; hide when barcode overlay open.

### Signature: Latest analysis / macro grid

White main panel; green icon badge; neutral calorie tile; protein (green tint), carbs (sky), fat (warm neutral); assumptions in warm neutral band. Matches food-label scanning, not chart junk.

### Motion (product)

- **Easing:** `cubic-bezier(0.23, 1, 0.32, 1)` (`--ease-out`, `EASE_OUT`) for UI; avoid bounce/elastic in product chrome.
- **Durations:** ~160ms press, 200–220ms hovers, 320–420ms modals/reveals (`lib/motion/tokens.ts`).
- **Landing (`/`):** `landing-motion-ready` class gates hero fades, orb drift, ring spins; all suppressed under `prefers-reduced-motion`.

## Copy (user-facing text)

Match `PRODUCT.md` → **Copy and punctuation**. Do not use em dashes, en dashes, or `--` in UI or marketing copy. Use commas, colons, periods, or parentheses. Use `to` for ranges (not `–`).

## Do's and Don'ts

**Do**

- Use Lucide icons consistently.
- Keep tap targets at least 44px on nav and primary logging actions.
- Show visible focus states on all interactive elements.
- Use green for focus, selection, protein, and success.
- Stack mobile layouts in task order: log → review → context.
- Skeleton loading for dashboard/trends, not spinners over content.

**Don't**

- Default the core app to dark mode or slate/purple gradients.
- Use saturated orange as primary, focus, or selected color.
- Add hero-metric marketing blocks inside `/dashboard` or tools.
- Nest cards or add colored left borders as alert chrome.
- Use gradient text, emoji icons, or decorative motion without state meaning.
- Hide core logging behind marketing sections or modals when inline works.
- Use em dashes, en dashes, or `--` in user-facing copy (see **Copy** above).
