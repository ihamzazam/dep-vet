# DepVet — supply-chain scanner

Paste your `package.json` and instantly see which dependencies are dangerous.
Every package is cross-checked against **live vulnerability data (OSV)** plus
**abandonment, typosquat, and malicious install-script** signals, then scored
red / yellow / green with one verdict and a prioritized "fix these first" list.
No signup. Nothing about your manifest is stored.

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

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint     # eslint
```

Next 16 (App Router) · React 19 · TypeScript · Tailwind v4. No env vars needed
for the MVP (all data sources are free + keyless).

## Deploy + Novus (hackathon gate)

1. Push this repo to GitHub.
2. Import it into Vercel (zero-config Next.js) → public URL.
3. **Install Novus.ai** (novus.ai): authorize its GitHub app on this repo, review
   and merge the instrumentation PR it opens, then redeploy. Novus is a
   **prize-eligibility gate** — confirm the dashboard records real sessions and
   capture the screenshot for submission. Verify session-replay masking before
   sharing the URL (users paste real manifests).

## Status

Day 1 complete: scaffold + full design (landing / scan reveal / report-mixed /
all-clear / error) + real `/api/analyze`. Day 2: AI prioritization/explanation
layer (Anthropic, `claude-sonnet-4-6`, structured JSON), richer typosquat list,
loading polish. See `docs/DepVet-Claude-Code-Handoff.md`.

> Results are based on public data (OSV, npm registry) and are not a substitute
> for a full security audit.
