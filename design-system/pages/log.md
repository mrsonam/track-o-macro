# Log page (`/log`)

Overrides `design-system/calorie-pwa/MASTER.md` for the meal logger.

## Layout

- Full dashboard width (`max-w-7xl`), same as Today.
- **Desktop (lg+)**: two columns, 8/4 grid. Meal logger left, hydration card right (sticky).
- **Mobile**: single column, meal logger first, hydration below.
- Sticky bottom primary CTA above floating nav on small screens (meal column only).
- Queue and error alerts span full width above the grid.

## Structure

1. Compact back pill to Today
2. Page title + optional date badge (past-day logging)
3. Full-width alerts (offline queue, errors)
4. **Left**: entry card (Describe / Build rows), receipt, View today
5. **Right**: hydration card for `logDateKey` (or today)

## Copy

- Task-first, plain language. No em or en dashes.
- Primary CTA: **Log meal** (sentence case).
- Tabs: **Describe**, **Build rows**.

## Components

- Use `input-field`, `btn-primary`, `btn-secondary`, bento-style receipt card.
- Hydration uses sky tint per MASTER (carbs/hydration).
- Lucide icons only. `cursor-pointer` on interactive elements.
