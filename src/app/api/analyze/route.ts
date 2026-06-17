import { analyzeManifest } from "@/lib/analyze";
import { pendoTrack } from "@/lib/pendo";
import type { AnalyzeResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const OVERALL_TIMEOUT_MS = 25_000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "MANIFEST UNREADABLE — request body was not valid JSON." },
      { status: 400 },
    );
  }

  const manifest =
    body && typeof body === "object" && "manifest" in body
      ? String((body as { manifest: unknown }).manifest ?? "")
      : "";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OVERALL_TIMEOUT_MS);
  const started = Date.now();
  try {
    const outcome = await analyzeManifest(manifest, ctrl.signal);
    if (!outcome.ok) {
      return Response.json({ error: outcome.error }, { status: 400 });
    }
    const elapsedMs = Date.now() - started;
    const rpt = outcome.report;
    pendoTrack("vulnerability_report_generated", {
      total_packages: rpt.total,
      critical_count: rpt.counts.critical,
      warning_count: rpt.counts.warning,
      healthy_count: rpt.counts.healthy,
      vulnerabilities_found: rpt.packages.reduce((s, p) => s + p.vulns.length, 0),
      typosquats_found: rpt.packages.filter((p) => p.tags.some((t) => t.includes("TYPOSQUAT"))).length,
      has_caught_banner: !!rpt.caught,
      fix_count: rpt.fixes.length,
      elapsed_ms: elapsedMs,
      has_ai_enrichment: rpt.packages.some((p) => !!p.aiNote),
      warnings_count: rpt.warnings?.length ?? 0,
    });
    const payload: AnalyzeResponse = {
      report: rpt,
      elapsedMs,
    };
    return Response.json(payload, { status: 200 });
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
