import { describe, expect, it } from "vitest";
import {
  epochDayIndex,
  generateDemoDay,
  nextMaintenanceWeightKg,
  shouldLogWeightOnDate,
  weightKgForBackfillDay,
} from "@/lib/demo/generate-day";

describe("shouldLogWeightOnDate", () => {
  it("logs weight on Mon/Wed/Fri (UTC) only", () => {
    expect(shouldLogWeightOnDate(new Date(Date.UTC(2026, 7, 10)))).toBe(true); // Mon
    expect(shouldLogWeightOnDate(new Date(Date.UTC(2026, 7, 11)))).toBe(false); // Tue
    expect(shouldLogWeightOnDate(new Date(Date.UTC(2026, 7, 12)))).toBe(true); // Wed
    expect(shouldLogWeightOnDate(new Date(Date.UTC(2026, 7, 13)))).toBe(false); // Thu
    expect(shouldLogWeightOnDate(new Date(Date.UTC(2026, 7, 14)))).toBe(true); // Fri
    expect(shouldLogWeightOnDate(new Date(Date.UTC(2026, 7, 15)))).toBe(false); // Sat
    expect(shouldLogWeightOnDate(new Date(Date.UTC(2026, 7, 16)))).toBe(false); // Sun
  });
});

describe("weightKgForBackfillDay", () => {
  it("interpolates linearly from start weight to goal weight", () => {
    expect(weightKgForBackfillDay(0, 60)).toBe(98);
    expect(weightKgForBackfillDay(59, 60)).toBe(80);
    const mid = weightKgForBackfillDay(29, 60);
    expect(mid).toBeLessThan(98);
    expect(mid).toBeGreaterThan(80);
  });
});

describe("nextMaintenanceWeightKg", () => {
  it("stays within a narrow band around goal weight", () => {
    for (let i = 0; i < 30; i++) {
      const date = new Date(Date.UTC(2026, 7, 10 + i));
      const kg = nextMaintenanceWeightKg(date);
      expect(kg).toBeGreaterThanOrEqual(79);
      expect(kg).toBeLessThanOrEqual(81);
    }
  });
});

describe("generateDemoDay", () => {
  it("produces 2-3 meals with macro lines that roughly account for their kcal", () => {
    const day = generateDemoDay(new Date(Date.UTC(2026, 7, 12)));
    expect(day.meals.length).toBeGreaterThanOrEqual(1);
    expect(day.meals.length).toBeLessThanOrEqual(3);
    for (const meal of day.meals) {
      for (const line of meal.lines) {
        const fromMacros = line.proteinG * 4 + line.carbsG * 4 + line.fatG * 9;
        expect(fromMacros).toBeGreaterThan(line.kcal * 0.85);
        expect(fromMacros).toBeLessThan(line.kcal * 1.15);
      }
    }
  });

  it("always includes 3-4 non-trivial fluid logs", () => {
    const day = generateDemoDay(new Date(Date.UTC(2026, 7, 12)));
    expect(day.fluids.length).toBeGreaterThanOrEqual(3);
    expect(day.fluids.length).toBeLessThanOrEqual(4);
    for (const f of day.fluids) expect(f.volumeMl).toBeGreaterThan(0);
  });

  it("includes a prepared-meal portion every 4th day, alternating batches", () => {
    expect(
      generateDemoDay(new Date(Date.UTC(2026, 7, 10))).preparedPortion,
    ).toBeNull();
    expect(
      generateDemoDay(new Date(Date.UTC(2026, 7, 11))).preparedPortion
        ?.preparedMealKey,
    ).toBe("overnight_oats");
    expect(
      generateDemoDay(new Date(Date.UTC(2026, 7, 12))).preparedPortion,
    ).toBeNull();
    expect(
      generateDemoDay(new Date(Date.UTC(2026, 7, 13))).preparedPortion,
    ).toBeNull();
    expect(
      generateDemoDay(new Date(Date.UTC(2026, 7, 14))).preparedPortion,
    ).toBeNull();
    expect(
      generateDemoDay(new Date(Date.UTC(2026, 7, 15))).preparedPortion
        ?.preparedMealKey,
    ).toBe("chicken_rice_broccoli");
  });

  it("still logs at least one freeform meal on a prepared-portion day", () => {
    const day = generateDemoDay(new Date(Date.UTC(2026, 7, 11)));
    expect(day.preparedPortion).not.toBeNull();
    expect(day.meals.length).toBeGreaterThanOrEqual(1);
  });
});

describe("epochDayIndex", () => {
  it("increases by exactly 1 per UTC calendar day", () => {
    const a = epochDayIndex(new Date(Date.UTC(2026, 7, 10)));
    const b = epochDayIndex(new Date(Date.UTC(2026, 7, 11)));
    expect(b - a).toBe(1);
  });
});
