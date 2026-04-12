/**
 * Guess two parts from a single meal description (first blank line, else first newline).
 */
export function defaultSplitParts(raw: string): { partA: string; partB: string } {
  const t = raw.trim();
  const dbl = t.indexOf("\n\n");
  if (dbl !== -1) {
    return {
      partA: t.slice(0, dbl).trim(),
      partB: t.slice(dbl + 2).trim(),
    };
  }
  const nl = t.indexOf("\n");
  if (nl !== -1) {
    return {
      partA: t.slice(0, nl).trim(),
      partB: t.slice(nl + 1).trim(),
    };
  }
  return { partA: t, partB: "" };
}
