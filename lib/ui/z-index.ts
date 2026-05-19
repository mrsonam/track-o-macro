/** Shared stacking order for overlays and chrome. */
export const Z_INDEX = {
  nav: 50,
  overlay: 100,
  barcode: 120,
  toast: 130,
  /** Cold-load splash; above all app chrome until dismissed. */
  splash: 200,
} as const;
