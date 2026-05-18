export function activeDays14Blurb(daysWithLogs: number): string {
  if (daysWithLogs <= 0) {
    return "No logs in the last 14 days yet. When you’re ready, one entry is enough to restart.";
  }
  if (daysWithLogs >= 14) {
    return "You logged on all 14 days here. Remarkable consistency, but not something to chase every fortnight.";
  }
  if (daysWithLogs >= 10) {
    return "Most of the last 14 days had a log. That’s a soft rhythm; gaps don’t erase it.";
  }
  if (daysWithLogs >= 7) {
    return "About half or more of the last 14 days had a log. Enough signal without daily pressure.";
  }
  return "A lighter stretch of logging days. That happens. Picking a single anchor meal can steady the next two weeks.";
}
