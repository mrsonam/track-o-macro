import { EASE_OUT } from "@/lib/motion/tokens";

/** Splash overlay dissolve (matched to app reveal). */
export const SPLASH_REVEAL_S = 0.48;

export const SPLASH_SHELL_EXIT = {
  duration: SPLASH_REVEAL_S,
  ease: EASE_OUT,
};

export const SPLASH_APP_REVEAL = {
  duration: SPLASH_REVEAL_S,
  ease: EASE_OUT,
};

export const SPLASH_TILE_ENTER = {
  type: "spring" as const,
  duration: 0.52,
  bounce: 0.14,
};
