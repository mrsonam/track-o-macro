import { describe, expect, it } from "vitest";
import {
  applyGramsFromRawInput,
  fallbackParseIngredientsFromText,
  parseGramsFromSegment,
} from "@/lib/meals/parse-meal-grams";

describe("parseGramsFromSegment", () => {
  it("reads grams before or after the food name", () => {
    expect(parseGramsFromSegment("chicken breast 150g")).toBe(150);
    expect(parseGramsFromSegment("80 g rice")).toBe(80);
  });
});

describe("applyGramsFromRawInput", () => {
  it("overrides LLM default 100 g when the user wrote another amount", () => {
    const raw = "chicken breast 150g\neggs 80g";
    const parsed = [
      { name: "chicken breast", quantity_g: 100, search_query: "chicken breast" },
      { name: "eggs", quantity_g: 100, search_query: "eggs" },
    ];
    const out = applyGramsFromRawInput(parsed, raw);
    expect(out[0]!.quantity_g).toBe(150);
    expect(out[1]!.quantity_g).toBe(80);
  });

  it("matches ingredients to segments when counts differ", () => {
    const raw = "150g chicken, 50g olive oil";
    const parsed = [
      { name: "chicken", quantity_g: 100 },
      { name: "olive oil", quantity_g: 100 },
    ];
    const out = applyGramsFromRawInput(parsed, raw);
    expect(out[0]!.quantity_g).toBe(150);
    expect(out[1]!.quantity_g).toBe(50);
  });
});

describe("fallbackParseIngredientsFromText", () => {
  it("uses written grams instead of always defaulting to 100", () => {
    const { ingredients } = fallbackParseIngredientsFromText("rice 120g, salad");
    expect(ingredients[0]!.quantity_g).toBe(120);
    expect(ingredients[1]!.quantity_g).toBe(100);
  });
});
