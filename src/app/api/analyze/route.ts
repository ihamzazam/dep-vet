import { analyzeManifest } from "@/lib/analyze";
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
    const payload: AnalyzeResponse = {
      report: outcome.report,
      elapsedMs: Date.now() - started,
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
