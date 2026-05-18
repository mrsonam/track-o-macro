/**
 * Two-week logging lens (Epic 5, recovery-friendly, not a streak scoreboard).
 */
export function fortnightRhythmBlurb(
  daysWithLogs: number,
  daysInWindow: number,
): string {
  if (daysInWindow <= 0) return "";
  if (daysWithLogs <= 0) {
    return "Quiet fortnight on the log. When you want back in, one meal entry is enough to reopen the thread.";
  }
  const ratio = daysWithLogs / daysInWindow;
  if (ratio >= 0.92) {
    return "Most of these two weeks had at least one log. Steady without needing a daily chain.";
  }
  if (ratio >= 0.5) {
    return "Roughly half or more of the days had a log. Enough signal to notice patterns without chasing perfection.";
  }
  if (daysWithLogs >= 3) {
    return "A handful of logging days across two weeks still builds a picture. Blank stretches are normal.";
  }
  return "Few logging days in this window. That happens. Picking one easy anchor day often helps the next two weeks feel lighter.";
}
