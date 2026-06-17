/**
 * Shared types for DepVet.
 *
 * `ScanReport` is the single contract between the analysis engine
 * (server: src/lib/analyze.ts) and the report UI (client: src/components/Report.tsx).
 * The scripted demo data (src/lib/demo.ts) produces the same shape, so the
 * "Try an example" flow and a real /api/analyze response render identically.
 */

export type RiskStatus = "critical" | "warning" | "healthy";

export type SeverityLabel =
  | "CRITICAL"
  | "HIGH"
  | "MODERATE"
  | "LOW"
  | "UNKNOWN";

export type ActionStyle = "danger" | "safe" | "warn";

export interface ActionChip {
  /** Display label, e.g. "↑ upgrade → 4.17.21" or "Remove now". */
  label: string;
  style: ActionStyle;
  /** Render in mono (commands / versions) vs Archivo display (verbs). */
  mono?: boolean;
  /** Copy-paste shell command, e.g. "npm i lodash@4.17.21" or "npm uninstall colorz". */
  command?: string;
}

export interface VulnFinding {
  id: string; // CVE / GHSA id
  severityLabel: SeverityLabel;
  score: number | null; // CVSS base score, when known
  summary: string;
}

export interface PackageStat {
  lastPublish: string; // display string, e.g. "2.1 yrs ago"
  weeklyDownloads: string; // display string, e.g. "48.2M"
  maintainers: string; // display string, e.g. "1 · new account"
  installScript: string; // "none" | "⚑ postinstall"
  installScriptRisk: boolean;
}

export interface PackageFinding {
  name: string;
  version: string; // resolved/requested version (display, no leading @)
  status: RiskStatus;
  /** Short uppercase tag(s) shown on the row, e.g. "TYPOSQUAT · INSTALL-SCRIPT". */
  tags: string[];
  /** Right-aligned summary on the collapsed row, e.g. "48M/wk · 2 maintainers". */
  summaryRight: string;
  /** Freeform plain-English detail (used when there is no CVE list). */
  description?: string;
  vulns: VulnFinding[];
  stats: PackageStat;
  action?: ActionChip;
  /** AI-synthesized plain-English explanation (Day 2). Absent if AI is off/failed. */
  aiNote?: string;
}

export interface FixCard {
  rank: string; // "01"
  status: RiskStatus;
  name: string;
  version: string;
  reason: string;
  action: ActionChip;
}

export interface CaughtBanner {
  name: string;
  version: string;
  /** The popular package this one impersonates, e.g. "colors". */
  target: string;
  /** Install hook that would run, e.g. "postinstall". */
  hook: string;
  note: string; // e.g. "NO OTHER SCANNER FLAGGED THIS"
}

export interface ScanReport {
  mode: "mixed" | "healthy";
  total: number;
  counts: { critical: number; warning: number; healthy: number };
  caught?: CaughtBanner | null;
  fixes: FixCard[];
  /** Risky packages first, then a sample of healthy ones (default-visible). */
  packages: PackageFinding[];
  /** The remaining healthy packages, revealed by "show all" (real scans only). */
  morePackages?: PackageFinding[];
  /** Count of healthy packages collapsed under the "+ N more" row. */
  hiddenHealthy: number;
  /** For the all-clear state: a few "name@version" strings to show as ✓ chips. */
  healthySummary?: string[];
  /** Non-fatal notes (e.g. a data source timed out). Surfaced subtly. */
  warnings?: string[];
}

/** What POST /api/analyze returns. */
export interface AnalyzeResponse {
  report: ScanReport;
  /** Wall-clock ms the analysis took (for the readout). */
  elapsedMs: number;
}
