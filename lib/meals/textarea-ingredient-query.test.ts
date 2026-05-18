import { describe, expect, it } from "vitest";
import {
  applyIngredientSuggestionToValue,
  appendIngredientSuggestionLine,
  extractTextareaIngredientQuery,
  isCaretInIngredientAmountRegion,
} from "@/lib/meals/textarea-ingredient-query";

describe("extractTextareaIngredientQuery", () => {
  it("returns food text when caret is in the name", () => {
    expect(extractTextareaIngredientQuery("Egg 100g", 3)).toBe("Egg");
    expect(extractTextareaIngredientQuery("chicken breast 150g", 7)).toBe(
      "chicken",
    );
    expect(extractTextareaIngredientQuery("150g chicken", 13)).toBe("chicken");
  });

  it("returns empty when caret is in grams", () => {
    expect(extractTextareaIngredientQuery("Egg 100g", 5)).toBe("");
    expect(extractTextareaIngredientQuery("Egg 100g", 7)).toBe("");
    expect(extractTextareaIngredientQuery("chicken breast 150g", 16)).toBe("");
    expect(extractTextareaIngredientQuery("150g chicken", 2)).toBe("");
  });

  it("handles comma-separated lines", () => {
    const line = "eggs, spinach 80g";
    expect(extractTextareaIngredientQuery(line, 4)).toBe("eggs");
    expect(extractTextareaIngredientQuery(line, 13)).toBe("spinach");
    expect(extractTextareaIngredientQuery(line, 16)).toBe("");
  });

  it("returns empty for amount-only segment after comma", () => {
    expect(extractTextareaIngredientQuery("eggs, 400g", 8)).toBe("");
  });
});

describe("applyIngredientSuggestionToValue", () => {
  it("replaces food on a line that already has grams without duplicating g", () => {
    const { next, nextCaret } = applyIngredientSuggestionToValue(
      "Egg 100g",
      2,
      "Chicken breast",
    );
    expect(next).toBe("Chicken breast 100g");
    expect(nextCaret).toBe("Chicken breast".length);
  });

  it("preserves grams when swapping food mid-line", () => {
    const { next } = applyIngredientSuggestionToValue(
      "eggs, spinach 80g",
      10,
      "kale",
    );
    expect(next).toBe("eggs, kale 80g");
  });

  it("adds default grams only when the segment had none", () => {
    const { next } = applyIngredientSuggestionToValue("spinach", 7, "kale");
    expect(next).toBe("kale 100g");
  });
});

describe("appendIngredientSuggestionLine", () => {
  it("does not double grams when the label already includes them", () => {
    expect(appendIngredientSuggestionLine("", "Rice 200g")).toBe("Rice 200g");
  });
});

describe("isCaretInIngredientAmountRegion", () => {
  it("detects trailing and leading gram regions", () => {
    expect(isCaretInIngredientAmountRegion("Egg 100g", 6)).toBe(true);
    expect(isCaretInIngredientAmountRegion("Egg 100g", 2)).toBe(false);
    expect(isCaretInIngredientAmountRegion("150g chicken", 2)).toBe(true);
    expect(isCaretInIngredientAmountRegion("150g chicken", 8)).toBe(false);
  });
});
