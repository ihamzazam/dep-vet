/**
 * Server-side HTTP helpers shared by the OSV and npm clients.
 *
 * Research-driven choices:
 *  - Descriptive User-Agent (be a good API citizen; npm anti-abuse).
 *  - Per-request timeout via AbortController (never let one hung call block the report).
 *  - 429-aware retry honoring Retry-After (npm rate limits are undocumented; only
 *    reliable signal is 429).
 *  - mapLimit() to cap concurrency across many packages.
 */

export const USER_AGENT =
  "DepVet/0.9 (+https://github.com/depvet; supply-chain scanner; contact via repo)";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

interface FetchOpts {
  accept?: string;
  timeoutMs?: number;
  retries?: number;
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
}

async function once(url: string, opts: FetchOpts): Promise<Response> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 7000);
  // chain caller-supplied abort
  if (opts.signal) {
    if (opts.signal.aborted) ctrl.abort();
    else opts.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  try {
    return await fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        "user-agent": USER_AGENT,
        accept: opts.accept ?? "application/json",
        ...(opts.method === "POST" ? { "content-type": "application/json" } : {}),
      },
      body: opts.method === "POST" ? JSON.stringify(opts.body) : undefined,
      signal: ctrl.signal,
      // npm/OSV are public; no credentials
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

/** Fetch JSON with timeout + one 429/5xx retry. Returns null on 404. */
export async function fetchJson<T>(
  url: string,
  opts: FetchOpts = {},
): Promise<T | null> {
  const retries = opts.retries ?? 1;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await once(url, opts);
      if (res.status === 404) return null;
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const waitMs = Number.isFinite(retryAfter)
          ? retryAfter * 1000
          : 400 * (attempt + 1);
        if (attempt < retries) {
          await sleep(Math.min(waitMs, 2500));
          continue;
        }
        throw new HttpError(`HTTP ${res.status} for ${url}`, res.status);
      }
      if (!res.ok) throw new HttpError(`HTTP ${res.status} for ${url}`, res.status);
      return (await res.json()) as T;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        await sleep(300 * (attempt + 1));
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Run `fn` over `items` with at most `limit` in flight; preserves order. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
