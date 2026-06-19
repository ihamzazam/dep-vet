# DepVet — supply-chain scanner

Paste your `package.json` — or a **public GitHub repo URL**, or look up a
**single package** at `/pkg/<name>` — and instantly see which dependencies are
dangerous. Every package is cross-checked against **live
vulnerability data (OSV)** plus **abandonment, typosquat, and malicious
install-script** signals, with **transitive (indirect) dependencies** resolved
via deps.dev so you see what `npm install` actually pulls in. Scored red /
yellow / green with one verdict, a plain-English bottom line, and a prioritized
"fix these first" list. No signup. Nothing about your manifest is stored.

Built for the Mind the Product **World Product Day 2026 — "Everyone Ships Now"**
hackathon (submission deadline **2026-06-20 17:00 BST**).

## Design

The UI is the **"Mission Control"** direction from Claude Design (dark-first
phosphor-green radar instrument, Archivo + JetBrains Mono, shape-coded risk
signals — ◆ critical / ▲ warning / ● healthy, never colour alone). The exported
design bundle and chat transcript live in `docs/design-reference/`.

## How it works

```
Browser (paste package.json)
  └─ "Try an example"  → scripted demo report (instant, pixel-faithful)  [src/lib/demo.ts]
  └─ "Initiate scan"   → POST /api/analyze (real data)                   [src/app/api/analyze/route.ts]
        1. parse manifest → direct + dev deps              [src/lib/parse.ts]
        2. per package (concurrency-capped):
             - npm registry meta: last publish, maintainers, deprecated, install scripts  [src/lib/npm.ts]
             - npm downloads: weekly count
             - typosquat: Damerau-Levenshtein vs bundled top-package list  [src/lib/typosquat.ts]
        3. OSV /v1/querybatch → fan out /v1/vulns/{id} → parse CVSS vector → bucket  [src/lib/osv.ts, src/lib/cvss.ts]
        4. deterministic red/yellow/green score            [src/lib/score.ts]
        5. assemble verdict, "caught" banner, fix cards, dependency tree  [src/lib/analyze.ts]
  └─ render the same report UI for demo and real data      [src/components/Report.tsx]
```

Steps 1–4 are **fully deterministic** — the (Day-2) AI layer only *explains*
findings, never invents them. Key correctness details baked in from research:
OSV `querybatch` returns vuln **IDs only** (we fan out for severity), OSV
severity is a raw **CVSS vector** we parse and bucket ourselves, npm
install-script intent comes from the resolved version's scripts, and all
outbound calls are timeout- + 429-aware with a descriptive User-Agent.

## Use it in CI (no signup, no install)

`POST /api/analyze` returns the full report as JSON, so you can gate a build on
critical findings with one line — no account, no GitHub App:

```bash
curl -s -X POST https://<your-deployment>/api/analyze \
  -H 'content-type: application/json' \
  --data "{\"manifest\": $(jq -Rs . < package.json)}" \
  | jq -e '.report.counts.critical == 0' > /dev/null \
  || { echo "DepVet: critical dependency risk found"; exit 1; }
```

Or scan a repo directly: `--data '{"repo":"owner/repo"}'`. (Responses are
cached by manifest hash and rate-limited per IP.)

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint     # eslint
```

Next 16 (App Router) · React 19 · TypeScript · Tailwind v4. The detection
sources are free + keyless. The **AI explanation layer** is optional and
**provider-agnostic** — set `AI_API_KEY` + `AI_BASE_URL` + `AI_MODEL` (any
OpenAI-compatible API: Google Gemini or Groq free tiers, or Anthropic; see
`.env.example` for presets) to add plain-English prioritization on top of the
real findings. Without it, DepVet renders the deterministic report unchanged —
it never blocks on the AI.

## Deploy + Novus (hackathon gate)

1. Push this repo to GitHub.
2. Import it into Vercel (zero-config Next.js) → public URL.
3. **Install Novus.ai** (novus.ai): authorize its GitHub app on this repo, review
   and merge the instrumentation PR it opens, then redeploy. Novus is a
   **prize-eligibility gate** — confirm the dashboard records real sessions and
   capture the screenshot for submission. Verify session-replay masking before
   sharing the URL (users paste real manifests).

## Status

Days 1–3 complete: scaffold + full design (landing / scan reveal / report /
all-clear / error), real `/api/analyze`, the **AI synthesis layer** (provider-
agnostic, synthesis-only, fails open), and the "make it real" set:
- **Scan a GitHub repo by URL** (server fetches the manifest, keyless).
- **Single-package pages** — `/pkg/<name>` (and `/pkg/<name>@<version>`, scoped
  names supported): a shareable "is this safe to add?" verdict with a dynamic OG
  card, the org-discovery / repeat-visit surface.
- **Transitive depth** via deps.dev — HIGH/CRITICAL indirect findings rolled
  under a "via &lt;direct dep&gt;" provenance chip, ranked not flooded (fail-open lane).
- **Bottom-line verdict sentence**, **safe vs major** upgrade tagging.
- Copy fixes / Markdown / shareable links, source links, show-all, drag-drop,
  result cache + per-IP rate limit, and the CI one-liner above.

Every external lane (repo fetch, transitive, AI) is bounded and fails open to
the deterministic direct-scan report. See `docs/DepVet-Claude-Code-Handoff.md`.

> Results are based on public data (OSV, npm registry) and are not a substitute
> for a full security audit.
