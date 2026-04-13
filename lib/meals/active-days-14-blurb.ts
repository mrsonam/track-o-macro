/**
 * Recovery-friendly copy for “active days in last 14” (Epic 5).
 * Avoid streak language; blank days are normal.
 */
export function activeDays14Blurb(daysWithLogs: number): string {
  if (daysWithLogs <= 0) {
    return "No logs in the last 14 days yet — when you’re ready, one entry is enough to restart.";
  }
  if (daysWithLogs >= 14) {
    return "You logged on all 14 days here — remarkable consistency, but not something to chase every fortnight.";
  }
  if (daysWithLogs >= 10) {
    return "Most of the last 14 days had a log — that’s a soft rhythm; gaps don’t erase it.";
  }
  if (daysWithLogs * 2 >= 14) {
    return "About half or more of the last 14 days had a log — enough signal without daily pressure.";
  }
  return "A lighter stretch of logging days — that happens. Picking a single anchor meal can steady the next two weeks.";
}
