export type SplashScatterSlot = {
  /** Index into SPLASH_FOOD_ICONS */
  iconIndex: number;
  top: string;
  left: string;
  tile: string;
  icon: string;
  /** Stagger offset for bounce animation (seconds) */
  bounceDelay: number;
};

/** Dense scatter field; center kept lighter for brand overlay. */
export const SPLASH_SCATTER_SLOTS: readonly SplashScatterSlot[] = [
  { iconIndex: 0, top: "6%", left: "5%", tile: "h-14 w-14", icon: "h-7 w-7", bounceDelay: 0 },
  { iconIndex: 1, top: "4%", left: "28%", tile: "h-10 w-10", icon: "h-5 w-5", bounceDelay: 0.35 },
  { iconIndex: 2, top: "8%", left: "52%", tile: "h-12 w-12", icon: "h-6 w-6", bounceDelay: 0.7 },
  { iconIndex: 3, top: "5%", left: "74%", tile: "h-11 w-11", icon: "h-5 w-5", bounceDelay: 1.05 },
  { iconIndex: 4, top: "10%", left: "90%", tile: "h-12 w-12", icon: "h-6 w-6", bounceDelay: 1.4 },

  { iconIndex: 5, top: "18%", left: "12%", tile: "h-11 w-11", icon: "h-5 w-5", bounceDelay: 0.2 },
  { iconIndex: 6, top: "16%", left: "38%", tile: "h-14 w-14", icon: "h-7 w-7", bounceDelay: 0.55 },
  { iconIndex: 7, top: "20%", left: "66%", tile: "h-10 w-10", icon: "h-5 w-5", bounceDelay: 0.9 },
  { iconIndex: 8, top: "14%", left: "84%", tile: "h-16 w-16", icon: "h-8 w-8", bounceDelay: 1.25 },

  { iconIndex: 9, top: "26%", left: "3%", tile: "h-12 w-12", icon: "h-6 w-6", bounceDelay: 0.45 },
  { iconIndex: 10, top: "28%", left: "22%", tile: "h-10 w-10", icon: "h-5 w-5", bounceDelay: 0.8 },
  { iconIndex: 11, top: "24%", left: "48%", tile: "h-11 w-11", icon: "h-5 w-5", bounceDelay: 1.15 },
  { iconIndex: 12, top: "27%", left: "78%", tile: "h-12 w-12", icon: "h-6 w-6", bounceDelay: 1.5 },
  { iconIndex: 13, top: "30%", left: "92%", tile: "h-10 w-10", icon: "h-5 w-5", bounceDelay: 1.85 },

  { iconIndex: 14, top: "36%", left: "8%", tile: "h-16 w-16", icon: "h-8 w-8", bounceDelay: 0.15 },
  { iconIndex: 15, top: "38%", left: "30%", tile: "h-11 w-11", icon: "h-5 w-5", bounceDelay: 0.5 },
  { iconIndex: 16, top: "34%", left: "58%", tile: "h-12 w-12", icon: "h-6 w-6", bounceDelay: 0.85 },
  { iconIndex: 17, top: "37%", left: "86%", tile: "h-14 w-14", icon: "h-7 w-7", bounceDelay: 1.2 },

  { iconIndex: 18, top: "44%", left: "18%", tile: "h-10 w-10", icon: "h-5 w-5", bounceDelay: 1.55 },
  { iconIndex: 19, top: "46%", left: "72%", tile: "h-11 w-11", icon: "h-5 w-5", bounceDelay: 1.9 },
  { iconIndex: 20, top: "42%", left: "94%", tile: "h-12 w-12", icon: "h-6 w-6", bounceDelay: 2.25 },

  { iconIndex: 21, top: "54%", left: "4%", tile: "h-12 w-12", icon: "h-6 w-6", bounceDelay: 0.3 },
  { iconIndex: 0, top: "52%", left: "26%", tile: "h-10 w-10", icon: "h-5 w-5", bounceDelay: 0.65 },
  { iconIndex: 3, top: "56%", left: "82%", tile: "h-14 w-14", icon: "h-7 w-7", bounceDelay: 1.0 },
  { iconIndex: 8, top: "50%", left: "96%", tile: "h-11 w-11", icon: "h-5 w-5", bounceDelay: 1.35 },

  { iconIndex: 4, top: "64%", left: "10%", tile: "h-12 w-12", icon: "h-6 w-6", bounceDelay: 0.4 },
  { iconIndex: 7, top: "62%", left: "34%", tile: "h-10 w-10", icon: "h-5 w-5", bounceDelay: 0.75 },
  { iconIndex: 11, top: "66%", left: "70%", tile: "h-16 w-16", icon: "h-8 w-8", bounceDelay: 1.1 },
  { iconIndex: 14, top: "60%", left: "88%", tile: "h-11 w-11", icon: "h-5 w-5", bounceDelay: 1.45 },

  { iconIndex: 2, top: "72%", left: "6%", tile: "h-14 w-14", icon: "h-7 w-7", bounceDelay: 0.25 },
  { iconIndex: 6, top: "74%", left: "24%", tile: "h-11 w-11", icon: "h-5 w-5", bounceDelay: 0.6 },
  { iconIndex: 9, top: "70%", left: "50%", tile: "h-10 w-10", icon: "h-5 w-5", bounceDelay: 0.95 },
  { iconIndex: 12, top: "73%", left: "76%", tile: "h-12 w-12", icon: "h-6 w-6", bounceDelay: 1.3 },
  { iconIndex: 16, top: "68%", left: "92%", tile: "h-12 w-12", icon: "h-6 w-6", bounceDelay: 1.65 },

  { iconIndex: 1, top: "82%", left: "14%", tile: "h-10 w-10", icon: "h-5 w-5", bounceDelay: 0.5 },
  { iconIndex: 5, top: "84%", left: "38%", tile: "h-14 w-14", icon: "h-7 w-7", bounceDelay: 0.85 },
  { iconIndex: 10, top: "80%", left: "62%", tile: "h-11 w-11", icon: "h-5 w-5", bounceDelay: 1.2 },
  { iconIndex: 13, top: "83%", left: "84%", tile: "h-12 w-12", icon: "h-6 w-6", bounceDelay: 1.55 },

  { iconIndex: 17, top: "90%", left: "4%", tile: "h-11 w-11", icon: "h-5 w-5", bounceDelay: 0.35 },
  { iconIndex: 19, top: "92%", left: "28%", tile: "h-12 w-12", icon: "h-6 w-6", bounceDelay: 0.7 },
  { iconIndex: 20, top: "88%", left: "54%", tile: "h-10 w-10", icon: "h-5 w-5", bounceDelay: 1.05 },
  { iconIndex: 21, top: "91%", left: "78%", tile: "h-16 w-16", icon: "h-8 w-8", bounceDelay: 1.4 },
  { iconIndex: 18, top: "86%", left: "94%", tile: "h-12 w-12", icon: "h-6 w-6", bounceDelay: 1.75 },
] as const;
