/** Scroll to a trends in-page section (sticky header offset). */
export function scrollToTrendsSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;

  const offset = 100;
  const bodyTop = document.body.getBoundingClientRect().top;
  const elementTop = el.getBoundingClientRect().top;
  const top = elementTop - bodyTop - offset;
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.scrollTo({
    top,
    behavior: reducedMotion ? "auto" : "smooth",
  });
}
