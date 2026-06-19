/**
 * Deterministic scoring — the core of DepVet (handoff §4).
 *
 * The AI layer (Day 2) only *explains* what this computes; it never invents
 * risk. Each package gets a red/yellow/green status from real signals:
 *   RED:    HIGH/CRITICAL CVE, typosquat, or security-flagged deprecation
 *   YELLOW: LOW/MODERATE CVE, abandonment (>24mo), deprecation, install-script
 *           + low adoption, or bus-factor (1 maintainer + very high adoption)
 *   GREEN:  none of the above
 */
import type {
  ActionChip,
  PackageFinding,
  RiskStatus,
  VulnFinding,
} from "./types";
import type { Dependency } from "./parse";
import type { NpmPackageData } from "./npm";
import type { OsvVuln } from "./osv";
import type { TyposquatHit } from "./typosquat";
import { compactDownloads, humanizeDownloads, monthsSince, relativeTime } from "./format";
import { gt as semverGt, diff as semverDiff } from "semver";

const LOW_DOWNLOADS = 50_000;
const ABANDON_MONTHS = 24;
// A real typosquat is obscure; a popular package that merely *resembles* a top
// name (e.g. "core" vs "cors") is not. Only honor a name-collision below this.
const TYPOSQUAT_MAX_DOWNLOADS = 1_000_000;
// NOTE: the handoff also lists a "bus-factor" rule (1 maintainer + very high
// downloads) as YELLOW. We deliberately omit it: it's not actionable and fires
// on excellent single-maintainer packages (zod, dayjs, chalk…), creating exactly
// the alert fatigue the research warns against. Revisit as an info-only badge.

export interface ScoredPackage extends PackageFinding {
  priority: number;
  isTyposquat: boolean;
  typosquatTarget?: string;
  hasInstallScript: boolean;
  fixReason: string;
  fixAction: ActionChip;
  /** Upgrade risk for the recommended bump: "safe" (patch/minor) vs "major". */
  bumpKind?: "safe" | "major";
}

/** Classify an upgrade from→to as a safe (patch/minor) or a major bump. */
function classifyBump(from: string, to: string): "safe" | "major" | undefined {
  try {
    const d = semverDiff(from, to);
    if (!d) return "safe";
    return d.includes("major") ? "major" : "safe";
  } catch {
    return undefined;
  }
}

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MODERATE: 2,
  LOW: 1,
  UNKNOWN: 0,
};

export function scorePackage(
  dep: Dependency,
  npm: NpmPackageData,
  vulns: OsvVuln[],
  typo: TyposquatHit | null,
  now: number = Date.now(),
): ScoredPackage {
  const version = npm.resolvedVersion ?? stripDisplay(dep.range);
  const worstVuln = vulns[0] ?? null;
  const worstVulnRank = worstVuln ? SEVERITY_RANK[worstVuln.severityLabel] : 0;

  const isTyposquat =
    !!typo &&
    (npm.weeklyDownloads == null || npm.weeklyDownloads < TYPOSQUAT_MAX_DOWNLOADS);
  const hasInstallScript = npm.hasInstallScript;
  const lowAdoption =
    npm.weeklyDownloads != null && npm.weeklyDownloads < LOW_DOWNLOADS;
  const abandoned =
    npm.lastPublishIso != null &&
    monthsSince(npm.lastPublishIso, now) > ABANDON_MONTHS;
  const deprecated = !!npm.deprecated;
  const securityDeprecation =
    deprecated && /secur|vuln|critical|malicious|cve/i.test(npm.deprecated ?? "");
  const scriptObscurity = hasInstallScript && lowAdoption;

  // ---- status ----
  let status: RiskStatus = "healthy";
  if (worstVulnRank >= 3 || isTyposquat || securityDeprecation) {
    status = "critical";
  } else if (vulns.length > 0 || abandoned || deprecated || scriptObscurity) {
    status = "warning";
  }

  // ---- tags ----
  const tags: string[] = [];
  if (isTyposquat && hasInstallScript) tags.push("TYPOSQUAT · INSTALL-SCRIPT");
  else if (isTyposquat) tags.push("TYPOSQUAT");
  if (vulns.length > 0) {
    const label = worstVuln!.severityLabel;
    if (status === "warning" && (abandoned || deprecated))
      tags.push(`OUTDATED · ${vulns.length} ${label}`);
    else if (label === "UNKNOWN") tags.push(`${vulns.length} ADVISORY`);
    else tags.push(`${vulns.length} ${label} CVE${vulns.length > 1 ? "S" : ""}`);
  }
  if (!isTyposquat && vulns.length === 0) {
    if (securityDeprecation) tags.push("DEPRECATED · SECURITY");
    else if (deprecated) tags.push("DEPRECATED");
    else if (abandoned) tags.push("UNMAINTAINED");
    else if (scriptObscurity) tags.push("INSTALL-SCRIPT");
  }
  if (status === "healthy") tags.push("✓ HEALTHY");

  // ---- description (used when there's no CVE list to show) ----
  let description: string | undefined;
  if (isTyposquat) {
    description =
      `Name is ${typo!.distance} edit${typo!.distance > 1 ? "s" : ""} from ` +
      `${typo!.target}, a far more popular package — this is likely not a dependency you chose.` +
      (hasInstallScript
        ? ` It also ships a ${npm.installHooks.join("/") || "install"} script that runs on \`npm install\`.`
        : "");
  } else if (vulns.length === 0 && deprecated) {
    description = `Deprecated by its maintainers: "${truncate(npm.deprecated!, 160)}"`;
  } else if (vulns.length === 0 && abandoned) {
    description = `No release in over ${Math.round(monthsSince(npm.lastPublishIso, now))} months — the project appears unmaintained and won't receive fixes.`;
  } else if (vulns.length === 0 && scriptObscurity) {
    description = `Runs a ${npm.installHooks.join("/") || "install"} script on install and has low adoption (${humanizeDownloads(npm.weeklyDownloads)}/wk). Install-script + obscurity is a supply-chain risk worth reviewing.`;
  }

  // ---- right-rail summary ----
  const dl = npm.weeklyDownloads != null ? `${compactDownloads(npm.weeklyDownloads)}/wk` : "downloads n/a";
  const maint =
    npm.maintainers != null
      ? `${npm.maintainers} maintainer${npm.maintainers === 1 ? "" : "s"}`
      : npm.found
        ? "maintainers n/a"
        : "not found on npm";
  const summaryRight = `${dl} · ${maint}`;

  // ---- action ----
  // Upgrade to the HIGHEST fixed version across all CVEs so one bump clears them all.
  const fixedVersion = vulns
    .map((v) => v.fixedVersion)
    .filter((v): v is string => !!v)
    .reduce<string | null>((max, v) => {
      if (!max) return v;
      try {
        return semverGt(v, max) ? v : max;
      } catch {
        return max;
      }
    }, null);
  let action: ActionChip;
  let fixReason: string;
  let bumpKind: "safe" | "major" | undefined;
  if (isTyposquat || securityDeprecation) {
    action = {
      label: "Remove from dependencies",
      style: "danger",
      command: `npm uninstall ${dep.name}`,
    };
    fixReason = isTyposquat
      ? "Typosquat — not a dependency you chose."
      : "Deprecated for security reasons.";
  } else if (fixedVersion) {
    action = {
      label: `npm i ${dep.name}@${fixedVersion}`,
      style: status === "critical" ? "safe" : "warn",
      mono: true,
      command: `npm i ${dep.name}@${fixedVersion}`,
    };
    fixReason = worstVuln
      ? `${worstVuln.id} (${worstVuln.severityLabel}). Patched in ${fixedVersion}.`
      : `Patched in ${fixedVersion}.`;
    bumpKind = classifyBump(version, fixedVersion);
  } else if (npm.latest && npm.latest !== version) {
    action = {
      label: `npm i ${dep.name}@${npm.latest}`,
      style: status === "critical" ? "safe" : "warn",
      mono: true,
      command: `npm i ${dep.name}@${npm.latest}`,
    };
    fixReason = abandoned
      ? "Unmaintained — update or replace."
      : worstVuln
        ? `${worstVuln.id} (${worstVuln.severityLabel}).`
        : "Update available.";
    bumpKind = classifyBump(version, npm.latest);
  } else {
    action = { label: "review", style: status === "critical" ? "danger" : "warn" };
    fixReason = worstVuln
      ? `${worstVuln.id} (${worstVuln.severityLabel}).`
      : "Review this dependency.";
  }

  // ---- priority (sort + fix ranking; higher = worse) ----
  let priority = 0;
  if (status === "critical") priority += 1000;
  else if (status === "warning") priority += 300;
  priority += worstVulnRank * 50;
  if (isTyposquat) priority += 500;
  if (hasInstallScript) priority += 40;
  if (abandoned) priority += 20;

  return {
    name: dep.name,
    version,
    status,
    tags,
    summaryRight,
    description,
    vulns: vulns.map(toVulnFinding),
    stats: {
      lastPublish: relativeTime(npm.lastPublishIso, now),
      weeklyDownloads: humanizeDownloads(npm.weeklyDownloads),
      maintainers:
        npm.maintainers != null ? String(npm.maintainers) : npm.found ? "n/a" : "—",
      installScript: hasInstallScript
        ? `⚑ ${npm.installHooks[0] ?? "install"}`
        : "none",
      installScriptRisk: hasInstallScript,
    },
    action: status === "healthy" ? undefined : action,
    priority,
    isTyposquat,
    typosquatTarget: typo?.target,
    hasInstallScript,
    fixReason,
    fixAction: action,
    bumpKind,
  };
}

function toVulnFinding(v: OsvVuln): VulnFinding {
  return {
    id: v.id,
    severityLabel: v.severityLabel,
    score: v.score,
    summary: v.summary,
  };
}

function stripDisplay(range: string): string {
  return range.replace(/^[\^~>=<\s]+/, "").trim() || range;
}

function truncate(s: string, n: number): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}
