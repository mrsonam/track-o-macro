# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Calorie PWA
**Updated:** 2026-05-05
**Category:** AI Nutrition Tracking PWA
**Design Direction:** Fresh food-table analytics

---

## Visual Thesis

TrackOMacro should feel like a bright nutrition workspace laid over a clean kitchen table: white and warm-paper surfaces, black utility controls, green as the active signal, sky blue for hydration/carbs, and only muted amber for warning or surplus states.

The app is not a dark financial dashboard. It is a calm, high-signal food logging tool with dense but readable data.

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| App Background | `#fbfaf5` | `--background` |
| Foreground / Ink | `#171412` | `--foreground` |
| Primary Action | `#171412` | `--accent` |
| Primary Hover | `#2a2420` | `--accent-hover` |
| Active Signal | `#4f9d45` | `--accent-secondary` |
| Green Tint | `#eaf7df` | `--color-protein-surface` |
| Green Hover | `#dff1d1` | `--color-green-hover` |
| Sky Tint | `#dff1ff` | `--color-carb-surface` |
| Warm Neutral | `#f7f3e9` | `--color-warm-neutral` |
| Input Surface | `#fffdf7` | `--surface` |
| Border | `rgba(23, 20, 18, 0.1)` | `--border-subtle` |
| Focus Ring | `rgba(79, 157, 69, 0.42)` | `--ring-focus` |
| Error | `#ef4444` | `--color-error` |

**Color Notes:**

- Black is the primary command color.
- Green is the default accent for active, focus, protein, success, and selected standard states.
- Sky blue supports hydration, carbs, and Apple Health activity.
- Warm neutral beige supports fat, weight, assumptions, skeletons, and secondary panels.
- Avoid saturated orange as a default accent. Use amber only for surplus, warning, or exceeded-target states.
- Never make the interface read as one-note orange, brown, purple, or dark slate.

### Typography

- **Body Font:** Geist Sans via `--font-geist-sans`
- **Data / Heading Accent:** Geist Mono via `--font-geist-mono`
- **Mood:** useful, precise, fresh, compact, food-aware
- **Headings:** heavy, tight, mostly black
- **Labels:** 9-11px uppercase with high weight and generous tracking
- **Numbers:** mono, tabular where possible, high contrast

Do not return to Fira Code/Fira Sans unless the implementation changes first.

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Card padding |
| `--space-xl` | `32px` / `2rem` | Section gaps |
| `--space-2xl` | `48px` / `3rem` | Major vertical rhythm |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 8px 24px -18px rgba(23,20,18,0.35)` | Small controls |
| `--shadow-md` | `0 18px 60px -38px rgba(23,20,18,0.42)` | Standard bento surfaces |
| `--shadow-lg` | `0 24px 70px -42px rgba(23,20,18,0.55)` | Feature panels |
| `--shadow-xl` | `0 30px 90px -50px rgba(23,20,18,0.65)` | Popovers and modals |

---

## Component Specs

### Buttons

```css
.btn-primary {
  background: #171412;
  color: #ffffff;
  border-radius: 16px;
  padding: 14px 24px;
  font-weight: 900;
  box-shadow: 0 16px 32px -18px rgba(23, 20, 18, 0.65);
  transition: transform 200ms ease, background-color 200ms ease, box-shadow 200ms ease;
}

.btn-primary:hover {
  background: #2a2420;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #ffffff;
  color: #171412;
  border: 1px solid rgba(23, 20, 18, 0.1);
  border-radius: 16px;
  padding: 10px 16px;
  font-weight: 800;
}

.btn-state-active {
  background: #4f9d45;
  color: #ffffff;
}
```

Use Lucide icons in icon buttons. Prefer icon-only controls with labels/tooltips where the action is familiar.

### Cards And Panels

```css
.bento-card {
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(23, 20, 18, 0.08);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 18px 60px -38px rgba(23, 20, 18, 0.42);
}
```

- Cards should be used for repeated items, active tools, modals, and data modules.
- Do not nest cards inside cards.
- Use full-width bands or unframed layout for page sections.
- Hover states may change border or background. Avoid scale transforms that move layout.

### Inputs

```css
.input-field {
  background: #ffffff;
  color: #171412;
  border: 1px solid rgba(23, 20, 18, 0.1);
  border-radius: 16px;
  padding: 12px 16px;
}

.input-field:focus {
  border-color: rgba(79, 157, 69, 0.6);
  box-shadow: 0 0 0 4px rgba(79, 157, 69, 0.15);
  outline: none;
}
```

Large meal textareas can use `#fffdf7` and 24px radius.

### Home Dashboard

- First screen is the working dashboard, not a marketing hero.
- Use a sticky translucent light header over `#fbfaf5`.
- The main layout is a two-column dashboard on desktop and a single column on mobile.
- Macro and analysis surfaces should look like food labels: compact labels, large mono values, clear tints.
- Latest Analysis uses:
  - white main panel
  - green icon badge
  - neutral calorie card
  - green protein card
  - sky carbs card
  - warm-neutral fat card
  - warm-neutral assumptions area
- Week day selection uses green for selected normal days and muted amber only for surplus days.
- Body Composition uses warm neutral, not yellow/orange.

### Navigation

- Header: light, translucent, sticky, black logo mark, green privacy/status accent.
- Floating nav: compact, high contrast, black active surface.
- Tap targets must stay at least 44px.

### Status Colors

| State | Color Treatment |
|-------|-----------------|
| Success / selected / active | Green `#4f9d45` |
| Protein | Green tint `#eaf7df` |
| Hydration / carbs / activity | Sky tint `#dff1ff` |
| Fat / weight / assumptions | Warm neutral `#f7f3e9` |
| Surplus / warning | Muted amber only |
| Error | Red `#ef4444` |

---

## Style Guidelines

**Style:** Light food-table dashboard

**Keywords:** fresh, clean, compact, nutrition label, kitchen table, AI meal receipt, high-contrast numbers, warm paper, green signal, restrained chrome

**Best For:** Meal logging, calorie tracking, macro review, hydration, weight tracking, daily coaching

**Key Effects:** soft paper shadows, subtle hover fills, Framer Motion layout transitions, crisp focus rings, compact status chips

### Page Pattern

**Pattern Name:** Operational Nutrition Workspace

- **Primary job:** help the user log food and understand the latest analysis quickly.
- **CTA Placement:** primary action at the end of the active logging form.
- **Section Order:** 1. Day summary, 2. week strip, 3. log meal, 4. latest analysis, 5. body/context panels, 6. recent activity/templates.
- **Mobile rule:** stack in task order. Do not hide core logging controls behind decorative sections.

---

## Anti-Patterns

- Dark mode default for the core app
- Saturated orange as primary, focus, or selected state
- Purple-blue gradient dominance
- Decorative blobs, orbs, or bokeh backgrounds
- Cards inside cards
- Hero/landing-page composition on dashboard screens
- Low-contrast gray text on warm surfaces
- Layout-shifting hover transforms
- Emojis as icons
- Invisible focus states
- Text explaining the design inside the product UI

---

## Pre-Delivery Checklist

Before delivering UI code, verify:

- [ ] Orange appears only as muted warning/surplus amber, not as a default accent.
- [ ] Green is the active/focus/success color.
- [ ] Latest Analysis matches the white, green, sky, warm-neutral macro system.
- [ ] Light mode contrast meets 4.5:1 for body text.
- [ ] All icons are from Lucide or the established icon set.
- [ ] Buttons and icon controls have at least 44px tap targets.
- [ ] Hover states do not shift layout.
- [ ] Focus states are visible.
- [ ] Responsive layouts work at 375px, 768px, 1024px, and 1440px.
- [ ] No content is hidden behind sticky header or floating nav.
- [ ] No horizontal scroll on mobile.
