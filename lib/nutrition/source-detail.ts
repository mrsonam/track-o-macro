/**
 * Helpers for Epic 3 — transparent sourcing in the meal breakdown UI.
 */

export function foodDataCentralNutrientsUrl(fdcId: number): string {
  return `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${fdcId}/nutrients`;
}

/**
 * Prefer API-provided USDA URL; otherwise deep-link to FDC when we have an id.
 */
export function resolveUsdaLink(
  detail: Record<string, unknown>,
  fdcId: number | null,
): string | null {
  const raw = detail.usda_link;
  if (typeof raw === "string" && /^https?:\/\//i.test(raw.trim())) {
    return raw.trim();
  }
  if (fdcId != null && Number.isFinite(fdcId) && fdcId > 0) {
    return foodDataCentralNutrientsUrl(Math.floor(fdcId));
  }
  return null;
}

/**
 * Human-readable confidence / match hints from resolver metadata (not medical claims).
 */
export function formatSourceConfidence(
  detail: Record<string, unknown>,
): string | null {
  const chunks: string[] = [];

  const mq = detail.match_quality;
  if (typeof mq === "string" && mq.trim()) {
    chunks.push(`Match: ${mq.trim()}`);
  }

  const ac = detail.avocavo_confidence;
  if (typeof ac === "number" && Number.isFinite(ac)) {
    if (ac >= 0 && ac <= 1) {
      chunks.push(`Model score: ${Math.round(ac * 100)}%`);
    } else {
      chunks.push(`Model score: ${ac}`);
    }
  } else if (typeof ac === "string" && ac.trim()) {
    chunks.push(`Model score: ${ac.trim()}`);
  }

  const conf = detail.confidence;
  if (typeof conf === "string" && conf.trim()) {
    chunks.push(conf.trim());
  }

  return chunks.length > 0 ? chunks.join(" · ") : null;
}

export function fdcDescriptionText(
  detail: Record<string, unknown>,
): string | null {
  const d = detail.fdc_description;
  if (typeof d !== "string") return null;
  const t = d.trim();
  return t.length > 0 ? t : null;
}

/** User-saved food or merge note from resolver. */
export function sourceNoteFromDetail(
  detail: Record<string, unknown>,
): string | null {
  const note = detail.note;
  if (typeof note === "string" && note.trim()) return note.trim();
  return null;
}
