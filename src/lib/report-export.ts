/** Export a ScanReport to copy-paste artifacts: a fix script + a Markdown summary. */
import type { ScanReport } from "./types";

/**
 * A runnable fix script aggregated from the risky packages' commands:
 * removes batched into one `npm uninstall`, upgrades into one `npm i`.
 * Returns "" if there's nothing actionable.
 */
export function fixCommands(report: ScanReport): string {
  const risky = report.packages.filter((p) => p.status !== "healthy");
  const removes: string[] = [];
  const installs: string[] = [];
  for (const p of risky) {
    const cmd = p.action?.command;
    if (!cmd) continue;
    if (cmd.startsWith("npm uninstall ")) removes.push(cmd.slice("npm uninstall ".length).trim());
    else if (cmd.startsWith("npm i ")) installs.push(cmd.slice("npm i ".length).trim());
  }
  const lines: string[] = ["# DepVet — fix these first"];
  if (removes.length) lines.push(`npm uninstall ${removes.join(" ")}`);
  if (installs.length) lines.push(`npm i ${installs.join(" ")}`);
  return lines.length > 1 ? lines.join("\n") : "";
}

const VERDICT: Record<ScanReport["mode"], string> = {
  mixed: "Action required",
  healthy: "All clear",
};

/** A Markdown summary suitable for pasting into a PR, issue, or Slack. */
export function toMarkdown(report: ScanReport): string {
  const c = report.counts;
  const out: string[] = [];
  out.push(`## DepVet — ${VERDICT[report.mode]}`);
  out.push(`**${c.critical} critical · ${c.warning} warning · ${c.healthy} healthy** across ${report.total} dependencies.`);
  out.push("");

  if (report.caught) {
    out.push(
      `> ⚑ **Caught:** \`${report.caught.name}@${report.caught.version}\` is a typosquat of \`${report.caught.target}\` that ships a hidden ${report.caught.hook} script.`,
    );
    out.push("");
  }

  if (report.fixes.length) {
    out.push("### Fix these first");
    for (const f of report.fixes) {
      const action = f.action.command ? `\`${f.action.command}\`` : f.action.label;
      out.push(`- **${f.name}@${f.version}** (${f.status}) — ${f.reason} → ${action}`);
    }
    out.push("");
  } else {
    out.push("No known CVEs, abandoned packages, typosquats, or install-time scripts. Safe to install.");
    out.push("");
  }

  out.push(
    "_Scanned against OSV + the npm registry by DepVet. Based on public data; not a substitute for a full security audit._",
  );
  return out.join("\n");
}
