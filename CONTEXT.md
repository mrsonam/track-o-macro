# Calorie PWA — product context & epic backlog

Persistent reference for scope, priorities, and epic-by-epic planning. Update this file as decisions land.

---

## North-star principles

- **Accuracy without obsession**: logging that is fast *and* honest about uncertainty.
- **Actionable feedback**: not only totals—patterns, tradeoffs, next steps.
- **Sustainability**: streaks that do not shame; recovery after off days.
- **Trust & safety**: avoid medical claims; support professional referrals when appropriate.
- **Privacy by design**: especially weight, photos, and free-text notes.

---

## Epic 1 — Onboarding & personalization

**Goal:** Set users up for targets and habits that fit *their* life, not a generic calorie number.

**Audience (locked in):** **Everyone** — from first-time loggers to **advanced macro trackers**. The UX must support **progressive depth**: defaults that work for beginners, with an explicit **“Advanced”** path that exposes grams, macro splits, and manual overrides without cluttering the simple path.

### Design principles for dual audience

- **One funnel, two depths:** Start with 4–6 quick questions; offer **“Customize targets”** / **“I track macros”** for power users.
- **No false precision:** Show **ranges** and explain that TDEE estimates are starting points; advanced users can enter known maintenance or set custom calories/macros.
- **Reversible:** All targets editable later from settings; onboarding never traps users in wrong numbers.
- **Tone:** Encouraging, neutral, non-moralizing. Avoid medical claims; position as self-tracking support.

### Decisions (Epic 1 v1)


| Topic     | Decision                                                                                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screening | **Lifestyle-only** onboarding (goals, activity, preferences). **No** medical intake, diagnoses, or treatment advice in v1. Short disclaimer + “talk to a professional” for pregnancy, ED, diabetes meds, etc. (ties to Epic 9). |
| Targets   | Calories + protein emphasis for everyone; **optional** carb/fat split for advanced. Fiber as optional “nice to have” target.                                                                                                    |
| Weight    | Optional during onboarding (user can skip). If entered, use only for **trend** language, not daily judgment copy.                                                                                                               |


### Out of scope for Epic 1 first ship

- Integrations (Apple Health, Google Fit, step sync).
- Barcode / meal photo required for signup.
- Coach chat or AI beyond what the product already does for logging.
- Household or multi-user profiles.

### Success metrics (Epic 1)

- **Completion:** % of new accounts that finish onboarding (target: benchmark after launch).
- **Time to complete:** median under ~2–3 minutes on the simple path.
- **Advanced path:** % who open advanced options (healthy signal for macro users).
- **Support burden:** few “how do I change my calories?” tickets after week one (settings discoverability).

### Backlog — stories (implementation order suggested)

1. **Onboarding entry & resume**
  - After sign-up / first login, redirect to `/onboarding` if profile incomplete.
  - Persist step progress (local + server profile) so refresh does not reset.
2. **Experience level (beginner vs advanced)**
  - Single question: “How do you usually track?” → *Just getting started* / *I know my macros* / *Somewhere in between*.
  - Gates copy and which steps appear next (advanced sees macro split + manual TDEE optional).
3. **Goal intent**
  - Options: lose fat (gentle / moderate), maintain, gain muscle / lean bulk — each with plain-language explanation.
  - Optional weekly rate for loss/gain (ranges, not obsessive precision).
4. **Body & activity (optional fields)**
  - Sex (for Mifflin-St Jeor if we use it), age, height, weight — all skippable with “Prefer not to say” where appropriate.
  - Activity level: sedentary → very active (definitions on the same screen).
5. **Target derivation (transparent)**
  - Show estimated maintenance range + suggested calorie target as a **range** or rounded number with “~” and short “how we estimated” expandable.
  - **Advanced:** override calories; set protein g/lb or g/kg; optional carb/fat % or gram caps.
6. **Food & preference profile**
  - Dietary pattern (omnivore, vegetarian, vegan, etc.) — affects defaults/tips later, not judgment.
  - Allergies / avoid list (optional, multi-select).
  - Cuisine familiarity or cooking level (optional) for future recipe/meal ideas.
7. **Logging style**
  - Quick estimates vs weigh most things vs mixed — sets expectations for Epic 2 UI (portion controls).
8. **Safety & consent**
  - Checkbox or screen: not medical advice; minimum age if required by policy; link to privacy.
  - One-tap “I need help with eating disorders” → static resources (no in-app therapy claims).
9. **Finish & landing**
  - Summary card: your targets + “You can change this anytime in Settings.”
  - Deep link to first log or home.

### Data model note (for implementation)

- Store onboarding answers in a `**user_profile`** (or `profiles`) table keyed by `user_id`, with JSON for flexible fields or normalized columns for goals/macros.
- Keep **source of truth** for targets in DB so Epic 4–5 can read the same fields.

### Epic 1 — implementation status (slice 1)

**Shipped:**

- Prisma model `UserProfile` → table `user_profiles` (`user_id`, `onboarding_completed_at`, `onboarding_step`, `draft`, timestamps).
- SQL migration: `supabase/migrations/20250410000000_user_profiles.sql` (RLS: users manage own row).
- `GET` / `PATCH` `/api/profile` — authenticated upsert; `complete: true` sets `onboarding_completed_at`.
- `/onboarding` wizard (welcome → experience → goal → summary) with **resume** from saved `onboarding_step` + `draft`.
- **Auth:** NextAuth (credentials) + Prisma `users` (email + password hash). No `NEXT_PUBLIC_SUPABASE_*` env vars.
- **Onboarding gate:** `(main)` layout redirects incomplete profiles to `/onboarding`; `POST /api/meals/analyze` still checks onboarding server-side.

**You must apply the migration** to Supabase (or run `prisma db push` against your DB) before onboarding persists.

### Epic 1 — slice 2 (shipped)

- **Height, weight, age, sex, activity** collected in onboarding; **Mifflin–St Jeor** BMR → TDEE (activity multipliers) → **goal-adjusted daily target kcal** (lose −400 / maintain / gain +300 vs TDEE).
- `UserProfile` stores `height_cm`, `weight_kg`, `age`, `sex`, `activity_level`, `goal_intent`, `bmr_kcal`, `tdee_kcal`, `target_kcal`.
- Onboarding steps: welcome → experience → goal → **metrics** → **activity** → **review** (preview) → **done** (summary) → complete.
- `**/settings`**: edit metrics + goal; **PATCH `/api/profile`** recalculates targets when all fields present.
- Home shows **daily target** pill when `target_kcal` is set.

### Epic 1 — slice 3 (shipped)

- **Stories 6–7 (food profile + logging style):** Onboarding step **preferences** (after activity, before safety): dietary pattern, optional comma-separated **avoid / allergies** text (normalized server-side, max 15 × 48 chars), logging style (quick estimates / weigh often / mixed). Persisted as `logging_style`, `dietary_pattern`, `food_avoid_json` on `user_profiles`; mirrored in draft during onboarding.
- **Settings:** same fields editable under “Food & logging”; defaults for legacy rows (`quick_estimates`, `prefer_not_say`).
- **Home log:** one-line blurb from `loggingStyle` via `loggingStyleBlurb()` in `lib/profile/preferences.ts`.
- **Step migration:** `onboardingFlowVersion` in draft + `migrateOnboardingStepIndex(..., draft)` shifts indices 5–7 by +1 when upgrading into the 9-step flow.
- **Still optional / future (not blocking “Epic 1” closure):** fully **skippable** body metrics, **fiber** target, **carb/fat %** for advanced, **minimum age** gate if policy requires, passing avoid-list into **analyze** prompt.

---

## Epic 2 — Logging core (speed + reliability)

**Goal:** Logging in **10–20 seconds**, repeatable daily.

- Natural-language meal logging (aligned with current product direction).
- Recent foods, favorites, templates, multi-item meals.
- Portion UX: household units, grams; optional hand-size guides (clearly labeled as estimates).
- Edit / delete past meals (from History).
- Offline-first logging queue (PWA strength).

**Review questions:** Voice logging in scope? Barcode scanning later?

### Epic 2 — implementation status

**Shipped (core logging v1):**

- **Natural-language logging** — `POST /api/meals/analyze`; line items + totals stored on `meals` / `meal_line_items`.
- **Home — Recent meals** (last 5): snippet, kcal, time, **Log again** (prefill via `log-prefill`); `router.refresh()` after successful analyze.
- **Saved meals (favorites)** — CRUD via `/api/saved-meals`; named templates with one-tap log on home.
- **Quick repeat** — Starter phrases + device-local “My phrases” (`lib/meals/quick-repeat-snippets.ts`); append to the meal box.
- **History** (`/history`) — Search; **Edit** + recalc (`PATCH /api/meals/[id]`); **Delete**; **Log again** (prefill home). No duplicate/split from History (UI removed).
- **History — offline** — Banner when offline; **Log again** still navigates home with prefilled text. Filters, export, edit, delete need network.
- **CSV export** — `GET /api/meals/export` (up to 5,000 rows, UTF-8 BOM); **Export CSV** on history.
- **Offline-first queue (home log)** — IndexedDB queue (`lib/meals/analyze-queue.ts`), background sync / flush when online.

**Shipped (Epic 2 — portion UX + composer copy):**

- `**PORTION_QUICK_SNIPPETS`** in `lib/meals/portion-hints.ts` — tap-to-append lines on home **Free** mode (grams/cups examples).
- `**MealPortionHints`** — surfaced on the home log card; copy is utility-first (“rough averages — not label-accurate”).
- **Composer (`MealItemComposer`)** — labels: “Remove” / “Add row”; helper text explains rows → plain text for analyze.

**Shipped (Epic 2 — History edit + composer layout):**

- **History → Edit** — **Free** (textarea) and **Build** (`MealItemComposer`) toggle; switching modes merges text ↔ rows (`seedComposerRowsFromRawInput` / `composerRowsToRawInput`). Save sends the same `rawInput` to `PATCH /api/meals/[id]` as before.
- **Composer mobile** — rows stack vertically on small screens; amount/unit in a 2-column grid; **Remove** is full-width on mobile; slightly larger `text-base` inputs on touch (`sm:text-sm` on larger breakpoints).

**Backlog / out of v1 (still under Epic 2 themes):**

- **Portion UX** — Deeper: per-ingredient gram pickers, barcode, photo (beyond shortcuts + reference table).
- **Multi-item “composer”** — Optional: History edit layout tweaks beyond current stack, or barcode / photo flows.
- **Voice / barcode** — See review questions above.

**Epic 2 closure:** Treat **core logging + reliability (home offline queue) + history maintenance** as the shipped slice. The bullets in the Epic 2 goal list above remain the north star; what is not listed under **Shipped** is explicitly **not** closed.

---

## Epic 3 — Food database, sources & confidence

**Goal:** Reduce garbage-in with transparent sourcing.

- USDA-backed resolution + source badges.
- Confidence scoring when estimates are used.
- User-created foods + edits with versioning.
- Duplicate handling and merge rules when sources conflict.

**Review questions:** Non-USDA regions? Crowdsourced moderation model?

### Epic 3 — implementation status

**Shipped (Epic 3 complete for v1 scope):**

- **Resolver** — `ResolvedLine` uses `source: "fdc" | "estimate" | "custom"`, optional `fdc_id`, and `detail` metadata from Avocavo / OpenAI (`lib/nutrition/resolve-ingredient.ts`, `avocavo-analyze-meal.ts`).
- **Meal breakdown UI** — After analyze, each line shows **USDA match**, **My food** (custom), or **Estimate**; optional **Open in FoodData Central** (not shown for custom); **Matched food** + confidence lines where applicable (`lib/nutrition/source-detail.ts` + `meal-log-client`).
- **Summary** — Header copy + counts for USDA / My foods / Estimates.
- **User-created foods** — `UserFood` model (`user_foods`): per-100g kcal + macros, `label` + `label_norm` (unique per user), `**version`** (integer, incremented on each `PATCH`). CRUD via `/api/user-foods` and **Settings → My foods** (`user-foods-manager.tsx`).
- **Merge rules** — **User food wins** when the parsed ingredient name (or `search_query`) matches a saved food label (case-insensitive, normalized whitespace). OpenAI path: applied before Avocavo batch. Avocavo-only path: applied after `lineFromAvocavoApiItem` when the line’s `label` matches and `unit === "g"`. Overrides set `detail.conflict_resolution`, `overridden_from`, `previous_fdc_id` when replacing a prior match; `analyzeMealText` receives `userFoods` from `loadUserFoodsForResolve` in analyze and meal PATCH routes.

**Explicitly out of scope (later):**

- Non-USDA regional databases, crowdsourced moderation, full audit history of food edits (beyond version counter), duplicate merge beyond per-user unique label.

---

## Epic 4 — Nutrition intelligence (beyond calories)

**Goal:** Differentiate from “a calculator with charts.”

- Macros + protein adequacy insights (satiety, muscle-oriented users).
- Micronutrients “lite”: fiber, sodium, added sugar where data exists.
- Meal pattern insights: late eating, protein distribution, weekend drift.
- “Explain why” summaries: what drove the day (non-moralizing).

**Review questions:** How deep into micros for v1? (Fiber / protein / sodium often sufficient early.)

### Epic 4 — implementation status (v1 closed)

**Shipped in product today:** rolling **calorie + protein** goal blurbs; **day** P/C/F totals; **week** and **history** rolling windows; **month** insights on History.

**Shipped (Epic 4 “intelligence” slice — v1):**

- **Micronutrients lite** — Fiber, sodium, total sugars, and **added sugars** (when USDA/resolver provides them) aggregated per meal and per day; **week** card shows 7-day **averages** when totals exist. Line items persist `fiber_g`, `sodium_mg`, `sugar_g`, `added_sugar_g` on `meal_line_items`; meal totals mirror `total_`* fields.
- **Pattern copy (rolling window)** — `/api/meals/insights` returns `patterns.weekendDriftLine`, `patterns.mealTimingBandLine`, and `patterns.lateEatingLine` (weekend vs weekday kcal; **local-time** four bands — morning / midday / early evening / late night — with **dominant-band** copy when ≥3 meals; late-night **after 9 p.m.** line when it does not duplicate the dominant-band story). **Timezone** from the request applies to all of the above.
- **“Explain the day”** — `explainTheDayLines()` on the home **day** card: calorie driver, **protein distribution** (when one meal is a large share of the day’s protein across ≥2 meals), protein vs guide, fiber, sodium/sugar context in UI thresholds, **total vs added sugar** copy when data exists, calories near target, and **same-day meal-timing** lines from `dayMealTimingLines()` (via batch `includeTiming` + IANA zone). Capped at **five** short lines.

**Explicitly later (Epic 4+ / v2):** deeper LLM-style narratives; micronutrient depth beyond “lite”; meal-pattern experiments beyond current heuristics.

---

## Epic 5 — Goals, adherence & coaching loops

**Goal:** Turn data into **next actions** without being preachy.

- Weekly review: wins, friction, one tweak suggestion.
- Gentle nudges: hydration, vegetables, protein at breakfast—user-chosen.
- Streak design that allows misses (recovery days).
- Optional coach prompts grounded in behavior science (implementation intentions).

**Review questions:** AI coach tone—supportive vs analytical?

### Epic 5 — implementation status

**Shipped (slice 1 — logging rhythm, non-shaming):**

- Home **This week** card (`WeekInsightsCard`): counts **calendar days with ≥1 meal** in the visible 7-day window vs seven days, plus a short **supportive blurb** (no streak scoreboards, no guilt language). Copy lives in `lib/meals/logging-rhythm-blurb.ts`.

**Shipped (slice 2 — one heuristic “Try this week” line):**

- Same card: optional **Try this week:** sentence from `lib/meals/try-this-week-suggestion.ts` (protein shortfall vs goal, calories above/below goal on average, or sparse logging days). Hidden when heuristics do not fire so the card stays quiet on “fine” weeks.

**Shipped (slice 3 — history week strip parity + shared UI):**

- `GET /api/meals/insights` accepts optional `**timeZone`** (IANA, validated); returns `**daysWithLogs`** via Postgres `timezone(...)` + distinct local dates (falls back to `**UTC`** if missing/invalid).
- **History** “This week” strip reuses the same body as home through `RollingWeekSummaryBody` (rhythm + try-this-week + macro lines).

**Shipped (slice 4 — user-chosen weekly focus):**

- `user_profiles.weekly_coaching_focus` (optional): `protein` | `vegetables` | `hydration` | `steady_calories`.
- **Settings → Weekly coaching** select; `PATCH /api/profile` persists it.
- **Try this week** line uses the saved theme **only when** no data-driven heuristic fired (heuristics still win when they match).

**Shipped (slice 5 — 14-day rhythm on History):**

- `rolling14WindowBoundsIso` / `rollingNDateKeys` in `lib/meals/local-date.ts`.
- `GET /api/meals/insights` supports `**windowDays=7|14`** (with matching `from`/`to` span); averages use that divisor.
- **History** `HistoryFortnightStrip`: last 14 local days — days with a log, meal count, kcal/day average vs goal, plus `fortnightRhythmBlurb` (recovery-friendly wording, not a streak).

**Shipped (slice 6 — weekly recap on History):**

- `lib/meals/weekly-recap-lines.ts`: heuristic **wins** and **friction** (logging days, calories vs goal, protein vs goal, weekend vs weekday calories, sparse days).
- **History** `HistoryWeeklyRecapStrip` (after rolling week card): **Wins** / **Friction** lists; **quiet week** copy when no heuristic fires.

**Shipped (slice 7 — cross-links on History):**

- `lib/meals/history-insight-anchors.ts` — stable fragment IDs for the four insight cards.
- `HistoryInsightsCrossLinks` — one footer line per card with `next/link` jumps (`scroll-mt-28` on targets).

**Shipped (slice 8 — recovery framing toggle):**

- `user_profiles.active_days_14_enabled` (boolean, default false). **Settings → Daily Performance Focus** checkbox: “Active days (14-day view)”.
- When enabled, home (`MealLogClient`) and **Trends** rolling week (`HistoryInsightsStrip`) fetch `**/api/meals/insights`** with `**windowDays=14`** and merge `**recovery14`** into `RollingWeekSummaryBody`: **“X of 14 days had at least one log”** plus `lib/meals/active-days-14-blurb.ts` (no streak language).

**Shipped (slice 9 — implementation intentions, deeper pairing):**

- `**lib/meals/implementation-intention-bridge.ts`** — deterministic **bridge lines** when both a user **Plan this week (if–then)** and heuristic **Try this week** copy exist (protein / logging rhythm / calories overlap, else neutral). Shown on `**RollingWeekSummaryBody`** between the main suggestion and the if–then line.
- **Trends → Week in Review** — `**HistoryWeeklyRecapStrip`** repeats the user’s plan in an emerald callout (same copy as home) with a Settings link.
- **Settings** — three **template** buttons fill the if–then textarea (`IMPLEMENTATION_INTENTION_STARTERS`).

**Suggested next slices (still Epic 5):**

- Optional **AI-assisted** nudges (tone-guarded) — only if you want generation beyond heuristics.

---

## Epic 6 — Weight & progress (optional, privacy-sensitive)

**Goal:** Track outcomes without making the scale the only scoreboard.

- Weight trends with smoothing (reduce daily noise).
- Non-scale metrics: energy, hunger, workouts, steps (later).
- Photo timeline optional, strongly permissioned.

**Review questions:** Is weight in MVP?

### Epic 6 — implementation status (slices 1–2 shipped)

**Shipped (slice 1):**

- **Data model** — `WeightLog` (`weight_logs`): `weight_kg`, optional `body_fat_pct`, `logged_at`; user-scoped with indexes.
- **APIs** — `GET` / `POST` `/api/body/weight` (list + create entries); `GET` `/api/body/weight-series` (daily collapse + EMA-smoothed series for charts; query includes `timeZone`).
- **Smoothing & series** — `lib/body/weight-trend-series.ts`: one weight per local calendar day (last log wins), then **EMA** on the daily series for a less noisy curve; `formatYmdInTimeZone` for zoned day keys.
- **Home** — `WeightLogCard`: log weight, recent entries, unit-aware display; optional **compact smoothed sparkline** when **`user_profiles.weight_trend_on_home_enabled`** is true (Settings toggle). Full chart story: **Trends → Weight** section.
- **Trends** — `WeightTrendStrip` + `WeightTrendSparkline` on `/trends` (`#history-weight-trend` via `HISTORY_INSIGHT_ANCHORS.weightTrend`); section navigator includes **Weight**.
- **Settings** — `PATCH` `/api/profile` persists `weightTrendOnHomeEnabled` (default false).
- **Intelligence (light)** — `GET` `/api/intelligence/metabolic` joins recent meals with **weight logs** for coarse intake vs. scale trajectory (where data exists).

**Shipped (slice 2 — goal reference line):**

- **Profile** — optional **`goal_weight_kg`** on `user_profiles` (nullable); **Settings → Target weight (optional)**; cleared field removes the line from charts.
- **API** — `GET` `/api/body/weight-series` includes **`goalWeightKg`** (from profile) so clients don’t need an extra round trip.
- **UI** — `WeightTrendSparkline` draws a **dashed emerald reference line** and shows **Goal** in the panel legend; home compact sparkline uses the same line when a goal is set.

**Explicitly not shipped (still Epic 6 backlog):**

- Non-scale outcomes (energy, hunger, workouts, **steps** without integrations).
- Photo / measurement timeline and granular privacy controls.
- Apple Health / Google Fit sync.
- Export of weight series or formal “weight report” PDF.

**Suggested next slices (prioritize if outcomes > new logging features):**

1. **Decide MVP stance** — Answer “is weight in MVP?” for onboarding/marketing; optional gentle reminder copy (non-judgmental).
2. **Trends depth** — Maintenance **band** or rate-of-change callouts (building on goal line + smoothed curve).
3. **Hydration / fluids** — Already on home (`FluidLog`, hydration card); **adjacent** outcome tracking, not a substitute for Epic 6 non-scale list above.
4. **Integrations** — When ready, steps + weight import (Epic 6 + Epic 10 performance).

---

## Epic 7 — History, insights & exports

**Goal:** Long-term value and trust.

- Search / filter history, tags, restaurants.
- Export CSV (portability).
- Monthly summaries: adherence, averages, top foods.

---

## Epic 8 — Social & accountability (optional, high-risk)

**Goal:** Support without toxic comparison culture.

- Private accountability partner.
- Shared household meals (later).
- Avoid public leaderboards early without strong moderation.

**Review questions:** Usually v2+ unless social is the wedge.

---

## Epic 9 — Trust, safety & content policy

**Goal:** Responsible boundaries.

- Disclaimers: not medical advice; professionals for ED, diabetes meds, pregnancy, etc.
- Guardrails for extreme restriction messaging.
- Clear data deletion and account controls.

---

## Epic 10 — Performance, accessibility & internationalization

**Goal:** Real-world usability.

- WCAG-minded UI, large tap targets, accessible charts.
- Units: kJ vs kcal; locale number formats.
- Performance budgets on mobile networks.

---

## Epic 11 — Monetization (if applicable)

**Goal:** Align revenue with outcomes, not dark patterns.

- Premium: advanced insights, exports, household, integrations.
- Avoid paywalling basic safety and core logging.

---

## Suggested build sequence (high level)

1. **MVP wedge:** Epic 2 + Epic 3 (minimum) + Epic 1 (light) + Epic 9 (minimum disclaimers / controls).
2. **v1 differentiation:** Epic 4 + Epic 5 (light coaching loops).
3. **Retention moat:** Epic 7 + offline + exports.
4. **Expansion:** Epic 6 + integrations + optional social (Epic 8).

---

## Epic review checklist (use per epic)

For each epic under discussion, capture:

1. **Primary user** (beginner logger vs advanced macro tracker).
2. **Explicitly out of scope** for the next time-box (e.g. 6 weeks).
3. **Success metric** (e.g. median log time, 7-day return rate, support tickets about confusion).

---

## Tech note (current repo)

- **Auth:** NextAuth (JWT sessions, credentials provider). Env: `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (production).
- **Data:** Postgres via Prisma (`DATABASE_URL` / `DIRECT_URL`). Tables include `users`, `user_profiles`, `meals`, etc.
- **Access control:** Prefer server-side checks (`getSession`) + Prisma `where: { userId }`. Legacy Supabase RLS policies are irrelevant when using only Prisma with a DB role that bypasses RLS.