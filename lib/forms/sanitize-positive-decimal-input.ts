/** Digits and at most one decimal point (empty allowed while typing). */
export function sanitizePositiveDecimalInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const dotIndex = cleaned.indexOf(".");
  if (dotIndex === -1) return cleaned;
  return (
    cleaned.slice(0, dotIndex + 1) + cleaned.slice(dotIndex + 1).replace(/\./g, "")
  );
}
