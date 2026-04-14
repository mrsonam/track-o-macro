/**
 * Local wall-clock time for UI: 12-hour clock with am/pm (locale-aware).
 */
export function formatLocaleTime12h(
  input: Date | string | number,
  locales?: Intl.LocalesArgument,
): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(locales ?? undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
