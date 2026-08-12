import type { LucideIcon } from "lucide-react";
import {
  Apple,
  Banana,
  Beef,
  Cake,
  Candy,
  Carrot,
  Cherry,
  Citrus,
  Coffee,
  Cookie,
  Croissant,
  Drumstick,
  Egg,
  Fish,
  Grape,
  IceCream,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Soup,
  Wheat,
} from "lucide-react";

export type SplashFoodIcon = {
  Icon: LucideIcon;
  tileClass: string;
  iconClass: string;
};

/** Icon palette; scatter slots reference these by index. */
export const SPLASH_FOOD_ICONS: readonly SplashFoodIcon[] = [
  { Icon: Drumstick, tileClass: "bg-[#eaf7df]", iconClass: "text-[#356d30]" },
  { Icon: Salad, tileClass: "bg-[#dff1ff]", iconClass: "text-[#1e5a7a]" },
  { Icon: Fish, tileClass: "bg-[#f7f3e9]", iconClass: "text-[#5c4a32]" },
  { Icon: Pizza, tileClass: "bg-[#fff0e6]", iconClass: "text-[#9a4d1a]" },
  { Icon: Egg, tileClass: "bg-[#fff9e6]", iconClass: "text-[#8a6d1a]" },
  { Icon: Apple, tileClass: "bg-[#fde8e8]", iconClass: "text-[#9b2c2c]" },
  { Icon: Croissant, tileClass: "bg-[#f7f3e9]", iconClass: "text-[#6b5344]" },
  { Icon: Soup, tileClass: "bg-[#eaf7df]", iconClass: "text-[#4f9d45]" },
  { Icon: Carrot, tileClass: "bg-[#fff0e6]", iconClass: "text-[#c45c26]" },
  { Icon: Grape, tileClass: "bg-[#f3e8ff]", iconClass: "text-[#6b21a8]" },
  { Icon: Cookie, tileClass: "bg-[#f7f3e9]", iconClass: "text-[#78350f]" },
  { Icon: Wheat, tileClass: "bg-[#fff9e6]", iconClass: "text-[#a16207]" },
  { Icon: Cherry, tileClass: "bg-[#fde8ef]", iconClass: "text-[#be185d]" },
  { Icon: Banana, tileClass: "bg-[#fff9e6]", iconClass: "text-[#a16207]" },
  { Icon: Coffee, tileClass: "bg-[#f7f3e9]", iconClass: "text-[#6b5344]" },
  { Icon: IceCream, tileClass: "bg-[#fde8ef]", iconClass: "text-[#be185d]" },
  { Icon: Sandwich, tileClass: "bg-[#fff0e6]", iconClass: "text-[#9a4d1a]" },
  { Icon: Citrus, tileClass: "bg-[#fff9e6]", iconClass: "text-[#c45c26]" },
  { Icon: Beef, tileClass: "bg-[#fde8e8]", iconClass: "text-[#9b2c2c]" },
  { Icon: Cake, tileClass: "bg-[#f3e8ff]", iconClass: "text-[#6b21a8]" },
  { Icon: Candy, tileClass: "bg-[#fde8ef]", iconClass: "text-[#be185d]" },
  { Icon: Popcorn, tileClass: "bg-[#fff0e6]", iconClass: "text-[#c45c26]" },
] as const;

/** Matches the reduced-motion hold; the full icon-scatter entrance finishes well within this. */
export const SPLASH_MIN_VISIBLE_MS = 900;
