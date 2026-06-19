import { analyzeManifest } from "@/lib/analyze";
import { fetchRepoManifest } from "@/lib/github";
import { getCachedReport, setCachedReport, manifestKey } from "@/lib/cache";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import type { AnalyzeResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const OVERALL_TIMEOUT_MS = 25_000;

export async function POST(request: Request) {
  // 1. per-IP throttle (no-signup tools are abuse magnets)
  const limit = rateLimit(clientIp(request));
  if (!limit.ok) {
    return Response.json(
      {
        error:
          "RATE LIMITED — too many scans from your network. Wait a few seconds and try again.",
      },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "MANIFEST UNREADABLE — request body was not valid JSON." },
      { status: 400 },
    );
  }

  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  let manifest = typeof obj.manifest === "string" ? obj.manifest : "";
  const repo = typeof obj.repo === "string" ? obj.repo.trim() : "";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OVERALL_TIMEOUT_MS);
  const started = Date.now();
  try {
    // 2. repo mode: fetch the manifest from GitHub, then analyze it like a paste
    if (repo) {
      const fetched = await fetchRepoManifest(repo, ctrl.signal);
      if (!fetched.ok) {
        return Response.json({ error: fetched.error }, { status: 400 });
      }
      manifest = fetched.manifest;
    }

    // 3. cache: identical manifests (the demo, judges, retries) return instantly
    const key = manifestKey(manifest);
    const cached = getCachedReport(key);
    if (cached) {
      const payload: AnalyzeResponse = { report: cached, elapsedMs: 0 };
      return Response.json(payload, { status: 200, headers: { "x-depvet-cache": "hit" } });
    }

    const outcome = await analyzeManifest(manifest, { signal: ctrl.signal });
    if (!outcome.ok) {
      return Response.json({ error: outcome.error }, { status: 400 });
    }
    setCachedReport(key, outcome.report);
    const payload: AnalyzeResponse = {
      report: outcome.report,
      elapsedMs: Date.now() - started,
    };
    return Response.json(payload, { status: 200, headers: { "x-depvet-cache": "miss" } });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return Response.json(
      {
        error: aborted
          ? "SCAN TIMED OUT — the registry/advisory feeds were slow. Try again or scan fewer packages."
          : "SCAN FAILED — an unexpected error occurred while analyzing the manifest.",
      },
      { status: aborted ? 504 : 500 },
    );
  } finally {
    clearTimeout(timer);
  }
}
