import { describe, expect, it } from "vitest";
import { healthSampleDedupeKey } from "@/lib/health/dedupe-key";
import { normalizeHealthSampleInput } from "@/lib/health/normalize";
import { rollupAppleHealthSamplesInRange } from "@/lib/health/apple-day-rollup";

describe("healthSampleDedupeKey", () => {
  it("is stable for fingerprint path", () => {
    const d = new Date("2026-04-22T12:00:00.000Z");
    const a = healthSampleDedupeKey({
      userId: "u1",
      metricType: "steps",
      recordedAt: d,
      value: 5000,
      unit: "count",
      externalId: null,
    });
    const b = healthSampleDedupeKey({
      userId: "u1",
      metricType: "steps",
      recordedAt: d,
      value: 5000,
      unit: "count",
      externalId: null,
    });
    expect(a).toBe(b);
    expect(a.length).toBe(64);
  });

  it("uses externalId when provided", () => {
    const d = new Date("2026-04-22T12:00:00.000Z");
    const k = healthSampleDedupeKey({
      userId: "u1",
      metricType: "steps",
      recordedAt: d,
      value: 1,
      unit: "count",
      externalId: "HK-123",
    });
    expect(k).toContain("u1:");
    expect(k).toContain("HK-123");
  });
});

describe("normalizeHealthSampleInput", () => {
  it("normalizes steps", () => {
    const r = normalizeHealthSampleInput({
      type: "steps",
      value: 8421,
      unit: "count",
      recordedAt: new Date("2026-04-22T00:00:00Z"),
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.metricType).toBe("steps");
      expect(r.data.value).toBe(8421);
      expect(r.data.unit).toBe("count");
    }
  });

  it("converts weight from lb to kg", () => {
    const r = normalizeHealthSampleInput({
      type: "weight",
      value: 220,
      unit: "lb",
      recordedAt: new Date("2026-04-22T00:00:00Z"),
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.metricType).toBe("weight");
      expect(r.data.unit).toBe("kg");
      expect(r.data.value).toBeGreaterThan(99);
      expect(r.data.value).toBeLessThan(100);
    }
  });

  it("converts active energy from kj to kcal", () => {
    const r = normalizeHealthSampleInput({
      type: "active_energy",
      value: 4184,
      unit: "kj",
      recordedAt: new Date("2026-04-22T00:00:00Z"),
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.unit).toBe("kcal");
      expect(r.data.value).toBeCloseTo(1000, 0);
    }
  });
});

describe("rollupAppleHealthSamplesInRange", () => {
  it("aggregates steps with max and sums sleep minutes", () => {
    const from = new Date("2026-04-22T00:00:00Z");
    const to = new Date("2026-04-23T00:00:00Z");
    const rows = [
      {
        metricType: "steps",
        value: 1000,
        unit: "count",
        recordedAt: new Date("2026-04-22T08:00:00Z"),
      },
      {
        metricType: "steps",
        value: 9000,
        unit: "count",
        recordedAt: new Date("2026-04-22T18:00:00Z"),
      },
      {
        metricType: "sleep",
        value: 240,
        unit: "min",
        recordedAt: new Date("2026-04-22T10:00:00Z"),
      },
      {
        metricType: "sleep",
        value: 60,
        unit: "min",
        recordedAt: new Date("2026-04-22T11:00:00Z"),
      },
    ];
    const r = rollupAppleHealthSamplesInRange(rows, from, to);
    expect(r.steps).toBe(9000);
    expect(r.sleepMinutes).toBe(300);
  });
});
