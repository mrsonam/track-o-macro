# Demo account with rolling 2-month history

**Status:** Approved for implementation
**Date:** 2026-08-12

## Problem

Visitors evaluating the app (portfolio viewers, prospective users) have no way to see it populated with realistic data without creating their own account and logging weeks of meals by hand. We need a standing demo account that always looks like an established user: two months of daily meal and fluid logs, a weight-loss-to-maintenance progression, and examples of prepared-meal and saved-meal features — that visitors can log into and explore.

## Principles

1. **Always looks current** — the demo's history should end "today," not the day it was first seeded, so it never looks stale months later.
2. **Additive, not destructive** — nothing about running the demo automatically deletes visitor-added data. Visitors can log real entries into the account and they stick around.
3. **One source of truth for "a realistic day"** — the initial 60-day backfill and the ongoing daily catch-up use the same day-generation logic, so behavior doesn't drift between the two.
4. **Demo credentials are intentionally public** — this is not a secret; it's a discoverable feature (a "View demo" button), not a document of hidden creds.

## Data model changes

Add `isDemo Boolean @default(false)` to `User` (`prisma/schema.prisma`), via a new migration. Lets the daily job and the login button locate the account by a stable flag instead of a hardcoded email string sprinkled through the codebase, and leaves room to gate demo-only UI affordances later if needed.

## Components

### `lib/demo/constants.ts`
Exports `DEMO_EMAIL = "demo@trackomacro.app"` and `DEMO_PASSWORD = "Demo12345"` (meets the app's password policy: 8+ chars, upper/lower/number). Imported by the seed script, the daily route, and the login button — single source of truth.

### `lib/demo/generate-day.ts`
Pure function(s) that produce one day's worth of demo data given a day index / date and the current weight trajectory:
- 2–3 meals (varied realistic text + macros; reuses the deterministic-jitter approach from `scripts/seed-sonamsrp8.ts` so output is reproducible for a given day index)
- 4 fluid logs (water/tea/coffee mix)
- optional weight log (~3 days out of 7)
- optional prepared-meal portion (~every 4th day), shaped exactly like `app/api/meals/from-prepared/route.ts` produces (`detail.kind: "prepared_meal_portion"`, referencing a seeded `PreparedMeal` id)

No Prisma calls in this module — it returns plain data structures. Callers (backfill script, daily route) do the actual `prisma.*.create` calls. Keeps it unit-testable without a database.

### `scripts/seed-demo.ts` (run once via `npm run seed:demo`)
1. Upsert the demo `User` (`isDemo: true`, bcrypt-hashed `DEMO_PASSWORD`) and a completed `UserProfile`: 168cm height, goal weight 80kg, start weight 98kg, `goalIntent: "lose"`, `goalPace: "moderate"`, `targetKcal: 1950`, `targetProteinG: 120`, onboarding complete.
2. Clear any existing meals/fluids/weights/prepared meals/saved meals for the demo user (safe to wipe on a fresh manual run — this is the one intentionally destructive step, and it's manual/opt-in, not automatic).
3. Create 2 `PreparedMeal` batches ("Meal-prepped chicken, rice & broccoli", "Overnight oats batch") with plausible batch totals.
4. Create 3 `SavedMeal` favorites.
5. For each of the last 60 days (oldest to newest, ending today): call `generate-day.ts`, persist meals/fluids/weight via Prisma, using a weight trajectory that linearly interpolates 98kg → 80kg across the 60 days.
6. Update `UserProfile.weightKg` to the final day's weight (matches how `POST /api/body/weight` keeps the profile snapshot in sync).

### `app/api/internal/demo-daily-log/route.ts`
Triggered by Vercel Cron once daily. Auth: compares `Authorization: Bearer $CRON_SECRET` header, same pattern as `app/api/internal/fatsecret-egress/route.ts`. Logic:
1. Find the demo user (`isDemo: true`); if none exists, no-op (demo not seeded yet).
2. Find the most recent day with meal data. If the demo user exists but has zero meal history (backfill hasn't been run yet), no-op — the 60-day backfill is an intentionally separate manual step (`npm run seed:demo`), not something this route improvises.
3. For each missing calendar day up to and including today (capped at 14 days, in case cron was down longer), call `generate-day.ts` with a weight trajectory that continues the linear ramp until the goal weight is reached, then fluctuates narrowly around 80kg (simulates a maintenance phase) — and persist via Prisma.
4. If today's data already exists, no-op (idempotent — safe to trigger more than once).

Only ever creates rows; never deletes. Visitor-added data (real logins doing real logging) is untouched.

### `vercel.json`
Add a `crons` entry: `{ "path": "/api/internal/demo-daily-log", "schedule": "0 6 * * *" }` (06:00 UTC daily). Vercel automatically sends `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is set in the project's env vars — document this as a new required-for-demo env var in `README.md`.

### Login page
`app/login/login-form.tsx` gets a "View demo" button below the existing form (visually secondary to the real sign-in form) that calls `signIn("credentials", { email: DEMO_EMAIL, password: DEMO_PASSWORD, redirect: false })` and on success routes to the same `next` destination as a normal login.

## Error handling

- `demo-daily-log` route: wraps the whole handler in try/catch; `isDbUnavailableError` → 503 (matches other internal routes), anything else → logged + 500. A failed run just means the next day's run backfills 2 days instead of 1 — no retry logic needed.
- `seed-demo.ts`: fails loud (`process.exit(1)`) on any error, consistent with `seed-sonamsrp8.ts`. It's a manual/local operation, not automated.
- Missing `CRON_SECRET` in production: the route rejects all requests (no bypass), so the daily job simply won't run until it's configured — safer than accidentally leaving it open.

## Out of scope

- Any UI marking/badging that a user is "in demo mode" beyond the login button itself.
- Rate-limiting or bot-protection on the demo login (existing app-wide auth rate limits, if any, apply equally).
- Cleaning up or moderating visitor-added content (e.g. offensive meal text a visitor might type in).
- Resetting/deleting visitor changes — explicitly decided against; only additive daily catch-up.

## Testing

- Vitest unit tests for `lib/demo/generate-day.ts`: macro totals sum correctly per meal, weight trajectory is monotonic during the loss phase and stays within a narrow band during maintenance, no negative/zero values, prepared-meal portions only reference batches that exist.
- Manual: run `npm run seed:demo` against the dev DB, then click through `/login` → "View demo" → dashboard, trends, and prepared-meals pages to confirm the seeded history renders correctly.
- Manual: invoke `demo-daily-log` locally with the right bearer header twice in a row and confirm the second call is a no-op (idempotency).

## Success criteria

- A visitor can click "View demo" on `/login` and land in a populated dashboard with no signup step.
- Trends page shows a coherent ~2-month weight-loss-then-maintenance curve and daily calorie/macro history with no gaps.
- Prepared-meals and saved-meals pages show non-empty, realistic examples.
- Re-running the daily job multiple times in a row, or running it after several missed days, never produces duplicate or missing days.
