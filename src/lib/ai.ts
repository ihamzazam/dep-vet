/**
 * The AI synthesis layer (Day 2).
 *
 * Design invariant from the spec + research: detection is 100% deterministic
 * (OSV/npm/typosquat/scoring). The model ONLY explains and prioritizes the
 * pre-computed findings — it never invents risk, packages, versions, or
 * severities. This is what makes DepVet not-a-GPT-wrapper.
 *
 * Fails OPEN: no API key, a parse failure, a timeout, or any error → returns
 * null, and the deterministic report renders unchanged. The product must give a
 * stranger value even when the AI is unconfigured or down.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { PackageFinding } from "./types";

// The user's spec (handoff) explicitly names the "claude-sonnet" family; this
// small JSON synthesis call is well within Sonnet's range and is fast + cheap.
const MODEL = "claude-sonnet-4-6";
const MAX_FLAGGED = 12; // bound tokens — never send the whole tree

const Findings = z.object({
  topPriorities: z
    .array(
      z.object({
        package: z.string(),
        oneLineReason: z.string(),
        concreteAction: z.string(),
      }),
    )
    .max(5),
  perPackageNotes: z.array(
    z.object({ package: z.string(), note: z.string() }),
  ),
});

const SYSTEM = `You are the synthesis layer of DepVet, a dependency-security scanner. You are given pre-computed, factual findings about a developer's npm dependencies (vulnerabilities with CVE IDs and CVSS scores, abandonment, typosquats, install scripts, weekly downloads, maintainer counts). Your ONLY job is to explain and prioritize these findings in calm, precise, plain English a senior engineer will trust on sight.

Rules:
- Use ONLY the findings provided. Never invent vulnerabilities, packages, versions, or severities, and never change a severity. If the data does not support a claim, do not make it.
- topPriorities (max 5, most urgent first): each has "package" (the EXACT name from the input), "oneLineReason" (one calm sentence — what is wrong and why it matters; no hype, no emoji), and "concreteAction" (a specific imperative such as "Upgrade to 4.17.21", "Remove from dependencies", or "Replace with dayjs" — use the fix version from the data when present).
- perPackageNotes: for each flagged package, one short plain-English sentence explaining its finding to a developer.
- Be specific and factual; reference CVE IDs and versions when given. Do not be alarmist.`;

export interface AiEnrichment {
  priorities: Map<string, string>; // package name -> oneLineReason
  notes: Map<string, string>; // package name -> plain-english note
}

export async function enrichFlagged(
  flagged: PackageFinding[],
  signal?: AbortSignal,
): Promise<AiEnrichment | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || flagged.length === 0 || signal?.aborted) return null;

  try {
    // 15s call ceiling + one retry; the route's overall timeout is the backstop.
    const client = new Anthropic({ apiKey, timeout: 15_000, maxRetries: 1 });
    const input = { flagged: flagged.slice(0, MAX_FLAGGED).map(toInput) };

    const res = await client.messages.parse({
      model: MODEL,
      max_tokens: 1500,
      thinking: { type: "disabled" },
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(input) }],
      output_config: { format: zodOutputFormat(Findings) },
    });

    const parsed = res.parsed_output;
    if (!parsed) return null;

    const priorities = new Map<string, string>();
    const notes = new Map<string, string>();
    for (const p of parsed.topPriorities) {
      if (p.package && p.oneLineReason) priorities.set(p.package, p.oneLineReason);
    }
    for (const n of parsed.perPackageNotes) {
      if (n.package && n.note) notes.set(n.package, n.note);
    }
    return { priorities, notes };
  } catch {
    return null; // fail open
  }
}

function toInput(p: PackageFinding) {
  const signals: string[] = [...p.tags];
  signals.push(`${p.stats.weeklyDownloads}/wk`, `${p.stats.maintainers} maintainer(s)`);
  signals.push(`last publish ${p.stats.lastPublish}`);
  if (p.stats.installScriptRisk) signals.push(`runs ${p.stats.installScript} on install`);
  if (p.description) signals.push(p.description);
  return {
    package: p.name,
    version: p.version,
    status: p.status,
    signals,
    vulns: p.vulns.map((v) => ({
      id: v.id,
      severity: v.severityLabel,
      score: v.score,
      summary: v.summary,
    })),
  };
}
