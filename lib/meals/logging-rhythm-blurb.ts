/**
 * Supportive copy for how many calendar days had any log (Epic 5 — adherence
 * without streak-shaming). Avoid guilt; blank days are normal.
 */
export function loggingRhythmBlurb(
  daysWithLogs: number,
  daysInWindow: number,
): string {
  if (daysInWindow <= 0) return "";
  if (daysWithLogs <= 0) {
    return "No logs in this window yet—one small entry is enough to get momentum back.";
  }
  if (daysWithLogs >= daysInWindow) {
    return "At least one log every day here—steady rhythm without needing perfection.";
  }
  if (daysWithLogs === daysInWindow - 1) {
    return "Almost every day had a log—quiet days are normal.";
  }
  if (daysWithLogs * 2 >= daysInWindow) {
    return "Most days had a log—small consistency tends to compound.";
  }
  return "Fewer logging days in this stretch—that happens. Anchoring one repeatable meal can make the next week easier.";
}
