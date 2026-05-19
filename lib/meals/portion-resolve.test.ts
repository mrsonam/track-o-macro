import { describe, expect, it } from "vitest";
import {
  defaultLineForFoodPick,
  defaultServingOptionId,
  estimateGramsFromSegment,
  formatDisplayLabel,
  normalizeGenericPortionUnit,
  parseNaturalPortionFromSegment,
  portionFromServingOption,
  servingOptionsForFood,
  suggestComposerDefaultsForFood,
} from "@/lib/meals/portion-resolve";

describe("normalizeGenericPortionUnit", () => {
  it("maps aliases to canonical units", () => {
    expect(normalizeGenericPortionUnit("packet")).toBe("serving");
    expect(normalizeGenericPortionUnit("large egg")).toBeNull();
    expect(normalizeGenericPortionUnit("count")).toBe("count");
  });
});

describe("formatDisplayLabel", () => {
  it("uses count plus food name, not food-specific unit phrases", () => {
    expect(formatDisplayLabel(2, "count", "Egg, whole")).toBe("2 Egg, whole");
    expect(formatDisplayLabel(1, "serving", "Shin ramen")).toBe(
      "1 serving Shin ramen",
    );
  });
});

describe("parseNaturalPortionFromSegment", () => {
  it("parses egg counts with generic count unit", () => {
    const p = parseNaturalPortionFromSegment("2 large eggs", "Egg, whole");
    expect(p).not.toBeNull();
    expect(p!.grams).toBe(100);
    expect(p!.displayUnit).toBe("count");
    expect(p!.displayLabel).toBe("2 Egg, whole");
  });

  it("parses packet as serving unit", () => {
    const p = parseNaturalPortionFromSegment("1 packet shin ramen", "shin ramen");
    expect(p).not.toBeNull();
    expect(p!.displayUnit).toBe("serving");
    expect(p!.grams).toBeGreaterThan(0);
  });
});

describe("defaultLineForFoodPick", () => {
  it("defaults eggs to count times food label", () => {
    expect(defaultLineForFoodPick("Egg, whole")).toBe("2 Egg, whole");
  });

  it("uses user default with generic unit", () => {
    expect(
      defaultLineForFoodPick("Shin ramen", {
        qty: 1,
        unit: "serving",
        grams: 120,
      }),
    ).toBe("1 serving Shin ramen");
  });
});

describe("servingOptionsForFood", () => {
  it("only offers generic unit labels in the picker", () => {
    const options = servingOptionsForFood("Egg, whole");
    const labels = options.map((o) => o.label);
    expect(labels).toContain("Count");
    expect(labels).toContain("g");
    expect(labels.some((l) => /large egg/i.test(l))).toBe(false);
  });

  it("selects count by default for eggs", () => {
    const options = servingOptionsForFood("Egg, whole");
    const id = defaultServingOptionId("Egg, whole", options);
    expect(options.find((o) => o.id === id)?.unit).toBe("count");
  });
});

describe("estimateGramsFromSegment", () => {
  it("estimates from natural language", () => {
    expect(estimateGramsFromSegment("2 eggs")).toBe(100);
  });
});

describe("suggestComposerDefaultsForFood", () => {
  it("suggests count for eggs", () => {
    expect(suggestComposerDefaultsForFood("large eggs")).toEqual({
      unit: "count",
      qty: "2",
    });
  });
});

describe("portionFromServingOption", () => {
  it("scales generic serving units", () => {
    const p = portionFromServingOption(
      {
        id: "unit-serving",
        unit: "serving",
        label: "Serving",
        gramsPerUnit: 85,
        conversionSource: "label_serving",
        sourceDescription: "1 package (from label)",
      },
      2,
      "instant noodles",
    );
    expect(p.grams).toBe(170);
    expect(p.displayUnit).toBe("serving");
    expect(p.displayLabel).toBe("2 servings instant noodles");
  });
});
