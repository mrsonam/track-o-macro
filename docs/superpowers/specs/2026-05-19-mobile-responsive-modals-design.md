# Mobile responsive modals and bottom sheets

**Status:** Approved for spec review  
**Date:** 2026-05-19  
**Breakpoint:** `sm` (640px). Below = bottom sheet. At or above = centered dialog.

## Problem

Modal-like UI is implemented inconsistently:

| Surface | Issues |
|---------|--------|
| `ConfirmDialog` | Strongest baseline (portal, scroll lock, backdrop, motion) but mobile still looks like a floating card, not a sheet |
| `PortionPickSheet` | No portal, no body scroll lock, `z-50` collides with floating nav, weak backdrop dismiss |
| Barcode overlay | Full screen by design (`z-[120]`); out of scope except shared nav-hide flag |

Goals (all required for v1):

- **A. Layout and feel:** True mobile bottom sheet (edge-to-edge, safe area, sticky actions)
- **B. Layering and focus:** Correct stacking, no nav bleed-through, keyboard-friendly sheet height
- **C. Consistency:** One shell for confirm, portion pick, and future modals
- **Swipe dismiss:** Drag down from handle/header on mobile sheets only (Framer Motion, no new library in v1)

## Non-goals (v1)

- Changing barcode fullscreen UX
- Swipe dismiss on desktop centered dialogs
- Tablet-specific third layout
- Adding Vaul or Radix (revisit only if handle/header drag fails QA on real devices)

## Architecture

### Component model

```
ResponsiveOverlay (shell, shared)
├── ConfirmDialog (thin wrapper: copy + danger/neutral actions)
└── PortionPickSheet (thin wrapper: PortionInput + actions)
```

New modals must use `ResponsiveOverlay`, not ad-hoc `fixed inset-0` markup.

### `ResponsiveOverlay` API (draft)

| Prop | Purpose |
|------|---------|
| `open` | Visibility |
| `onClose` | Backdrop, Escape, swipe dismiss, X |
| `busy?` | Blocks dismiss when true |
| `title` / `titleId?` | Accessible name |
| `descriptionId?` | Optional `aria-describedby` |
| `children` | Scrollable body |
| `footer?` | Sticky action row (buttons) |
| `showCloseButton?` | Header X (default true for sheets with header) |

Implementation file (proposed): `app/components/responsive-overlay.tsx`.

### Breakpoint behavior

| | Mobile `< sm` (640px) | Desktop `≥ sm` |
|---|----------------------|----------------|
| Layout | `items-end`, full width sheet | `items-center`, `max-w-md` dialog |
| Radius | `rounded-t-2xl` only | `rounded-2xl` all sides |
| Horizontal inset | `w-full` (internal `px-4` on sections) | Card with `p-4` gutter on viewport |
| Max height | `max-h-[90dvh]`, body scrolls | Content-driven |
| Safe area | `pb-[max(1rem,env(safe-area-inset-bottom))]` on footer | Standard padding |
| Animation | `sheetPanel`: slide up from `y: 100%` | `modalPanel`: fade + slight scale (existing) |
| Swipe dismiss | Yes (handle + header only) | No |

Use Tailwind `sm:` variants on the shell, not JS breakpoint detection, unless a consumer needs `matchMedia` for drag enablement.

## Mobile sheet layout

```
┌─────────────────────────────┐
│  ───  drag handle             │  drag + swipe dismiss zone
│  Title                 [X]    │  drag + swipe dismiss zone
├─────────────────────────────┤
│  scrollable children          │  touch-action: pan-y
│                               │
├─────────────────────────────┤
│  footer (sticky in sheet)     │  safe-area padding
└─────────────────────────────┘
```

- **Handle:** Centered pill (~36px wide), min touch height ~44px including padding.
- **Header:** Title + optional close button; same drag listener as handle (shared drag wrapper).
- **Footer:** Sticky at bottom of sheet panel; primary actions remain visible above home indicator.

## Swipe to dismiss

### Rules

- Only when `open && !busy` and viewport is mobile sheet mode (`< sm`).
- Close when `drag offset.y > 72px` OR `velocity.y > 400` (tune in implementation).
- `dragConstraints: { top: 0, bottom: 0 }`, `dragElastic: 0.15` on the draggable wrapper.
- On cancel below threshold: spring back with existing motion easing.
- `prefers-reduced-motion`: disable drag; keep backdrop, buttons, Escape.

### Drag zone

- Apply `drag="y"` to a wrapper around **handle + header only**, not the scrollable body or footer.
- Body: `overflow-y-auto`, `overscroll-behavior: contain`, `touch-action: pan-y`.

### Accessibility

- Handle: `aria-label="Drag down to close"` (or equivalent plain copy).
- Swipe is supplemental; backdrop tap, Cancel, X, and Escape remain required.

### Optional polish

- Backdrop opacity scales slightly with drag distance (subtle, optional for v1).

## Layering and focus (B)

### Z-index tokens

Single module, e.g. `lib/ui/z-index.ts`:

| Token | Value | Usage |
|-------|-------|-------|
| `nav` | 50 | Floating bottom nav |
| `overlay` | 100 | Sheets and dialogs |
| `barcode` | 120 | Fullscreen scanner |
| `toast` | 130 | Reserved |

Migrate `ConfirmDialog` from `z-[200]` to `overlay` unless a product reason exists to stay above barcode (confirm should be below barcode when scanning; barcode is separate flow).

### Hide floating nav

Generalize `document.body.dataset.barcodeOverlayOpen` to `document.body.dataset.overlayOpen = "1"`:

- Set in `ResponsiveOverlay` when `open`
- Barcode overlay continues to set the same flag (or calls shared `setOverlayOpen(true/false)`)
- `FloatingNav` hides when `overlayOpen === "1"`
- Keep `barcode-overlay-change` event or rename to `overlay-change` with backwards-compatible listener during migration

### Focus and keyboard

- Portal to `document.body` (always).
- `document.body.style.overflow = "hidden"` while open.
- Escape → `onClose` when not `busy`.
- Initial focus: cancel or close button (match current `ConfirmDialog`).
- Sheet `max-h-[90dvh]` so iOS keyboard does not clip the entire panel.
- v1: browser default scroll-into-view for focused inputs inside scroll body.
- v1.1 (only if QA fails): `visualViewport` listener to add dynamic bottom padding.

## Motion

Add to `lib/motion/variants.ts`:

```ts
sheetPanel: {
  hidden: { y: "100%" },
  show: { y: 0, transition: ... },
  exit: { y: "100%", transition: ... },
}
```

Reduced motion: use opacity-only or instant open/close for sheet and dialog.

## Migration plan

1. Implement `ResponsiveOverlay` + z-index + overlay open flag helper.
2. Refactor `ConfirmDialog` to use shell (preserve public props).
3. Refactor `PortionPickSheet` to use shell (preserve public props; `confirmLabel` stays).
4. Update `FloatingNav` to read generalized overlay flag.
5. Remove duplicate `fixed inset-0` patterns from portion sheet.
6. Manual QA matrix (below).

## Testing / success criteria

| Case | Expected |
|------|----------|
| iPhone width, ConfirmDialog | Full-width bottom sheet, nav hidden, backdrop dismiss, swipe from handle |
| iPhone width, PortionPickSheet | Same; qty field scrollable; footer actions tappable; keyboard does not hide Confirm |
| Desktop `≥ sm` | Centered dialog, no swipe drag, same copy and actions as today |
| `busy` on confirm | No swipe, backdrop, or Escape dismiss |
| Barcode open | Nav hidden; sheet not open; z-order barcode above overlay |
| `prefers-reduced-motion` | No drag; dialog/sheet still usable |

## Open questions (resolved)

| Question | Decision |
|----------|----------|
| Mobile vs desktop breakpoint | `sm` (640px) |
| Swipe dismiss | Yes, handle + header, Framer Motion |
| Library | No Vaul in v1 |

## Related files (current)

- `app/components/confirm-dialog.tsx`
- `app/components/log/portion-pick-sheet.tsx`
- `app/components/floating-nav.tsx`
- `lib/motion/variants.ts` (`modalPanel`, `modalBackdrop`)
