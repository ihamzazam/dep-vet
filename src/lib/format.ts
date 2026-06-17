/** Display formatting helpers (server + client safe, no deps). */

/** 48200000 -> "48.2M", 3412 -> "3,412", 1200000 -> "1.2M". */
export function humanizeDownloads(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    // keep exact-ish for thousands: "3,412" reads as more precise/credible
    if (n < 100_000) return n.toLocaleString("en-US");
    return `${(n / 1000).toFixed(0)}k`;
  }
  if (n < 1_000_000_000) {
    const m = n / 1_000_000;
    return `${m >= 100 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  return `${(n / 1_000_000_000).toFixed(1)}B`;
}

/** Compact form for the right-rail summary, e.g. "48M/wk". */
export function compactDownloads(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  if (n < 1_000_000_000) {
    const m = n / 1_000_000;
    return `${m >= 100 ? m.toFixed(0) : m.toFixed(0)}M`;
  }
  return `${(n / 1_000_000_000).toFixed(1)}B`;
}

/** ISO date string -> "6 days ago" / "4 mo ago" / "2.1 yrs ago". */
export function relativeTime(
  iso: string | null | undefined,
  now: number = Date.now(),
): string {
  if (!iso) return "unknown";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";
  const days = (now - then) / 86_400_000;
  if (days < 1) return "today";
  if (days < 2) return "1 day ago";
  if (days < 45) return `${Math.round(days)} days ago`;
  const months = days / 30.44;
  if (months < 18) return `${Math.round(months)} mo ago`;
  const years = days / 365.25;
  return `${years.toFixed(1)} yrs ago`;
}

/** Months since a date (for abandonment checks). */
export function monthsSince(
  iso: string | null | undefined,
  now: number = Date.now(),
): number {
  if (!iso) return 0;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return (now - then) / (86_400_000 * 30.44);
}

/** Strip a range operator to a plain version-ish string for display fallbacks. */
export function stripRange(range: string): string {
  return range.replace(/^[\^~>=<\s]+/, "").trim();
}
