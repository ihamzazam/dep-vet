/**
 * AI synthesis layer (Day 2) — provider-agnostic.
 *
 * Design invariant: detection is 100% deterministic (OSV/npm/typosquat/scoring).
 * The model ONLY explains and prioritizes the pre-computed findings — it never
 * invents risk, packages, versions, or severities. That's what keeps DepVet from
 * being a GPT wrapper.
 *
 * Works with ANY OpenAI-compatible endpoint via env vars, so you can use a free
 * tier (Google Gemini, Groq, OpenRouter) or Anthropic's compatible endpoint
 * without touching code:
 *   AI_API_KEY   — enables the layer (unset → AI off)
 *   AI_BASE_URL  — provider endpoint (e.g. https://api.groq.com/openai/v1)
 *   AI_MODEL     — model id (e.g. gemini-2.0-flash, llama-3.3-70b-versatile)
 * See .env.example for copy-paste presets.
 *
 * Fails OPEN: missing config, a timeout, an error, or malformed/invalid output
 * all return null and the deterministic report renders unchanged. The product
 * always gives a stranger value, even with the AI off.
 */
import OpenAI from "openai";
import { z } from "zod";
import type { PackageFinding } from "./types";

const MAX_FLAGGED = 12; // bound tokens — never send the whole tree

const Findings = z.object({
  topPriorities: z.array(
    z.object({
      package: z.string(),
      oneLineReason: z.string(),
      concreteAction: z.string(),
    }),
  ),
  perPackageNotes: z.array(z.object({ package: z.string(), note: z.string() })),
});

const SYSTEM = `You are the synthesis layer of DepVet, a dependency-security scanner. You are given pre-computed, factual findings about a developer's npm dependencies (vulnerabilities with CVE IDs and CVSS scores, abandonment, typosquats, install scripts, weekly downloads, maintainer counts). Your ONLY job is to explain and prioritize these findings in calm, precise, plain English a senior engineer will trust on sight.

Rules:
- Use ONLY the findings provided. Never invent vulnerabilities, packages, versions, or severities, and never change a severity. If the data does not support a claim, do not make it.
- Be specific and factual; reference CVE IDs and versions when given. Do not be alarmist; no emoji.
- "topPriorities" lists the most urgent items first. Each: "package" (the EXACT name from the input), "oneLineReason" (one calm sentence — what is wrong and why it matters), "concreteAction" (a specific imperative such as "Upgrade to 4.17.21", "Remove from dependencies", or "Replace with dayjs" — use the fix version from the data when present).
- "perPackageNotes": for each flagged package, one short plain-English sentence explaining its finding to a developer.

Respond with ONLY a JSON object of exactly this shape (no markdown, no code fences, no prose):
{"topPriorities":[{"package":"string","oneLineReason":"string","concreteAction":"string"}],"perPackageNotes":[{"package":"string","note":"string"}]}`;

export interface AiEnrichment {
  priorities: Map<string, string>; // package name -> oneLineReason
  notes: Map<string, string>; // package name -> plain-english note
}

export async function enrichFlagged(
  flagged: PackageFinding[],
  signal?: AbortSignal,
): Promise<AiEnrichment | null> {
  const apiKey = process.env.AI_API_KEY;
  const baseURL = process.env.AI_BASE_URL;
  const model = process.env.AI_MODEL;
  if (!apiKey || !baseURL || !model || flagged.length === 0 || signal?.aborted) {
    return null;
  }

  try {
    const client = new OpenAI({ apiKey, baseURL, timeout: 15_000, maxRetries: 1 });
    const input = { flagged: flagged.slice(0, MAX_FLAGGED).map(toInput) };

    const res = await client.chat.completions.create(
      {
        model,
        max_tokens: 1500,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: JSON.stringify(input) },
        ],
      },
      { signal },
    );

    const text = res.choices?.[0]?.message?.content;
    const json = text ? extractJson(text) : null;
    if (!json) return null;

    const parsed = Findings.safeParse(json);
    if (!parsed.success) return null;

    const priorities = new Map<string, string>();
    const notes = new Map<string, string>();
    for (const p of parsed.data.topPriorities) {
      if (p.package && p.oneLineReason) priorities.set(p.package, p.oneLineReason);
    }
    for (const n of parsed.data.perPackageNotes) {
      if (n.package && n.note) notes.set(n.package, n.note);
    }
    return { priorities, notes };
  } catch {
    return null; // fail open
  }
}

/** Tolerant JSON extraction — strips ``` fences and grabs the outer object. */
function extractJson(text: string): unknown {
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start < 0 || end < 0 || end < start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
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
