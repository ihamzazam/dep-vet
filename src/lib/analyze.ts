/**
 * Orchestrator: manifest text -> ScanReport.
 *
 * Pipeline (steps 1–3 fully deterministic; the AI layer comes Day 2):
 *   parse -> per-package npm meta+downloads+typosquat (concurrency-capped)
 *         -> OSV batch + vuln fan-out for resolved versions
 *         -> deterministic score -> assemble report (verdict, fixes, caught, tree)
 * Degrades gracefully: a failed source for one package never fails the report.
 */
import { parseManifest } from "./parse";
import { fetchNpmPackage, type NpmPackageData } from "./npm";
import { queryOsv } from "./osv";
import { detectTyposquat } from "./typosquat";
import { scorePackage, type ScoredPackage } from "./score";
import { enrichFlagged } from "./ai";
import { mapLimit } from "./http";
import type { OsvVuln } from "./osv";
import type { CaughtBanner, FixCard, PackageFinding, ScanReport } from "./types";

const CONCURRENCY = 8;
const HEALTHY_ROWS_SHOWN = 3;
const MAX_FIXES = 4;

export type AnalyzeOutcome =
  | { ok: true; report: ScanReport }
  | { ok: false; error: string };

export async function analyzeManifest(
  text: string,
  signal?: AbortSignal,
): Promise<AnalyzeOutcome> {
  const parsed = parseManifest(text);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const deps = parsed.deps;
  const now = Date.now();
  const warnings: string[] = [];

  // Step 1: npm metadata + downloads + typosquat (per package, capped).
  const npmData = await mapLimit(deps, CONCURRENCY, async (dep) => {
    try {
      return await fetchNpmPackage(dep.name, dep.range, signal);
    } catch {
      return null;
    }
  });

  const notFound = deps.filter((_, i) => !npmData[i] || !npmData[i]!.found).length;
  if (notFound > 0) {
    warnings.push(
      `${notFound} package${notFound === 1 ? "" : "s"} could not be resolved on the npm registry.`,
    );
  }

  // Step 2: OSV batch for packages with a resolved version.
  const osvItems: { name: string; version: string }[] = [];
  deps.forEach((dep, i) => {
    const v = npmData[i]?.resolvedVersion;
    if (v) osvItems.push({ name: dep.name, version: v });
  });
  let osvMap = new Map<string, OsvVuln[]>();
  try {
    osvMap = await queryOsv(osvItems, signal);
  } catch {
    warnings.push("Vulnerability feed (OSV) was unavailable — CVE results may be incomplete.");
  }

  // Step 3: score every package.
  const scored: ScoredPackage[] = deps.map((dep, i) => {
    const npm: NpmPackageData =
      npmData[i] ?? emptyNpm();
    const vulns = osvMap.get(dep.name) ?? [];
    const typo = detectTyposquat(dep.name);
    return scorePackage(dep, npm, vulns, typo, now);
  });

  // ---- assemble ----
  const counts = {
    critical: scored.filter((p) => p.status === "critical").length,
    warning: scored.filter((p) => p.status === "warning").length,
    healthy: scored.filter((p) => p.status === "healthy").length,
  };
  const mode: ScanReport["mode"] =
    counts.critical + counts.warning > 0 ? "mixed" : "healthy";

  const risky = scored
    .filter((p) => p.status !== "healthy")
    .sort((a, b) => b.priority - a.priority);
  const healthy = scored
    .filter((p) => p.status === "healthy")
    .sort((a, b) => a.name.localeCompare(b.name));

  const shownHealthy = healthy.slice(0, HEALTHY_ROWS_SHOWN);
  const hiddenHealthy = Math.max(0, healthy.length - shownHealthy.length);

  // AI synthesis layer — explains/prioritizes the deterministic findings.
  // Only invoked when there's something flagged (a clean manifest never calls
  // the model, so it can't manufacture risk). Fails open to null.
  const enrichment = await enrichFlagged(risky, signal);

  const packages = [...risky, ...shownHealthy].map((p) => {
    const finding = stripInternal(p);
    const note = enrichment?.notes.get(p.name);
    return note ? { ...finding, aiNote: note } : finding;
  });

  // caught banner: the typosquat-with-install-script hero moment
  let caught: CaughtBanner | null = null;
  const hero = scored.find((p) => p.isTyposquat && p.hasInstallScript);
  if (hero) {
    caught = {
      name: hero.name,
      version: hero.version,
      target: hero.typosquatTarget ?? "a popular package",
      hook: hero.stats.installScript.replace(/^⚑\s*/, "") || "postinstall",
      note: "NO OTHER SCANNER FLAGGED THIS",
    };
  }

  const fixes: FixCard[] = risky.slice(0, MAX_FIXES).map((p, i) => ({
    rank: String(i + 1).padStart(2, "0"),
    status: p.status,
    name: p.name,
    version: p.version,
    // Prefer the AI's plain-English reason; fall back to the deterministic one.
    reason: enrichment?.priorities.get(p.name) ?? p.fixReason,
    action: p.fixAction,
  }));

  const healthySummary = healthy
    .slice(0, 6)
    .map((p) => `${p.name}@${p.version}`);

  const report: ScanReport = {
    mode,
    total: deps.length,
    counts,
    caught,
    fixes,
    packages,
    hiddenHealthy,
    healthySummary,
    warnings: warnings.length ? warnings : undefined,
  };
  return { ok: true, report };
}

function stripInternal(p: ScoredPackage): PackageFinding {
  return {
    name: p.name,
    version: p.version,
    status: p.status,
    tags: p.tags,
    summaryRight: p.summaryRight,
    description: p.description,
    vulns: p.vulns,
    stats: p.stats,
    action: p.action,
  };
}

function emptyNpm(): NpmPackageData {
  return {
    found: false,
    resolvedVersion: null,
    latest: null,
    lastPublishIso: null,
    maintainers: null,
    deprecated: null,
    hasInstallScript: false,
    installHooks: [],
    weeklyDownloads: null,
  };
}
