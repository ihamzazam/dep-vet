# DepVet — Claude Code Build Handoff & Spec

**One-liner:** Paste your `package.json` and instantly get a security-and-health audit of your whole dependency tree — each package scored red/yellow/green from real CVE data, plus abandonment, typosquat, and install-script risk — ending in a prioritized, plain-English "fix these first" list. No signup.

**Context:** Solo build, under 3 days, for the Mind the Product "Everyone Ships Now" hackathon. Judged on four equal criteria: Product Thinking, Craft & Execution, Originality & Ambition, Shippedness (a stranger must land on the URL and get value immediately). The one hard requirement is installing Novus.ai on the deployed app.

**The wedge (keep this front of mind while building):** We are NOT out-detecting Socket/Snyk. Our edge is (1) zero-friction instant value — paste a manifest, no signup, filling the hole left when Snyk Advisor shut down in Jan 2026; (2) synthesis — CVEs + abandonment + typosquats + install-script risk in one report, which today requires three tools; (3) prioritization + plain English, attacking the alert-fatigue problem. **The detection comes from real APIs; the AI only synthesizes and explains. That is the design that makes this not a GPT wrapper — preserve it.**

---

## 1. Tech stack (chosen for build speed + instant deploy + GitHub for Novus)

- **Framework:** Next.js (App Router, TypeScript). One deployable app; API routes hold all secrets and external calls server-side.
- **UI:** Tailwind CSS + shadcn/ui for fast, credible polish.
- **Hosting:** Vercel (you have the Vercel connector). One-click deploy from GitHub → public URL. **Deploy a skeleton on Day 1 so the URL is live before the product is finished.**
- **Repo:** GitHub (required so Novus can instrument it).
- **State:** None for MVP. Stateless: paste → analyze → render. (Supabase only if you add saved/shareable reports later — you have the connector.)
- **AI:** Anthropic API (claude-sonnet model), called from a server-side API route. Never expose the key client-side.

---

## 2. Architecture / data flow

```
Browser (paste manifest)
   → POST /api/analyze  { manifest, ecosystem: "npm" }
        1. Parse manifest → list of {name, versionRange}
        2. For each package, in parallel (batch + rate-limit):
             - OSV API           → known vulnerabilities
             - npm registry      → last publish, deprecated, maintainers
             - npm downloads API → weekly downloads (popularity/weighting)
             - version manifest  → scripts field (install-script risk)
             - typosquat check   → edit-distance vs bundled top-packages list
        3. Score each package (red/yellow/green) — deterministic, code-based
        4. POST flagged findings → Anthropic API → prioritized "fix first" + explanations (JSON)
        5. Return { summary, packages[], aiPriorities[] }
   → Render report
```

Keep steps 1–3 fully deterministic. Step 4 (AI) is presentation only — if it fails, still render the deterministic report.

---

## 3. External APIs (all free; confirm exact request/response shapes at build time)

- **OSV.dev** (vulnerabilities, no key): `POST https://api.osv.dev/v1/query` with `{ "package": { "name": "<pkg>", "ecosystem": "npm" }, "version": "<resolved version>" }`. Use `POST https://api.osv.dev/v1/querybatch` to batch many packages in one call — do this to stay fast. Returns vuln IDs + severity.
- **npm registry** (metadata, no key): `GET https://registry.npmjs.org/<pkg>` → `time` (per-version publish dates; `time.modified` = last publish), `maintainers`, `deprecated`, `dist-tags.latest`, `repository`. For the install-script check, fetch the specific version: `GET https://registry.npmjs.org/<pkg>/<version>` → `scripts`, `dependencies`.
- **npm downloads** (popularity, no key): `GET https://api.npmjs.org/downloads/point/last-week/<pkg>` → weekly download count.
- **deps.dev** (optional, richer data, no key): `https://api.deps.dev` — cross-ecosystem package info, dependencies (useful for transitive later), OpenSSF Scorecard, licenses.
- **PyPI** (stretch, Python support, no key): `GET https://pypi.org/pypi/<pkg>/json`.
- **GitHub** (stretch, repo health): derive repo from npm `repository` field; `GET https://api.github.com/repos/<owner>/<repo>` for last push / open issues. Rate-limited without a token; treat as optional enrichment.

**Be a good API citizen:** batch (OSV querybatch), cap concurrency (e.g., 10 at a time), add a short timeout per call, and degrade gracefully if one source is slow — never let one hung request block the whole report.

---

## 4. Scoring logic (deterministic, in code — this is the core)

Per package, compute a status:

- **RED (critical):**
  - A known HIGH/CRITICAL severity vuln in OSV, **or**
  - Typosquat signal: edit distance 1–2 from a top-500 package name but not equal to it (e.g., `expres`, `requsts`, `lodahs`), **or**
  - Package is deprecated with a security-related message.
- **YELLOW (warning):**
  - A known LOW/MEDIUM vuln, **or**
  - Abandoned: no release in > 24 months, **or**
  - Deprecated (non-security), **or**
  - Has `install`/`preinstall`/`postinstall` script **and** low downloads (script + obscurity = risk), **or**
  - Single maintainer **and** very high downloads (bus-factor / supply-chain target).
- **GREEN:** none of the above.

**Summary object:** counts per status + the package list sorted worst-first.

**Typosquat list:** bundle a static JSON of the top ~500–1000 npm package names in the repo (don't fetch at runtime). Use Damerau-Levenshtein distance.

---

## 5. The AI layer (Anthropic API — synthesis only)

- **Input:** the JSON of flagged (red/yellow) packages with their reasons + key facts (vuln IDs/severity, last publish, downloads, maintainer count, script presence).
- **Task in the system prompt:** "You are a security assistant. You are given pre-computed findings about software dependencies. Do NOT invent risks or add packages. Using only the findings provided, return JSON with: `topPriorities` (max 5, each: package, oneLineReason in plain English, concreteAction like 'upgrade to 4.17.21' / 'replace with X' / 'remove'), and `perPackageNotes` (a short human explanation keyed by package name)."
- **Force JSON output**, parse safely, and strip code fences before parsing. If parsing fails or the call errors, render the deterministic report without the AI section (never block on it).
- Model: `claude-sonnet` family. Keep `max_tokens` modest. One call per analysis.

---

## 6. UI / UX spec (this is your Craft score — spend real time here)

**Landing:**
- A large paste box: "Paste your `package.json` to check your dependencies."
- A prominent **"Try an example"** button that loads a real sample manifest (include one typosquat + one outdated package so a judge gets an impressive result with zero typing — this is critical for the Shippedness score and the demo).
- Calm, credible, trustworthy visual tone (it's a security tool — it must *look* like it can be trusted). Mono font for package names.

**Report:**
- **Verdict header:** e.g., "2 critical · 5 warnings · 42 healthy" with a clear overall color.
- **AI "Fix these first" cards** at the top: 3–5 cards, each with the package, the plain-English reason, and the concrete action.
- **Dependency list:** one row per package, colored dot by status, sorted worst-first. Each row expands to show: vulns (with IDs), last publish date, weekly downloads, maintainer count, install-script flag, typosquat warning.
- **States:** loading ("Resolving and checking N packages…" with progress feel), empty, error (malformed manifest → friendly message), populated.

**Microcopy matters** — intentional, calm, specific. No emoji-spam, no alarmist red everywhere.

---

## 7. Scope: MVP (must finish) vs. stretch

**MVP (commit to this):**
- npm only (`package.json`), direct + devDependencies.
- OSV vulns + npm metadata + downloads + install-script flag + typosquat check.
- Deterministic scoring + full report UI + "Try an example."
- AI prioritization/explanation layer.
- Deployed to Vercel at a public URL, **Novus installed**, sample data seeded.

**Stretch (only if ahead):**
- `requirements.txt` / PyPI support.
- Transitive dependencies (parse `package-lock.json`, or use deps.dev).
- GitHub repo-health signals.
- Shareable report link (Supabase) — also creates the recurring-use hook.
- Single-package quick-check mode (the direct Snyk Advisor replacement).

---

## 8. Day-by-day plan (under 3 days)

**Day 1 — Spine + live URL (de-risk first):**
- Scaffold Next.js + Tailwind + shadcn, push to GitHub, deploy skeleton to Vercel → confirm the public URL loads. Do this in the first hour.
- Build `/api/analyze`: manifest parser → OSV (querybatch) + npm registry + downloads for direct deps. Render raw JSON, ugly is fine.
- **Install Novus** on the repo now, so it's collecting from day one.

**Day 2 — Logic + the real product:**
- Implement deterministic scoring (severity, abandonment, typosquat with bundled list, install-script flag, bus-factor).
- Build the real report UI (verdict header, colored expandable rows, sorted worst-first).
- Add the AI route (Anthropic → structured priorities/explanations) and the "Fix these first" cards.
- Add "Try an example" with a crafted sample manifest.

**Day 3 — Polish + ship:**
- Loading/empty/error states, copy pass, visual polish (this wins Craft).
- Add at most one stretch item if comfortably ahead.
- Run real manifests through it; get 2–3 people to use it so Novus shows real behavior; screenshot the Novus dashboard.
- Record the 2-minute demo, write the submission description, **submit before the June 20 5:00pm BST deadline** (don't cut it close).

---

## 9. Demo video script (target 2:00)

- **0:00–0:15 — Hook:** "In January 2026, Snyk Advisor shut down. Thousands of developers lost their reflex check for 'is this package safe to add?' DepVet is the replacement — for your whole dependency tree, instantly, no signup."
- **0:15–1:00 — Core flow:** Paste a real `package.json`, hit analyze, the tree lights up. Point at the verdict header.
- **1:00–1:30 — The wow:** Show the typosquat catch and the install-script flag — "no CVE-based tool catches these." Then the AI "Fix these first."
- **1:30–2:00 — Close:** "Runs on real OSV and registry data — the AI just prioritizes and explains. No login, works instantly." One line on the roadmap (CI / PR comments). Flash the Novus dashboard.

---

## 10. Ready-to-paste kickoff prompt for Claude Code

> Build a web app called **DepVet**. Stack: Next.js (App Router, TypeScript), Tailwind, shadcn/ui, deployable to Vercel, in a GitHub repo. It analyzes software dependencies for security and health.
>
> **Start here, in order:** (1) Scaffold the project, initialize a git repo, and set up for Vercel deploy so I can get a public URL live immediately with a placeholder landing page. (2) Then build a server-side API route `POST /api/analyze` that accepts a pasted npm `package.json`, parses the direct + dev dependencies, and for each package calls the OSV API (`https://api.osv.dev/v1/querybatch`) for known vulnerabilities and the npm registry (`https://registry.npmjs.org/<pkg>`) for last-publish date, deprecation, and maintainers. Return the raw results as JSON for now. Batch and cap concurrency; degrade gracefully if a call is slow.
>
> Keep all external calls and any API keys server-side. We'll add scoring, a typosquat check, install-script detection, an Anthropic-API explanation layer, and the report UI next — but first get the scaffold deployed and the analyze route returning real data for direct dependencies. Ask me before adding a database; the MVP is stateless.

---

## 11. Guardrails / honesty notes

- Add a brief, calm disclaimer in the footer: results are based on public data (OSV, npm registry) and are not a substitute for a full security audit. Don't overclaim.
- The moat is UX + synthesis + brand, not data (the data is public). Compete on being the tool developers reach for first.
- Don't let the AI invent findings — constrain it to the pre-computed data. Test with a manifest that has zero issues (it should say "healthy," not manufacture risk).
