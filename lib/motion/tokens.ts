/** Strong ease-out — UI entrances and feedback (Emil / animations.dev). */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** On-screen movement between states. */
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;

export const DURATION = {
  press: 0.16,
  fast: 0.22,
  ui: 0.35,
  modal: 0.42,
  page: 0.32,
  reveal: 0.42,
} as const;

export const STAGGER = {
  tight: 0.05,
  default: 0.07,
  relaxed: 0.09,
} as const;
