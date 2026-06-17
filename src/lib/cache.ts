/**
 * In-memory result cache (server). Keyed by a hash of the normalized manifest.
 *
 * Why: a no-signup bulk tool gets the same manifests scanned repeatedly (the
 * demo, judges, retries). Caching the whole report makes repeats instant and
 * spares OSV/npm the load. Module-level Map persists across requests on a warm
 * serverless instance — best-effort, per-instance (swap for Vercel KV later for
 * cross-instance sharing). TTL keeps results reasonably fresh.
 */
import { createHash } from "node:crypto";
import type { ScanReport } from "./types";

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ENTRIES = 200;

interface Entry {
  report: ScanReport;
  expires: number;
}

const store = new Map<string, Entry>();

export function manifestKey(text: string): string {
  // normalize whitespace so cosmetically-different-but-equal manifests share a key
  const normalized = text.replace(/\s+/g, " ").trim();
  return createHash("sha256").update(normalized).digest("hex");
}

export function getCachedReport(key: string): ScanReport | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    store.delete(key);
    return null;
  }
  // LRU touch: re-insert to mark most-recently-used
  store.delete(key);
  store.set(key, hit);
  return hit.report;
}

export function setCachedReport(key: string, report: ScanReport): void {
  store.set(key, { report, expires: Date.now() + TTL_MS });
  // evict oldest while over capacity
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}
