# Natural portion logging

**Status:** Approved for implementation  
**Date:** 2026-05-19

## Problem

Users want to log the way they speak ("2 eggs", "1 packet Shin Ramen") without mentally converting to grams, while macros stay trustworthy for daily tracking.

Today, accuracy often exists after LLM analyze, but search pick, live hints, and receipt UX train users to think in grams.

## Principles

1. **Canonical grams internally** — `meal_line_items.quantity` stays in grams for totals and prepared-meal math.
2. **Natural units at the edge** — input, pick, and receipt show count/household units when that is how users think.
3. **Transparent conversion** — show equivalent grams (secondary) and an assumption chip when conversion is estimated.
4. **Progressive precision** — fast defaults for eggs/packets; optional gram override; branded servings when the API provides them.

## Data model

| Field | Purpose |
|-------|---------|
| `quantity` + `unit` | Grams for math (`g`) |
| `display_quantity` | e.g. `2` |
| `display_unit` | e.g. `large egg`, `packet` |
| `display_label` | e.g. `2 large eggs` |
| `conversion_source` | `label_serving`, `curated`, `llm`, `user`, etc. |
| `assumption` | Short receipt chip text |

`UserFood` optional `default_serving_qty`, `default_serving_unit`, `default_serving_grams` for repeat items (e.g. a specific ramen pack).

## Serving resolution order

1. User override (portion picker / edit)
2. FatSecret `serving_description` when present on search
3. Curated rules in `lib/meals/portion-resolve.ts`
4. LLM (`parseMealDescription` / `unit_note`)
5. Fallback with visible estimate copy

## Phased delivery

### Phase 1

- No auto-`100g` on search insert; count/cup/packet parsing in hints and analyze fallbacks.
- Receipt shows natural phrase first via `linePortionDisplay`.
- `PORTION_QUICK_SNIPPETS` under free-text log.
- Composer defaults unit to `count` for egg/packet patterns.

### Phase 2

- `PortionInput` + `PortionPickSheet` after food pick (search/composer).
- FatSecret search returns `servings[]`.
- Optional `structuredLines` on `POST /api/meals/analyze` for fully structured meals.

### Phase 3

- Prisma columns + `prismaLineCreates` for `display_*`.
- UserFood default serving in API and settings UI.
- Meal PATCH/analyze paths attach display fields from parsed text.

## Out of scope

- Barcode serving picker, photo/voice logging.
- Replacing grams in database or trends.

## Success criteria

- Log "2 eggs" and "1 packet shin ramen" without typing `g`.
- Receipt shows natural unit first; grams secondary.
- Assumption visible when conversion is estimated.
- Fixture meals in tests stay within reasonable macro bounds vs LLM-only path.
