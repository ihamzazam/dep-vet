/**
 * OSV.dev client.
 *
 * CRITICAL research finding implemented here: `POST /v1/querybatch` returns ONLY
 * `{ id, modified }` per vuln — no severity, no details. So we:
 *   1. batch-query all (name, version) pairs in one call,
 *   2. collect the unique vuln IDs,
 *   3. fan out `GET /v1/vulns/{id}` (concurrency-capped, deduped) for full records,
 *   4. compute a CVSS base score from the raw vector (see cvss.ts) and bucket it.
 * Severity may be absent; we degrade to UNKNOWN rather than dropping the finding.
 */
import { fetchJson, mapLimit } from "./http";
import { severityFromOsv } from "./cvss";
import type { SeverityLabel } from "./types";

const OSV_BATCH = "https://api.osv.dev/v1/querybatch";
const OSV_VULN = "https://api.osv.dev/v1/vulns";

export interface OsvVuln {
  id: string; // preferred display id (CVE if available, else original)
  severityLabel: SeverityLabel;
  score: number | null;
  summary: string;
  /** First known fixed version for the queried package, if OSV provides one. */
  fixedVersion: string | null;
}

interface BatchResult {
  results?: Array<{ vulns?: Array<{ id: string; modified?: string }> }>;
}

interface VulnDetail {
  id: string;
  summary?: string;
  details?: string;
  aliases?: string[];
  severity?: Array<{ type?: string; score?: string }>;
  database_specific?: unknown;
  affected?: Array<{
    package?: { name?: string; ecosystem?: string };
    ranges?: Array<{
      type?: string;
      events?: Array<{ introduced?: string; fixed?: string }>;
    }>;
  }>;
}

export interface OsvQueryItem {
  name: string;
  version: string;
}

/**
 * Returns a map of package name -> its vulnerabilities (with computed severity).
 * Packages with no resolved version should not be passed in (avoids
 * over-reporting vulns that may not affect the installed range).
 */
export async function queryOsv(
  items: OsvQueryItem[],
  signal?: AbortSignal,
): Promise<Map<string, OsvVuln[]>> {
  const out = new Map<string, OsvVuln[]>();
  if (items.length === 0) return out;

  const batch = await fetchJson<BatchResult>(OSV_BATCH, {
    method: "POST",
    timeoutMs: 9000,
    signal,
    body: {
      queries: items.map((it) => ({
        version: it.version,
        package: { name: it.name, ecosystem: "npm" },
      })),
    },
  }).catch(() => null);

  if (!batch?.results) return out;

  // Map vuln id -> set of package names that hit it (to attach details back).
  const idToPackages = new Map<string, Set<string>>();
  batch.results.forEach((result, i) => {
    const name = items[i]?.name;
    if (!name || !result?.vulns?.length) return;
    for (const v of result.vulns) {
      if (!v.id) continue;
      if (!idToPackages.has(v.id)) idToPackages.set(v.id, new Set());
      idToPackages.get(v.id)!.add(name);
    }
  });

  const ids = [...idToPackages.keys()];
  if (ids.length === 0) return out;

  // Step 3: fan out for full records (deduped by id).
  const details = await mapLimit(ids, 8, async (id) => {
    const d = await fetchJson<VulnDetail>(`${OSV_VULN}/${id}`, {
      timeoutMs: 7000,
      signal,
    }).catch(() => null);
    return d;
  });

  details.forEach((detail, idx) => {
    if (!detail) return;
    const id = ids[idx];
    const sev = severityFromOsv(detail.severity, detail.database_specific);
    const displayId = preferCve(detail.id, detail.aliases);
    const summary =
      detail.summary?.trim() ||
      truncate(detail.details, 180) ||
      "Known advisory (no summary provided).";

    for (const pkgName of idToPackages.get(id) ?? []) {
      const fixedVersion = firstFixedVersion(detail, pkgName);
      const vuln: OsvVuln = {
        id: displayId,
        severityLabel: sev.label,
        score: sev.score,
        summary,
        fixedVersion,
      };
      if (!out.has(pkgName)) out.set(pkgName, []);
      out.get(pkgName)!.push(vuln);
    }
  });

  // Sort each package's vulns worst-first.
  for (const vulns of out.values()) vulns.sort((a, b) => sevRank(b) - sevRank(a));
  return out;
}

const SEV_ORDER: Record<SeverityLabel, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MODERATE: 2,
  LOW: 1,
  UNKNOWN: 0,
};
function sevRank(v: OsvVuln): number {
  return SEV_ORDER[v.severityLabel] * 100 + (v.score ?? 0);
}

function preferCve(id: string, aliases?: string[]): string {
  if (id.startsWith("CVE-")) return id;
  const cve = aliases?.find((a) => a.startsWith("CVE-"));
  return cve ?? id;
}

function firstFixedVersion(detail: VulnDetail, pkgName: string): string | null {
  for (const aff of detail.affected ?? []) {
    if (aff.package?.ecosystem && aff.package.ecosystem.toLowerCase() !== "npm")
      continue;
    if (aff.package?.name && aff.package.name !== pkgName) continue;
    for (const range of aff.ranges ?? []) {
      for (const ev of range.events ?? []) {
        if (ev.fixed) return ev.fixed;
      }
    }
  }
  return null;
}

function truncate(s: string | undefined, n: number): string {
  if (!s) return "";
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}
