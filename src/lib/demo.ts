/**
 * Scripted demo data for the "Try an example" chips.
 *
 * WHY scripted: for a judged live demo, the example flow must be instant,
 * deterministic, and pixel-faithful to the design (no network, no flake). A
 * pasted *custom* manifest hits the real /api/analyze instead. These objects
 * reproduce the report in DepVet.dc.html exactly.
 */
import type { ScanReport } from "./types";

export const EXAMPLE_REAL = `{
  "name": "acme-web",
  "version": "2.4.1",
  "dependencies": {
    "react": "^18.2.0",
    "express": "^4.18.2",
    "axios": "0.21.1",
    "lodash": "4.17.11",
    "minimist": "1.2.0",
    "moment": "2.18.1",
    "colorz": "1.4.0"
  }
}`;

export const EXAMPLE_CLEAN = `{
  "name": "acme-web",
  "version": "3.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "express": "^4.18.2",
    "axios": "^1.6.7",
    "lodash": "^4.17.21",
    "zod": "^3.22.4",
    "dayjs": "^1.11.10"
  }
}`;

export const EXAMPLE_BROKEN = `{
  "name": "acme-web",
  "dependencies": {
    "react": "^18.2.0",
    "express": "^4.18.2",
    "axios": "0.21.1",
  }
}`;

export const DEMO_MIXED: ScanReport = {
  mode: "mixed",
  total: 46,
  counts: { critical: 3, warning: 2, healthy: 41 },
  caught: {
    name: "colorz",
    version: "1.4.0",
    target: "colors",
    hook: "postinstall",
    note: "NO OTHER SCANNER FLAGGED THIS",
  },
  fixes: [
    {
      rank: "01",
      status: "critical",
      name: "colorz",
      version: "1.4.0",
      reason: "Typosquat + malicious postinstall. Not a dependency you chose.",
      action: { label: "Remove now", style: "danger", command: "npm uninstall colorz" },
    },
    {
      rank: "02",
      status: "critical",
      name: "lodash",
      version: "4.17.11",
      reason: "Prototype pollution, CVE-2019-10744. Patched upstream.",
      action: { label: "↑ upgrade → 4.17.21", style: "safe", mono: true, command: "npm i lodash@4.17.21" },
    },
    {
      rank: "03",
      status: "critical",
      name: "minimist",
      version: "1.2.0",
      reason: "Argument injection, CVE-2021-44906. Low-effort fix.",
      action: { label: "↑ upgrade → 1.2.8", style: "safe", mono: true, command: "npm i minimist@1.2.8" },
    },
  ],
  packages: [
    {
      name: "colorz",
      version: "1.4.0",
      status: "critical",
      tags: ["TYPOSQUAT · INSTALL-SCRIPT"],
      summaryRight: "3.4k/wk · 1 maintainer",
      aiNote:
        "This isn't a package you meant to install — it's a near-copy of colors, and its postinstall hook runs attacker-controlled code the instant you install. Remove it.",
      description:
        "Published 6 days ago, name is one edit-distance from colors (220M downloads/wk). Ships a postinstall hook that fetches and executes a remote script. This is an active supply-chain attack.",
      vulns: [],
      stats: {
        lastPublish: "6 days ago",
        weeklyDownloads: "3,412",
        maintainers: "1 · new account",
        installScript: "⚑ postinstall",
        installScriptRisk: true,
      },
      action: { label: "Remove from dependencies", style: "danger", command: "npm uninstall colorz" },
    },
    {
      name: "lodash",
      version: "4.17.11",
      status: "critical",
      tags: ["1 HIGH CVE"],
      summaryRight: "48M/wk · 2 maintainers",
      aiNote:
        "A known prototype-pollution flaw (CVE-2019-10744) that's already fixed upstream — bumping to 4.17.21 clears it with no API changes.",
      vulns: [
        {
          id: "CVE-2019-10744",
          severityLabel: "HIGH",
          score: 7.4,
          summary:
            "Prototype pollution in defaultsDeep allowing property injection.",
        },
      ],
      stats: {
        lastPublish: "2.1 yrs ago",
        weeklyDownloads: "48.2M",
        maintainers: "2",
        installScript: "none",
        installScriptRisk: false,
      },
      action: { label: "npm i lodash@4.17.21", style: "safe", mono: true, command: "npm i lodash@4.17.21" },
    },
    {
      name: "minimist",
      version: "1.2.0",
      status: "critical",
      tags: ["1 CVE"],
      summaryRight: "61M/wk · 1 maintainer",
      aiNote:
        "Argument injection via crafted keys (CVE-2021-44906); the 1.2.8 patch is a drop-in fix with no breaking changes.",
      vulns: [
        {
          id: "CVE-2021-44906",
          severityLabel: "HIGH",
          score: 7.5,
          summary: "Argument injection via crafted proto keys in parsed args.",
        },
      ],
      stats: {
        lastPublish: "4.0 yrs ago",
        weeklyDownloads: "61.0M",
        maintainers: "1",
        installScript: "none",
        installScriptRisk: false,
      },
      action: { label: "npm i minimist@1.2.8", style: "safe", mono: true, command: "npm i minimist@1.2.8" },
    },
    {
      name: "axios",
      version: "0.21.1",
      status: "warning",
      tags: ["OUTDATED · 1 MODERATE"],
      summaryRight: "38M/wk · 5 maintainers",
      aiNote:
        "This 0.21.1 has a moderate SSRF (CVE-2020-28168) fixed years ago — moving to a current 1.x removes it along with a lot of accrued risk.",
      vulns: [
        {
          id: "CVE-2020-28168",
          severityLabel: "MODERATE",
          score: 5.9,
          summary:
            "SSRF via redirect bypass of proxy configuration. Fixed in 0.21.2+.",
        },
      ],
      stats: {
        lastPublish: "3.2 yrs ago",
        weeklyDownloads: "38.4M",
        maintainers: "5",
        installScript: "none",
        installScriptRisk: false,
      },
      action: { label: "npm i axios@^1.6.7", style: "warn", mono: true, command: "npm i axios@^1.6.7" },
    },
    {
      name: "moment",
      version: "2.18.1",
      status: "warning",
      tags: ["UNMAINTAINED"],
      summaryRight: "12M/wk · legacy",
      aiNote:
        "Still works, but it's in maintenance mode and ships ~290KB; for new code dayjs is a lighter, actively-maintained drop-in.",
      description:
        "Project is in maintenance mode; the authors recommend modern alternatives. No active CVEs, but it adds ~290KB and won't receive fixes.",
      vulns: [],
      stats: {
        lastPublish: "3.1 yrs ago",
        weeklyDownloads: "12.1M",
        maintainers: "4",
        installScript: "none",
        installScriptRisk: false,
      },
      action: { label: "migrate → dayjs", style: "warn", mono: true },
    },
    {
      name: "react",
      version: "18.2.0",
      status: "healthy",
      tags: ["✓ HEALTHY"],
      summaryRight: "24M/wk · current",
      vulns: [],
      stats: {
        lastPublish: "4 mo ago",
        weeklyDownloads: "24.0M",
        maintainers: "12",
        installScript: "none",
        installScriptRisk: false,
      },
    },
    {
      name: "express",
      version: "4.18.2",
      status: "healthy",
      tags: ["✓ HEALTHY"],
      summaryRight: "30M/wk · current",
      vulns: [],
      stats: {
        lastPublish: "7 mo ago",
        weeklyDownloads: "30.3M",
        maintainers: "9",
        installScript: "none",
        installScriptRisk: false,
      },
    },
  ],
  hiddenHealthy: 39,
};

export const DEMO_HEALTHY: ScanReport = {
  mode: "healthy",
  total: 38,
  counts: { critical: 0, warning: 0, healthy: 38 },
  caught: null,
  fixes: [],
  packages: [],
  hiddenHealthy: 32,
  healthySummary: [
    "react@18.2.0",
    "express@4.18.2",
    "axios@1.6.7",
    "lodash@4.17.21",
    "zod@3.22.4",
    "dayjs@1.11.10",
  ],
};
