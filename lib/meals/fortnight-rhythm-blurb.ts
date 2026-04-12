/**
 * Two-week logging lens (Epic 5 — recovery-friendly, not a streak scoreboard).
 */
export function fortnightRhythmBlurb(
  daysWithLogs: number,
  daysInWindow: number,
): string {
  if (daysInWindow <= 0) return "";
  if (daysWithLogs <= 0) {
    return "Quiet fortnight on the log—when you want back in, one meal entry is enough to reopen the thread.";
  }
  const ratio = daysWithLogs / daysInWindow;
  if (ratio >= 0.86) {
    return "Most of these two weeks had at least one log—steady without needing a daily chain.";
  }
  if (ratio >= 0.57) {
    return "Roughly half or more of the days had a log—enough signal to notice patterns without chasing perfection.";
  }
  if (daysWithLogs >= 4) {
    return "A handful of logging days across two weeks still builds a picture—blank stretches are normal.";
  }
  return "Few logging days in this window—that happens. Picking one easy anchor day often helps the next two weeks feel lighter.";
}
