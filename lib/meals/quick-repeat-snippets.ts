/**
 * User-defined quick phrases for the log screen (browser-only, not synced).
 */

export type QuickSnippet = {
  id: string;
  label: string;
  text: string;
};

const STORAGE_KEY = "calorie:pwa:quickSnippets:v1";
const MAX_SNIPPETS = 14;
const MAX_LABEL = 48;
const MAX_TEXT = 800;

export const STARTER_QUICK_PATTERNS: ReadonlyArray<{
  label: string;
  text: string;
}> = [
  { label: "Black coffee", text: "Black coffee, 12 oz" },
  { label: "Protein shake", text: "Protein powder, 1 scoop, mixed with water" },
  { label: "Greek yogurt", text: "Plain Greek yogurt, 170g" },
  { label: "Banana", text: "Banana, 1 medium" },
  { label: "Eggs", text: "Large eggs, 2, scrambled with cooking spray" },
  { label: "Salad", text: "Mixed greens salad with olive oil and vinegar" },
];

function clampLabel(s: string) {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= MAX_LABEL) return t;
  return `${t.slice(0, MAX_LABEL - 1)}…`;
}

function clampText(s: string) {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= MAX_TEXT) return t;
  return `${t.slice(0, MAX_TEXT - 1).trim()}…`;
}

export function loadQuickSnippets(): QuickSnippet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: QuickSnippet[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const id = (row as { id?: unknown }).id;
      const label = (row as { label?: unknown }).label;
      const text = (row as { text?: unknown }).text;
      if (
        typeof id === "string" &&
        id.length > 0 &&
        typeof label === "string" &&
        typeof text === "string" &&
        text.trim().length > 0
      ) {
        out.push({
          id,
          label: clampLabel(label),
          text: clampText(text),
        });
      }
    }
    return out.slice(0, MAX_SNIPPETS);
  } catch {
    return [];
  }
}

export function persistQuickSnippets(items: QuickSnippet[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_SNIPPETS)),
    );
  } catch {
    /* ignore quota */
  }
}

export function addQuickSnippet(
  items: QuickSnippet[],
  label: string,
  text: string,
): QuickSnippet[] {
  const t = clampText(text);
  const l = clampLabel(label || t.slice(0, 24));
  if (!t) return items;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const next = [{ id, label: l, text: t }, ...items.filter((x) => x.text !== t)];
  return next.slice(0, MAX_SNIPPETS);
}

export function removeQuickSnippet(
  items: QuickSnippet[],
  id: string,
): QuickSnippet[] {
  return items.filter((x) => x.id !== id);
}
