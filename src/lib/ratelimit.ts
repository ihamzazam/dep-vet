/**
 * Per-IP sliding-window rate limit (server, in-memory, best-effort per instance).
 * Deters anonymous bulk abuse of a no-signup tool without blocking real demo use.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

const hits = new Map<string, number[]>();

export interface RateResult {
  ok: boolean;
  retryAfterSec: number;
}

export function rateLimit(ip: string): RateResult {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const recent = (hits.get(ip) ?? []).filter((t) => t > cutoff);

  if (recent.length >= MAX_PER_WINDOW) {
    const retryAfterSec = Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000));
    hits.set(ip, recent);
    return { ok: false, retryAfterSec };
  }

  recent.push(now);
  hits.set(ip, recent);

  // opportunistic cleanup so the map doesn't grow unbounded
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      const live = v.filter((t) => t > cutoff);
      if (live.length === 0) hits.delete(k);
      else hits.set(k, live);
    }
  }
  return { ok: true, retryAfterSec: 0 };
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
