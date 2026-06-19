/**
 * Orchestrator: manifest text -> ScanReport.
 *
 * Pipeline (detection fully deterministic; AI only explains):
 *   parse -> per-package npm meta+downloads+typosquat (concurrency-capped)
 *         -> OSV batch + vuln fan-out for resolved versions
 *         -> deterministic score
 *         -> [parallel, both fail-open + bounded] transitive lane (deps.dev) + AI
 *         -> assemble report (verdict line, fixes, caught, tree, transitive)
 * Degrades gracefully everywhere: a failed source never fails the whole report.
 */
import { parseManifest } from "./parse";
import { fetchNpmPackage, type NpmPackageData } from "./npm";
import { queryOsv, type OsvVuln } from "./osv";
import { detectTyposquat } from "./typosquat";
import { scorePackage, type ScoredPackage } from "./score";
import { enrichFlagged, type AiSummary, type AiEnrichment } from "./ai";
import { fetchTransitiveNodes } from "./depsdev";
import { mapLimit, withTimeout } from "./http";
import type {
  CaughtBanner,
  FixCard,
  PackageFinding,
  ScanReport,
  TransitiveFinding,
  TransitiveReport,
} from "./types";

const CONCURRENCY = 8;
const HEALTHY_ROWS_SHOWN = 3;
const MAX_FIXES = 4;

// Transitive (deps.dev) lane bounds — keep it cheap and fail-open.
const T_MAX_EXPAND = 40; // direct deps whose subtree we resolve
const T_MAX_NODES = 300; // cap on distinct transitive packages
const T_CONCURRENCY = 6;
const T_TIMEOUT_MS = 9000;

export type AnalyzeOutcome =
  | { ok: true; report: ScanReport }
  | { ok: false; error: string };

export async function analyzeManifest(
  text: string,
  opts: { signal?: AbortSignal; ai?: boolean } = {},
): Promise<AnalyzeOutcome> {
  // `ai` defaults on for POST /api/analyze; the crawlable /pkg path passes
  // ai:false so bots can't run up the paid AI bill.
  const { signal, ai = true } = opts;
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
    const npm: NpmPackageData = npmData[i] ?? emptyNpm();
    const vulns = osvMap.get(dep.name) ?? [];
    const typo = detectTyposquat(dep.name);
    return scorePackage(dep, npm, vulns, typo, now);
  });

  const counts = {
    critical: scored.filter((p) => p.status === "critical").length,
    warning: scored.filter((p) => p.status === "warning").length,
    healthy: scored.filter((p) => p.status === "healthy").length,
  };

  const risky = scored
    .filter((p) => p.status !== "healthy")
    .sort((a, b) => b.priority - a.priority);
  const healthy = scored
    .filter((p) => p.status === "healthy")
    .sort((a, b) => a.name.localeCompare(b.name));
  const shownHealthy = healthy.slice(0, HEALTHY_ROWS_SHOWN);
  const hiddenHealthy = Math.max(0, healthy.length - shownHealthy.length);

  // Step 4 (parallel): transitive depth (deps.dev) + AI synthesis. Both are
  // bounded and fail open — neither can break or stall the direct report.
  const directVersioned = deps
    .map((d, i) => ({ name: d.name, version: npmData[i]?.resolvedVersion }))
    .filter((d): d is { name: string; version: string } => !!d.version);
  const directNames = new Set(deps.map((d) => d.name));
  const aiSummary: AiSummary = {
    critical: counts.critical,
    warning: counts.warning,
    healthy: counts.healthy,
    total: deps.length,
    transitiveFlagged: 0,
  };

  const [transitive, enrichment] = await Promise.all([
    withTimeout<TransitiveReport | undefined>(
      runTransitiveLane(directVersioned, directNames, signal),
      T_TIMEOUT_MS,
      undefined,
    ),
    ai
      ? withTimeout<AiEnrichment | null>(enrichFlagged(risky, aiSummary, signal), 12_000, null)
      : Promise.resolve<AiEnrichment | null>(null),
  ]);

  const transitiveFlagged = transitive?.flagged.length ?? 0;
  const mode: ScanReport["mode"] =
    counts.critical + counts.warning > 0 || transitiveFlagged > 0 ? "mixed" : "healthy";

  const packages = [...risky, ...shownHealthy].map((p) => {
    const finding = stripInternal(p);
    const note = enrichment?.notes.get(p.name);
    return note ? { ...finding, aiNote: note } : finding;
  });
  const morePackages = healthy.slice(HEALTHY_ROWS_SHOWN).map(stripInternal);

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
    bumpKind: p.bumpKind,
  }));

  const healthySummary = healthy.slice(0, 6).map((p) => `${p.name}@${p.version}`);

  const verdictLine =
    enrichment?.verdictLine ?? deterministicVerdict(mode, counts, deps.length, transitive, risky);

  const report: ScanReport = {
    mode,
    total: deps.length,
    counts,
    verdictLine,
    transitive,
    caught,
    fixes,
    packages,
    morePackages: morePackages.length ? morePackages : undefined,
    hiddenHealthy,
    healthySummary,
    warnings: warnings.length ? warnings : undefined,
  };
  return { ok: true, report };
}

/**
 * Resolve the transitive subtree of the direct deps via deps.dev, then run the
 * existing OSV query over the deduped transitive set, surfacing ONLY
 * HIGH/CRITICAL findings with "via <direct dep>" provenance (ranked, not flooded).
 */
async function runTransitiveLane(
  directVersioned: { name: string; version: string }[],
  directNames: Set<string>,
  signal?: AbortSignal,
): Promise<TransitiveReport | undefined> {
  if (directVersioned.length === 0) return undefined;
  const toExpand = directVersioned.slice(0, T_MAX_EXPAND);

  // key "name@version" -> { name, version, via }
  const nodes = new Map<string, { name: string; version: string; via: Set<string> }>();
  await mapLimit(toExpand, T_CONCURRENCY, async (d) => {
    const found = await fetchTransitiveNodes(d.name, d.version, signal).catch(() => []);
    for (const n of found) {
      if (directNames.has(n.name)) continue; // already scanned as a direct dep
      const key = `${n.name}@${n.version}`;
      let e = nodes.get(key);
      if (!e) {
        if (nodes.size >= T_MAX_NODES) continue;
        e = { name: n.name, version: n.version, via: new Set() };
        nodes.set(key, e);
      }
      e.via.add(d.name);
    }
  });
  if (nodes.size === 0) return undefined;

  // one entry per name for the OSV query (OSV results are keyed by name).
  // Merge "via" across versions so provenance isn't dropped for a dup-named dep.
  const byName = new Map<string, { name: string; version: string; via: Set<string> }>();
  for (const e of nodes.values()) {
    const prev = byName.get(e.name);
    if (prev) for (const v of e.via) prev.via.add(v);
    else byName.set(e.name, e);
  }

  let tOsv = new Map<string, OsvVuln[]>();
  try {
    tOsv = await queryOsv([...byName.values()].map((e) => ({ name: e.name, version: e.version })), signal);
  } catch {
    return { scanned: byName.size, flagged: [] };
  }

  const flagged: TransitiveFinding[] = [];
  for (const e of byName.values()) {
    const worst = (tOsv.get(e.name) ?? []).find(
      (v) => v.severityLabel === "CRITICAL" || v.severityLabel === "HIGH",
    );
    if (!worst) continue;
    flagged.push({
      name: e.name,
      version: e.version,
      via: [...e.via].sort(),
      id: worst.id,
      severityLabel: worst.severityLabel,
      score: worst.score,
      summary: worst.summary,
      fixedVersion: worst.fixedVersion ?? null,
    });
  }
  flagged.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return { scanned: byName.size, flagged };
}

function deterministicVerdict(
  mode: ScanReport["mode"],
  counts: ScanReport["counts"],
  total: number,
  transitive: TransitiveReport | undefined,
  risky: ScoredPackage[],
): string {
  if (mode === "healthy") {
    const t = transitive?.scanned ? ` and ${transitive.scanned} transitive` : "";
    return `All clear — ${total} ${total === 1 ? "dependency" : "dependencies"}${t} checked, nothing to fix.`;
  }
  const parts: string[] = [];
  if (counts.critical) parts.push(`${counts.critical} critical`);
  if (counts.warning) parts.push(`${counts.warning} warning${counts.warning === 1 ? "" : "s"}`);
  const tf = transitive?.flagged.length ?? 0;
  if (tf) parts.push(`${tf} in transitive deps`);
  const head = parts.length ? parts.join(", ") : "issues found";
  const first = risky[0]
    ? ` Start with ${risky[0].name}.`
    : tf
      ? " Review the transitive findings below."
      : "";
  return `Action required — ${head}.${first}`;
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
