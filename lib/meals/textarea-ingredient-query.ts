import { parseGramsFromSegment } from "@/lib/meals/parse-meal-grams";

/** Gram amount token, e.g. `100g` or leading `150g` in `150g chicken`. */
const GRAM_TOKEN_RE = /(\d+(?:\.\d+)?)\s*g\b/gi;

export const DEFAULT_SUGGESTION_GRAMS = 100;

export type CaretLineContext = {
  lineStart: number;
  line: string;
  caretInLine: number;
};

export function getCaretLineContext(value: string, caret: number): CaretLineContext {
  const safeCaret = Math.max(0, Math.min(caret, value.length));
  const before = value.slice(0, safeCaret);
  const lineStart = before.lastIndexOf("\n") + 1;
  const nextBreak = value.indexOf("\n", lineStart);
  const line = value.slice(
    lineStart,
    nextBreak === -1 ? value.length : nextBreak,
  );
  return { lineStart, line, caretInLine: safeCaret - lineStart };
}

/** Comma-delimited segment that contains the caret (single-line lists). */
export function getSegmentBounds(
  line: string,
  caretInLine: number,
): { start: number; end: number } {
  const bounds: { start: number; end: number }[] = [];
  let start = 0;
  for (let i = 0; i <= line.length; i++) {
    if (i === line.length || line[i] === ",") {
      bounds.push({ start, end: i });
      start = i + 1;
    }
  }
  if (bounds.length === 0) return { start: 0, end: line.length };

  for (const b of bounds) {
    if (caretInLine >= b.start && caretInLine <= b.end) return b;
  }
  return bounds[bounds.length - 1]!;
}

export function isCaretInIngredientAmountRegion(
  line: string,
  caretInLine: number,
): boolean {
  const { start, end } = getSegmentBounds(line, caretInLine);
  const segment = line.slice(start, end);
  const caretInSeg = caretInLine - start;
  const trimmed = segment.trim();

  if (/^(\d+(?:\.\d+)?)\s*g$/i.test(trimmed)) return true;

  const leadingOffset = segment.length - segment.trimStart().length;

  let match: RegExpExecArray | null;
  GRAM_TOKEN_RE.lastIndex = 0;
  while ((match = GRAM_TOKEN_RE.exec(segment)) !== null) {
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;
    if (caretInSeg >= matchStart && caretInSeg <= matchEnd) return true;

    const before = segment.slice(0, matchStart).trim();
    const after = segment.slice(matchEnd).trim();

    if (before.length === 0 && after.length > 0) {
      if (caretInSeg < matchEnd) return true;
      continue;
    }

    if (before.length > 0 && caretInSeg >= matchStart) return true;
  }

  const trailingNum = segment.match(/^(.*?)(\s+)(\d+(?:\.\d+)?)\s*$/);
  if (trailingNum && trailingNum[1]!.trim().length > 0) {
    const numStart =
      leadingOffset +
      trailingNum[1]!.length +
      (trailingNum[2]?.length ?? 0);
    if (caretInSeg >= numStart) return true;
  }

  return false;
}

/**
 * Food-name search query at caret; empty when caret is in the amount/grams region.
 */
export function extractTextareaIngredientQuery(
  value: string,
  caret: number,
): string {
  const { line, caretInLine } = getCaretLineContext(value, caret);
  if (!line.trim()) return "";

  if (isCaretInIngredientAmountRegion(line, caretInLine)) return "";

  const { start } = getSegmentBounds(line, caretInLine);
  let text = line.slice(start, caretInLine);

  text = text.replace(GRAM_TOKEN_RE, "");
  text = text.replace(/\s+\d+(?:\.\d+)?\s*$/i, "");

  const token = text.split(",").pop()?.trim() ?? "";
  return token;
}

/** Space-prefixed gram suffix for a segment; reuses existing grams when present. */
export function gramSuffixForLineSegment(
  segment: string,
  defaultGrams = DEFAULT_SUGGESTION_GRAMS,
): string {
  const grams = parseGramsFromSegment(segment);
  return grams != null ? ` ${grams}g` : ` ${defaultGrams}g`;
}

/** Gram suffix when inserting a picked label; skips if label or segment already has grams. */
export function amountSuffixForSuggestionLabel(
  segment: string,
  label: string,
  defaultGrams = DEFAULT_SUGGESTION_GRAMS,
): string {
  const trimmedLabel = label.trim();
  if (parseGramsFromSegment(trimmedLabel) != null) return "";
  return gramSuffixForLineSegment(segment, defaultGrams);
}

/** Replace the comma-segment at caret with a new food label, preserving grams once. */
export function replaceSegmentWithSuggestion(
  line: string,
  caretInLine: number,
  label: string,
  defaultGrams = DEFAULT_SUGGESTION_GRAMS,
): { line: string; caretOffset: number } {
  const { start, end } = getSegmentBounds(line, caretInLine);
  const segment = line.slice(start, end);
  const lead = segment.match(/^\s*/)?.[0] ?? "";
  const trimmedLabel = label.trim();
  const newSegment = `${lead}${trimmedLabel}${amountSuffixForSuggestionLabel(segment, label, defaultGrams)}`;
  return {
    line: line.slice(0, start) + newSegment + line.slice(end),
    caretOffset: start + lead.length + trimmedLabel.length,
  };
}

export function applyIngredientSuggestionToValue(
  value: string,
  caret: number,
  label: string,
  defaultGrams = DEFAULT_SUGGESTION_GRAMS,
): { next: string; nextCaret: number } {
  const { lineStart, line, caretInLine } = getCaretLineContext(value, caret);
  const nextBreak = value.indexOf("\n", lineStart);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  const { line: newLine, caretOffset } = replaceSegmentWithSuggestion(
    line,
    caretInLine,
    label,
    defaultGrams,
  );
  return {
    next: value.slice(0, lineStart) + newLine + value.slice(lineEnd),
    nextCaret: lineStart + caretOffset,
  };
}

export function appendIngredientSuggestionLine(
  value: string,
  label: string,
  defaultGrams = DEFAULT_SUGGESTION_GRAMS,
): string {
  const trimmedLabel = label.trim();
  const line = `${trimmedLabel}${amountSuffixForSuggestionLabel(trimmedLabel, label, defaultGrams)}`;
  const base = value.trimEnd();
  return base ? `${base}\n${line}` : line;
}
