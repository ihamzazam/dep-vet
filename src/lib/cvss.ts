/**
 * CVSS vector parsing.
 *
 * WHY THIS EXISTS (research finding, load-bearing): OSV does NOT return a
 * HIGH/LOW severity enum. `severity[]` entries carry a raw CVSS *vector string*
 * (e.g. "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"), and may be absent
 * entirely. To drive the red/yellow scoring we must compute a base score from
 * the vector ourselves, then bucket it. v3.0/3.1 use the same formula; v2 has
 * its own. v4 base scoring is complex — we detect it and fall back to the
 * coarse mapping (or UNKNOWN) rather than mis-score it.
 */
import type { SeverityLabel } from "./types";

export interface ScoredSeverity {
  score: number | null;
  label: SeverityLabel;
}

/** CVSS qualitative buckets (FIRST CVSS v3.1 §5). */
export function bucket(score: number | null): SeverityLabel {
  if (score == null) return "UNKNOWN";
  if (score >= 9.0) return "CRITICAL";
  if (score >= 7.0) return "HIGH";
  if (score >= 4.0) return "MODERATE";
  if (score > 0) return "LOW";
  return "UNKNOWN";
}

function parseVector(vector: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of vector.split("/")) {
    const [k, v] = part.split(":");
    if (k && v) out[k.trim().toUpperCase()] = v.trim().toUpperCase();
  }
  return out;
}

/** Round up to one decimal per the CVSS spec (handles float error). */
function roundUp1(x: number): number {
  const i = Math.round(x * 100000);
  if (i % 10000 === 0) return i / 100000;
  return (Math.floor(i / 10000) + 1) / 10;
}

/** CVSS v3.0 / v3.1 base score. Returns null if metrics are missing. */
export function cvss3Base(vector: string): number | null {
  const m = parseVector(vector);
  const AV: Record<string, number> = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 };
  const AC: Record<string, number> = { L: 0.77, H: 0.44 };
  const UI: Record<string, number> = { N: 0.85, R: 0.62 };
  const IMPACT: Record<string, number> = { H: 0.56, L: 0.22, N: 0 };
  const scopeChanged = m.S === "C";
  const PR_U: Record<string, number> = { N: 0.85, L: 0.62, H: 0.27 };
  const PR_C: Record<string, number> = { N: 0.85, L: 0.68, H: 0.5 };

  const av = AV[m.AV];
  const ac = AC[m.AC];
  const ui = UI[m.UI];
  const pr = (scopeChanged ? PR_C : PR_U)[m.PR];
  const c = IMPACT[m.C];
  const i = IMPACT[m.I];
  const a = IMPACT[m.A];
  if ([av, ac, ui, pr, c, i, a].some((x) => x === undefined)) return null;

  const iscBase = 1 - (1 - c) * (1 - i) * (1 - a);
  const impact = scopeChanged
    ? 7.52 * (iscBase - 0.029) - 3.25 * Math.pow(iscBase - 0.02, 15)
    : 6.42 * iscBase;
  if (impact <= 0) return 0;
  const exploitability = 8.22 * av * ac * pr * ui;
  const raw = scopeChanged
    ? Math.min(1.08 * (impact + exploitability), 10)
    : Math.min(impact + exploitability, 10);
  return roundUp1(raw);
}

/** CVSS v2 base score. */
export function cvss2Base(vector: string): number | null {
  const m = parseVector(vector);
  const AV: Record<string, number> = { L: 0.395, A: 0.646, N: 1.0 };
  const AC: Record<string, number> = { H: 0.35, M: 0.61, L: 0.71 };
  const AU: Record<string, number> = { M: 0.45, S: 0.56, N: 0.704 };
  const CIA: Record<string, number> = { N: 0.0, P: 0.275, C: 0.66 };

  const av = AV[m.AV];
  const ac = AC[m.AC];
  const au = AU[m.AU];
  const c = CIA[m.C];
  const i = CIA[m.I];
  const a = CIA[m.A];
  if ([av, ac, au, c, i, a].some((x) => x === undefined)) return null;

  const impact = 10.41 * (1 - (1 - c) * (1 - i) * (1 - a));
  const exploitability = 20 * av * ac * au;
  const f = impact === 0 ? 0 : 1.176;
  const base = (0.6 * impact + 0.4 * exploitability - 1.5) * f;
  return Math.round(base * 10) / 10;
}

/** Base score from any supported CVSS vector string; null if unsupported. */
export function scoreFromVector(
  type: string,
  vector: string,
): number | null {
  const t = (type || "").toUpperCase();
  const v = vector.toUpperCase();
  if (t.startsWith("CVSS_V3") || v.startsWith("CVSS:3")) return cvss3Base(v);
  if (t === "CVSS_V2" || (!v.startsWith("CVSS:") && /AV:[LAN]/.test(v)))
    return cvss2Base(v);
  // CVSS_V4 and anything else: not computed here.
  return null;
}

/**
 * Given an OSV `severity[]` array (objects `{type, score}` where `score` is a
 * vector string), return the worst computed base score + label. Falls back to
 * an embedded numeric or UNKNOWN.
 */
export function severityFromOsv(
  severity: Array<{ type?: string; score?: string }> | undefined,
  dbSpecific?: unknown,
): ScoredSeverity {
  let best: number | null = null;
  for (const s of severity ?? []) {
    if (!s?.score) continue;
    const computed = scoreFromVector(s.type ?? "", s.score);
    if (computed != null) best = best == null ? computed : Math.max(best, computed);
  }
  if (best != null) return { score: best, label: bucket(best) };

  // Fallbacks: some advisories stash a label/number in database_specific.
  const label = readDbSpecificLabel(dbSpecific);
  if (label) return { score: null, label };
  return { score: null, label: "UNKNOWN" };
}

function readDbSpecificLabel(db: unknown): SeverityLabel | null {
  if (!db || typeof db !== "object") return null;
  const rec = db as Record<string, unknown>;
  const raw = (rec.severity ?? rec.cvss_severity ?? "")
    .toString()
    .toUpperCase();
  if (raw.includes("CRIT")) return "CRITICAL";
  if (raw.includes("HIGH")) return "HIGH";
  if (raw.includes("MOD") || raw.includes("MED")) return "MODERATE";
  if (raw.includes("LOW")) return "LOW";
  return null;
}
