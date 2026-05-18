import { describe, expect, it } from "vitest";
import { buildLineHintChips } from "@/lib/meals/log-line-hints";

describe("buildLineHintChips", () => {
  const hints = [
    {
      label: "Chicken breast",
      labelNorm: "chicken breast",
      kcalPer100g: 165,
    },
  ];

  it("keeps an empty slot on line 0 when only line 1 has a hint", () => {
    const chips = buildLineHintChips(
      ["eggs 2 large", "chicken breast 150g"],
      hints,
    );
    expect(chips).toHaveLength(2);
    expect(chips[0]!.showChip).toBe(false);
    expect(chips[1]!.showChip).toBe(true);
    expect(chips[1]!.lineIndex).toBe(1);
    expect(chips[1]!.kcal).toBeCloseTo(247.5, 1);
  });

  it("assigns each hint to at most one line", () => {
    const chips = buildLineHintChips(
      ["chicken breast 100g", "chicken breast 50g"],
      hints,
    );
    const shown = chips.filter((c) => c.showChip);
    expect(shown).toHaveLength(1);
  });
});
