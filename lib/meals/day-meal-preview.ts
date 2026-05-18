/** Lightweight meal row for Today dashboard lists (batch + day API). */
export type DayMealPreview = {
  id: string;
  rawInput: string;
  totalKcal: number;
  totalProteinG: number | null;
  createdAt: string;
};

export function mapMealToDayPreview(m: {
  id: string;
  rawInput: string;
  totalKcal: { toString(): string } | number;
  totalProteinG: { toString(): string } | number | null;
  createdAt: Date;
}): DayMealPreview {
  return {
    id: m.id,
    rawInput: m.rawInput,
    totalKcal: Math.round(Number(m.totalKcal) * 10) / 10,
    totalProteinG:
      m.totalProteinG != null
        ? Math.round(Number(m.totalProteinG) * 10) / 10
        : null,
    createdAt: m.createdAt.toISOString(),
  };
}
