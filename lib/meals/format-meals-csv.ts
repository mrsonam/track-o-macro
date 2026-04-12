type MealCsvRow = {
  id: string;
  createdAt: Date;
  rawInput: string;
  totalKcal: number;
  totalProteinG: number | null;
  totalCarbsG: number | null;
  totalFatG: number | null;
};

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function numOrEmpty(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "";
  return String(n);
}

/**
 * UTF-8 BOM prefix helps Excel on Windows recognize encoding.
 */
export function formatMealsCsv(rows: MealCsvRow[]): string {
  const header = [
    "id",
    "created_at_iso",
    "raw_input",
    "total_kcal",
    "total_protein_g",
    "total_carbs_g",
    "total_fat_g",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.id),
        csvCell(r.createdAt.toISOString()),
        csvCell(r.rawInput),
        csvCell(String(r.totalKcal)),
        csvCell(numOrEmpty(r.totalProteinG)),
        csvCell(numOrEmpty(r.totalCarbsG)),
        csvCell(numOrEmpty(r.totalFatG)),
      ].join(","),
    );
  }
  return `\ufeff${lines.join("\r\n")}`;
}
