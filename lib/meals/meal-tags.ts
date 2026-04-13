/** Epic 7 — normalize user meal tags for storage and filter matching. */

const MAX_TAGS = 8;
const MAX_TAG_LEN = 32;

export function normalizeMealTag(raw: string): string | null {
  const t = raw.trim().toLowerCase().replace(/\s+/g, "-").slice(0, MAX_TAG_LEN);
  return t.length > 0 ? t : null;
}

export function normalizeMealTags(input: string[] | undefined | null): string[] {
  if (!input?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of input) {
    const n = normalizeMealTag(typeof s === "string" ? s : "");
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
      if (out.length >= MAX_TAGS) break;
    }
  }
  return out;
}

/** Parse comma- or space-separated tags from a single string (for inputs). */
export function parseMealTagsFromText(raw: string): string[] {
  const parts = raw.split(/[,;]+|\s+/).map((x) => x.trim()).filter(Boolean);
  return normalizeMealTags(parts);
}
