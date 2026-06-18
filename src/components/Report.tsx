"use client";

import { useState, type CSSProperties } from "react";
import type {
  ActionChip,
  FixCard,
  PackageFinding,
  PackageStat,
  RiskStatus,
  ScanReport,
  TransitiveFinding,
  TransitiveReport,
  VulnFinding,
} from "@/lib/types";
import { RiskGlyph, PkgName } from "./glyphs";
import { CopyButton } from "./CopyButton";
import { advisoryUrl, npmUrl } from "@/lib/links";
import { fixCommands, toMarkdown } from "@/lib/report-export";

const SRC_LINK: CSSProperties = {
  color: "inherit",
  textDecoration: "none",
  borderBottom: "1px dotted rgba(184,255,92,0.4)",
};

const TOOLBAR_BTN: CSSProperties = {
  fontFamily: "var(--font-jetbrains), monospace",
  fontSize: 11,
  letterSpacing: "0.04em",
  color: "#cfe6b0",
  background: "rgba(184,255,92,0.06)",
  border: "1px solid rgba(184,255,92,0.22)",
  padding: "7px 12px",
  borderRadius: 6,
  cursor: "pointer",
};

const tint = (status: RiskStatus): string =>
  status === "critical"
    ? "rgba(255,69,48,0.04)"
    : status === "warning"
      ? "rgba(255,176,32,0.04)"
      : "transparent";

const tagColor = (status: RiskStatus): { text: string; border: string } =>
  status === "critical"
    ? { text: "#ff8a7d", border: "rgba(255,90,72,0.4)" }
    : { text: "#ffc870", border: "rgba(255,176,32,0.4)" };

const nameColor = (status: RiskStatus): string =>
  status === "critical" ? "#ffd2cb" : status === "warning" ? "#f4d49a" : "#cfe6b0";

const versionColor = (status: RiskStatus): string =>
  status === "critical" ? "#8a6a5a" : status === "warning" ? "#8a7a4a" : "#5d7340";

function ActionPill({ action, block }: { action: ActionChip; block?: boolean }) {
  const bg =
    action.style === "danger" ? "#ff5a48" : action.style === "warn" ? "#ffb020" : "#b8ff5c";
  const base: CSSProperties = {
    fontFamily: action.mono ? "var(--font-jetbrains), monospace" : "var(--font-archivo), sans-serif",
    fontWeight: action.mono ? 600 : 700,
    fontSize: 12,
    letterSpacing: action.mono ? undefined : "0.04em",
    textTransform: action.mono ? "none" : "uppercase",
    color: "#0a0c07",
    background: bg,
    padding: block ? "8px 12px" : "9px 16px",
    borderRadius: 6,
    border: "none",
  };
  const style: CSSProperties = block
    ? { ...base, display: "block", width: "100%", textAlign: "center" }
    : { ...base, display: "inline-flex", alignItems: "center", gap: 8 };

  // Commands are copyable; non-command verbs render as a static pill.
  if (action.command) {
    return (
      <CopyButton
        text={action.command}
        title="Copy command"
        copiedLabel="copied ✓"
        style={{ ...style, cursor: "pointer" }}
      >
        {action.label}
      </CopyButton>
    );
  }
  return <div style={style}>{action.label}</div>;
}

function StatTile({ stat }: { stat: PackageStat }) {
  const tiles = [
    { label: "LAST PUBLISH", value: stat.lastPublish, danger: false },
    { label: "WEEKLY DL", value: stat.weeklyDownloads, danger: false },
    { label: "MAINTAINERS", value: stat.maintainers, danger: false },
    {
      label: "INSTALL SCRIPT",
      value: stat.installScript,
      danger: stat.installScriptRisk,
    },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(112px,1fr))",
        gap: 10,
        marginBottom: 14,
      }}
    >
      {tiles.map((t) => (
        <div
          key={t.label}
          style={{
            background: t.danger ? "rgba(255,69,48,0.1)" : "rgba(0,0,0,0.25)",
            border: t.danger
              ? "1px solid rgba(255,69,48,0.35)"
              : "1px solid rgba(184,255,92,0.1)",
            borderRadius: 7,
            padding: 10,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: t.danger ? "#ff8a7d" : "#6f8a4a",
              letterSpacing: "0.12em",
              marginBottom: 5,
            }}
          >
            {t.label}
          </div>
          <div style={{ fontSize: 13, color: t.danger ? "#ff8a7d" : "#cfe6b0" }}>{t.value}</div>
        </div>
      ))}
    </div>
  );
}

function VulnLine({ vuln }: { vuln: VulnFinding }) {
  const isWarn = vuln.severityLabel === "MODERATE" || vuln.severityLabel === "LOW";
  const accent = isWarn ? "#ffb020" : "#ff5a48";
  const idColor = isWarn ? "#f4d49a" : "#ffd2cb";
  const sevColor = isWarn ? "#ffc870" : "#ff8a7d";
  return (
    <div style={{ borderLeft: `2px solid ${accent}`, paddingLeft: 12, marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: idColor }}>
        <a
          href={advisoryUrl(vuln.id)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...SRC_LINK, color: idColor }}
        >
          {vuln.id} ↗
        </a>{" "}
        ·{" "}
        <span style={{ color: sevColor }}>
          {vuln.severityLabel}
          {vuln.score != null ? ` (${vuln.score})` : ""}
        </span>
      </div>
      <div style={{ fontSize: 12, color: "#bfae8f", marginTop: 2 }}>{vuln.summary}</div>
    </div>
  );
}

function PackageRow({ pkg, defaultOpen }: { pkg: PackageFinding; defaultOpen?: boolean }) {
  const tc = tagColor(pkg.status);
  return (
    <details
      className="dv-row"
      open={defaultOpen || undefined}
      style={{ borderBottom: "1px solid rgba(184,255,92,0.08)" }}
    >
      <summary
        style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px" }}
      >
        <RiskGlyph status={pkg.status} />
        <span
          style={{
            fontSize: 13,
            color: nameColor(pkg.status),
            fontWeight: 600,
            minWidth: 170,
          }}
        >
          <PkgName name={pkg.name} version={pkg.version} versionColor={versionColor(pkg.status)} />
        </span>
        {pkg.tags.map((tag) =>
          pkg.status === "healthy" ? (
            <span key={tag} style={{ fontSize: 10, color: "#8aa06a", letterSpacing: "0.12em" }}>
              {tag}
            </span>
          ) : (
            <span
              key={tag}
              style={{
                fontSize: 10,
                color: tc.text,
                letterSpacing: "0.12em",
                border: `1px solid ${tc.border}`,
                padding: "2px 7px",
                borderRadius: 3,
              }}
            >
              {tag}
            </span>
          ),
        )}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: pkg.status === "critical" ? "#8a6a5a" : "#8aa06a",
          }}
        >
          {pkg.summaryRight}
        </span>
        <span className="dv-chev" style={{ color: "#6f8a4a", fontSize: 12 }}>
          ▸
        </span>
      </summary>
      <div
        style={{
          padding: "4px 16px 18px 41px",
          background: tint(pkg.status),
        }}
      >
        {pkg.description && (
          <div
            style={{
              fontSize: 12,
              color: pkg.status === "critical" ? "#e7b3ab" : "#cbb78f",
              lineHeight: 1.6,
              marginBottom: 14,
              maxWidth: 680,
            }}
          >
            {pkg.description}
          </div>
        )}
        {pkg.vulns.map((v) => (
          <VulnLine key={v.id} vuln={v} />
        ))}
        {pkg.aiNote && (
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.18em",
                color: "#6f8a4a",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              ▸ in plain english
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#c8dab0",
                lineHeight: 1.6,
                maxWidth: 680,
                borderLeft: "2px solid rgba(184,255,92,0.35)",
                paddingLeft: 12,
              }}
            >
              {pkg.aiNote}
            </div>
          </div>
        )}
        <StatTile stat={pkg.stats} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {pkg.action && <ActionPill action={pkg.action} />}
          <a
            href={npmUrl(pkg.name)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#6f8a4a",
              textDecoration: "none",
            }}
          >
            view on npm ↗
          </a>
        </div>
      </div>
    </details>
  );
}

function VerdictStat({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 28, color, fontWeight: 600 }}>{value}</div>
      <div style={{ fontSize: 9, color: "#7a8a5a", letterSpacing: "0.16em" }}>{label}</div>
    </div>
  );
}

function NewScanButton({ onReset }: { onReset: () => void }) {
  return (
    <button
      onClick={onReset}
      style={{
        fontFamily: "var(--font-archivo), sans-serif",
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "#cfe6b0",
        background: "transparent",
        border: "1px solid rgba(184,255,92,0.35)",
        padding: "11px 18px",
        borderRadius: 7,
        cursor: "pointer",
        marginLeft: 8,
      }}
    >
      ↻ New scan
    </button>
  );
}

function FixCardView({ fix }: { fix: FixCard }) {
  const danger = fix.status === "critical";
  return (
    <div
      style={{
        background: danger ? "rgba(255,69,48,0.07)" : "rgba(255,176,32,0.07)",
        border: danger ? "1px solid rgba(255,69,48,0.3)" : "1px solid rgba(255,176,32,0.3)",
        borderRadius: 9,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
        <RiskGlyph status={fix.status} />
        <span style={{ fontSize: 10, color: danger ? "#ff8a7d" : "#ffc870", letterSpacing: "0.12em" }}>
          {fix.status.toUpperCase()} · {fix.rank}
        </span>
        {fix.bumpKind && (
          <span
            title={fix.bumpKind === "safe" ? "Patch/minor — low risk" : "Major version — test before shipping"}
            style={{
              marginLeft: "auto",
              fontSize: 8.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "2px 6px",
              borderRadius: 3,
              color: fix.bumpKind === "safe" ? "#b8ff5c" : "#ffb020",
              border: `1px solid ${fix.bumpKind === "safe" ? "rgba(184,255,92,0.4)" : "rgba(255,176,32,0.4)"}`,
            }}
          >
            {fix.bumpKind === "safe" ? "safe bump" : "major · test"}
          </span>
        )}
      </div>
      <a
        href={npmUrl(fix.name)}
        target="_blank"
        rel="noopener noreferrer"
        title="View on npm"
        style={{
          display: "block",
          fontSize: 14,
          color: nameColor(fix.status),
          fontWeight: 600,
          marginBottom: 6,
          textDecoration: "none",
        }}
      >
        <PkgName name={fix.name} version={fix.version} versionColor={versionColor(fix.status)} />
      </a>
      <div style={{ fontSize: 11.5, color: "#c79a92", lineHeight: 1.5, marginBottom: 12 }}>
        {fix.reason}
      </div>
      <ActionPill action={fix.action} block />
    </div>
  );
}

/** One-sentence bottom line shown directly under the verdict bar. */
function VerdictLineStrip({ text, mode }: { text?: string; mode: ScanReport["mode"] }) {
  if (!text) return null;
  return (
    <div
      style={{
        padding: "12px 30px",
        borderBottom: "1px solid rgba(184,255,92,0.1)",
        background: "rgba(184,255,92,0.02)",
        fontSize: 13,
        lineHeight: 1.5,
        color: mode === "healthy" ? "#cfe6b0" : "#e9dcc6",
      }}
    >
      <span style={{ color: "#6f8a4a", letterSpacing: "0.16em", fontSize: 10, marginRight: 10 }}>
        ▸ BOTTOM LINE
      </span>
      {text}
    </div>
  );
}

function TransitiveRow({ f }: { f: TransitiveFinding }) {
  const status: RiskStatus = f.severityLabel === "CRITICAL" ? "critical" : "warning";
  const accent = status === "critical" ? "#ff8a7d" : "#ffc870";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "11px 14px",
        borderBottom: "1px solid rgba(184,255,92,0.07)",
      }}
    >
      <RiskGlyph status={status} style={{ marginTop: 4 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: status === "critical" ? "#ffd2cb" : "#f4d49a" }}>
            <a href={npmUrl(f.name)} target="_blank" rel="noopener noreferrer" style={{ ...SRC_LINK, color: "inherit" }}>
              {f.name}@{f.version}
            </a>
          </span>
          <a
            href={advisoryUrl(f.id)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...SRC_LINK, fontSize: 11, color: accent }}
          >
            {f.id} ↗
          </a>
          <span style={{ fontSize: 10, color: accent, letterSpacing: "0.1em" }}>
            {f.severityLabel}
            {f.score != null ? ` (${f.score})` : ""}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: "#bfae8f", lineHeight: 1.5, marginTop: 3 }}>{f.summary}</div>
        <div style={{ fontSize: 10, color: "#6f8a4a", marginTop: 4 }}>
          pulled in via{" "}
          {f.via.map((v, i) => (
            <span key={v}>
              <span style={{ color: "#8aa06a" }}>{v}</span>
              {i < f.via.length - 1 ? ", " : ""}
            </span>
          ))}
          {f.fixedVersion ? ` · fixed in ${f.name}@${f.fixedVersion}` : ""}
        </div>
      </div>
    </div>
  );
}

/** Transitive (indirect) dependency risk — ranked, HIGH/CRITICAL only. */
function TransitiveSection({ transitive }: { transitive?: TransitiveReport }) {
  if (!transitive || transitive.scanned === 0) return null;
  const flagged = transitive.flagged;
  return (
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 10, letterSpacing: "0.22em", color: flagged.length ? "#ffb020" : "#6f8a4a", textTransform: "uppercase" }}>
          ▸ Transitive risk — {flagged.length} flagged
        </span>
        <span style={{ fontSize: 10, color: "#4a5a38", letterSpacing: "0.1em" }}>
          {transitive.scanned} indirect deps scanned · deps.dev
        </span>
      </div>
      {flagged.length === 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            border: "1px solid rgba(184,255,92,0.14)",
            borderRadius: 9,
            color: "#8aa06a",
            fontSize: 12,
          }}
        >
          <RiskGlyph status="healthy" />
          {transitive.scanned} transitive dependencies scanned — none high or critical.
        </div>
      ) : (
        <div style={{ border: "1px solid rgba(255,176,32,0.22)", borderRadius: 9, overflow: "hidden" }}>
          {flagged.slice(0, 8).map((f) => (
            <TransitiveRow key={`${f.name}@${f.version}`} f={f} />
          ))}
          {flagged.length > 8 && (
            <div style={{ padding: "11px 14px", fontSize: 12, color: "#6f8a4a" }}>
              + {flagged.length - 8} more transitive findings
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- top level ----------------------------- */

export function Report({
  report,
  onReset,
  shareUrl,
}: {
  report: ScanReport;
  onReset: () => void;
  shareUrl: string | null;
}) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        height: "calc(100vh - 61px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {report.mode === "mixed" ? (
        <MixedReport report={report} onReset={onReset} shareUrl={shareUrl} />
      ) : (
        <HealthyReport report={report} onReset={onReset} shareUrl={shareUrl} />
      )}
    </div>
  );
}

/** Copy fixes / copy markdown / copy share-link toolbar. */
function ExportToolbar({
  report,
  shareUrl,
}: {
  report: ScanReport;
  shareUrl: string | null;
}) {
  const cmds = fixCommands(report);
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
      {cmds && (
        <CopyButton text={cmds} style={TOOLBAR_BTN} copiedLabel="✓ fixes copied">
          ⧉ Copy fixes
        </CopyButton>
      )}
      <CopyButton text={toMarkdown(report)} style={TOOLBAR_BTN} copiedLabel="✓ report copied">
        ⧉ Copy as Markdown
      </CopyButton>
      {shareUrl && (
        <CopyButton text={shareUrl} style={TOOLBAR_BTN} copiedLabel="✓ link copied">
          ⧉ Copy share link
        </CopyButton>
      )}
    </div>
  );
}

function MixedReport({
  report,
  onReset,
  shareUrl,
}: {
  report: ScanReport;
  onReset: () => void;
  shareUrl: string | null;
}) {
  const firstRiskyIndex = report.packages.findIndex((p) => p.status !== "healthy");
  const [showAll, setShowAll] = useState(false);
  const more = report.morePackages ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* verdict bar */}
      <div
        className="dv-verdict"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "20px 30px",
          borderBottom: "1px solid rgba(255,69,48,0.25)",
          background: "linear-gradient(90deg, rgba(255,69,48,0.1), rgba(255,69,48,0.02))",
        }}
      >
        <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden>
          <polygon points="21,4 38,33 4,33" fill="none" stroke="#ff5a48" strokeWidth="2.6" strokeLinejoin="round" />
          <rect x="19.6" y="14" width="2.8" height="11" fill="#ff5a48" />
          <rect x="19.6" y="27.5" width="2.8" height="2.8" fill="#ff5a48" />
        </svg>
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.24em",
              color: "#a07a3a",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Verdict · threat level {report.counts.critical > 0 ? "high" : "elevated"}
          </div>
          <div
            style={{
              fontFamily: "var(--font-archivo), sans-serif",
              fontWeight: 800,
              fontSize: 30,
              color: "#ff5a48",
              textTransform: "uppercase",
              letterSpacing: "-0.015em",
              lineHeight: 1,
            }}
          >
            Action required
          </div>
        </div>
        <div
          className="dv-verdict-stats"
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 28,
            flexWrap: "wrap",
          }}
        >
          <VerdictStat value={pad(report.counts.critical)} label="◆ CRITICAL" color="#ff5a48" />
          <VerdictStat value={pad(report.counts.warning)} label="▲ WARNING" color="#ffb020" />
          <VerdictStat value={pad(report.counts.healthy)} label="● HEALTHY" color="#b8ff5c" />
          <NewScanButton onReset={onReset} />
        </div>
      </div>

      <VerdictLineStrip text={report.verdictLine} mode="mixed" />

      {/* caught banner */}
      {report.caught && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "13px 30px",
            background: "rgba(255,69,48,0.09)",
            borderBottom: "1px solid rgba(255,69,48,0.22)",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-archivo), sans-serif",
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: "0.18em",
              color: "#0a0c07",
              background: "#ff5a48",
              padding: "4px 9px",
              borderRadius: 4,
            }}
          >
            ⚑ CAUGHT
          </span>
          <span style={{ fontSize: 13, color: "#ffd2cb" }}>
            <a
              href={npmUrl(report.caught.name)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...SRC_LINK, color: "#fff", fontWeight: 600 }}
            >
              {report.caught.name}@{report.caught.version}
            </a>{" "}
            is a typosquat of{" "}
            <a
              href={npmUrl(report.caught.target)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...SRC_LINK, color: "#fff" }}
            >
              {report.caught.target}
            </a>{" "}
            — and
            ships a hidden <span style={{ color: "#ff8a7d" }}>{report.caught.hook}</span> script. It
            would have run the moment you typed <span style={{ color: "#cfe6b0" }}>npm install</span>.
          </span>
          <span
            style={{ marginLeft: "auto", fontSize: 11, color: "#c98", letterSpacing: "0.12em" }}
          >
            {report.caught.note}
          </span>
        </div>
      )}

      {/* body */}
      <div
        className="dv-report-body"
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "minmax(0,430px) 1fr",
          minHeight: 0,
        }}
      >
        {/* left: scope */}
        <ReportScope counts={report.counts} total={report.total} />

        {/* right: fixes + tree */}
        <div
          className="dv-report-right"
          style={{ overflowY: "auto", padding: "24px 28px", minWidth: 0 }}
        >
          <ExportToolbar report={report} shareUrl={shareUrl} />
          {report.fixes.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.22em",
                  color: "#ffb020",
                  textTransform: "uppercase",
                  marginBottom: 14,
                }}
              >
                ▸ Neutralize first — {report.fixes.length} action
                {report.fixes.length === 1 ? "" : "s"}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
                  gap: 12,
                  marginBottom: 32,
                }}
              >
                {report.fixes.map((f) => (
                  <FixCardView key={f.rank + f.name} fix={f} />
                ))}
              </div>
            </>
          )}

          <TransitiveSection transitive={report.transitive} />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 10,
                letterSpacing: "0.22em",
                color: "#6f8a4a",
                textTransform: "uppercase",
              }}
            >
              ▸ Full dependency tree — {report.total} packages
            </span>
            <span style={{ fontSize: 10, color: "#4a5a38", letterSpacing: "0.1em" }}>
              click a row to inspect
            </span>
          </div>
          <div
            style={{
              border: "1px solid rgba(184,255,92,0.12)",
              borderRadius: 9,
              overflow: "hidden",
            }}
          >
            {report.packages.map((pkg, i) => (
              <PackageRow key={pkg.name} pkg={pkg} defaultOpen={i === firstRiskyIndex} />
            ))}
            {showAll && more.map((pkg) => <PackageRow key={pkg.name} pkg={pkg} />)}
            {report.hiddenHealthy > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "13px 16px",
                  color: "#6f8a4a",
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: "rgba(184,255,92,0.4)",
                    display: "inline-block",
                  }}
                />
                + {report.hiddenHealthy} more packages — all healthy, no advisories
                {more.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    style={{
                      marginLeft: "auto",
                      color: "#4a5a38",
                      cursor: "pointer",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px dashed rgba(184,255,92,0.3)",
                      fontFamily: "inherit",
                      fontSize: 12,
                      padding: 0,
                    }}
                  >
                    {showAll ? "hide" : "show all"}
                  </button>
                )}
              </div>
            )}
          </div>
          <div style={{ height: 20 }} />
        </div>
      </div>
    </div>
  );
}

function ReportScope({
  counts,
  total,
}: {
  counts: ScanReport["counts"];
  total: number;
}) {
  return (
    <div
      className="dv-scope-col"
      style={{
        position: "relative",
        borderRight: "1px solid rgba(184,255,92,0.12)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 24,
          fontSize: 10,
          letterSpacing: "0.18em",
          color: "#6f8a4a",
          textTransform: "uppercase",
        }}
      >
        Dependency scope · {total} nodes
      </div>
      <div
        style={{
          position: "relative",
          width: 340,
          height: 340,
          borderRadius: "50%",
          overflow: "hidden",
          border: "1px solid rgba(184,255,92,0.2)",
          boxShadow: "inset 0 0 50px rgba(184,255,92,0.06)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "50%",
            height: "50%",
            transformOrigin: "0 0",
            background:
              "conic-gradient(from 0deg, rgba(184,255,92,0.24), rgba(184,255,92,0) 64deg)",
            animation: "dv-sweep 5s linear infinite",
          }}
        />
        <svg viewBox="0 0 340 340" style={{ position: "absolute", inset: 0 }}>
          <circle cx="170" cy="170" r="50" fill="none" stroke="rgba(184,255,92,0.13)" />
          <circle cx="170" cy="170" r="95" fill="none" stroke="rgba(184,255,92,0.1)" />
          <circle cx="170" cy="170" r="140" fill="none" stroke="rgba(184,255,92,0.08)" />
          <line x1="170" y1="22" x2="170" y2="318" stroke="rgba(184,255,92,0.08)" />
          <line x1="22" y1="170" x2="318" y2="170" stroke="rgba(184,255,92,0.08)" />
          <circle cx="170" cy="170" r="6" fill="#b8ff5c" />
          <g fill="#b8ff5c">
            <circle cx="235" cy="115" r="3.5" />
            <circle cx="105" cy="120" r="3.5" />
            <circle cx="255" cy="195" r="3.5" />
            <circle cx="110" cy="225" r="3.5" />
            <circle cx="215" cy="245" r="3.5" />
            <circle cx="150" cy="80" r="3.5" />
            <circle cx="80" cy="175" r="3.5" />
            <circle cx="270" cy="150" r="3.5" />
            <circle cx="145" cy="265" r="3.5" />
          </g>
          {counts.warning > 0 && (
            <>
              <polygon points="200,250 207,263 193,263" fill="#ffb020" />
              <polygon points="95,250 102,263 88,263" fill="#ffb020" />
            </>
          )}
          {counts.critical > 0 && (
            <>
              <g style={{ animation: "dv-pulse 1.7s infinite" }}>
                <rect x="259" y="79" width="13" height="13" transform="rotate(45 265 85)" fill="#ff4530" />
                <circle cx="265" cy="85" r="17" fill="none" stroke="#ff4530" strokeWidth="1.5" opacity="0.55" />
              </g>
              <g style={{ animation: "dv-pulse 2s infinite" }}>
                <rect x="74" y="84" width="12" height="12" transform="rotate(45 80 90)" fill="#ff4530" />
              </g>
              <g style={{ animation: "dv-pulse 2.3s infinite" }}>
                <rect x="244" y="244" width="12" height="12" transform="rotate(45 250 250)" fill="#ff4530" />
              </g>
            </>
          )}
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(transparent, transparent 3px, rgba(0,0,0,0.15) 4px)",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          gap: 18,
          marginTop: 26,
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "#8aa06a",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 9, height: 9, background: "#ff4530", transform: "rotate(45deg)", display: "inline-block" }} />
          CRITICAL
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderBottom: "9px solid #ffb020",
              display: "inline-block",
            }}
          />
          WARNING
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#b8ff5c", display: "inline-block" }} />
          HEALTHY
        </span>
      </div>
    </div>
  );
}

function HealthyReport({
  report,
  onReset,
  shareUrl,
}: {
  report: ScanReport;
  onReset: () => void;
  shareUrl: string | null;
}) {
  const summary = report.healthySummary ?? [];
  const metrics = [
    { value: "0", label: "KNOWN VULNERABILITIES" },
    { value: "0", label: "TYPOSQUATS DETECTED" },
    { value: "0", label: "RISKY INSTALL SCRIPTS" },
    { value: String(report.counts.healthy), label: "UP-TO-DATE PACKAGES" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* verdict bar */}
      <div
        className="dv-verdict"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "20px 30px",
          borderBottom: "1px solid rgba(184,255,92,0.25)",
          background: "linear-gradient(90deg, rgba(184,255,92,0.1), rgba(184,255,92,0.02))",
        }}
      >
        <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden>
          <circle cx="21" cy="21" r="18" fill="none" stroke="#b8ff5c" strokeWidth="2.4" />
          <path d="M13 21.5 L18.5 27 L29 15.5" fill="none" stroke="#b8ff5c" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.24em",
              color: "#6f8a4a",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Verdict · cleared for install
          </div>
          <div
            style={{
              fontFamily: "var(--font-archivo), sans-serif",
              fontWeight: 800,
              fontSize: 30,
              color: "#b8ff5c",
              textTransform: "uppercase",
              letterSpacing: "-0.015em",
              lineHeight: 1,
            }}
          >
            All clear
          </div>
        </div>
        <div
          className="dv-verdict-stats"
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 28,
            flexWrap: "wrap",
          }}
        >
          <VerdictStat value="00" label="◆ CRITICAL" color="#6f8a4a" />
          <VerdictStat value="00" label="▲ WARNING" color="#6f8a4a" />
          <VerdictStat value={pad(report.counts.healthy)} label="● HEALTHY" color="#b8ff5c" />
          <NewScanButton onReset={onReset} />
        </div>
      </div>

      <VerdictLineStrip text={report.verdictLine} mode="healthy" />

      {/* body */}
      <div
        className="dv-report-body"
        style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 0 }}
      >
        {/* left: clean scope */}
        <div
          className="dv-scope-col"
          style={{
            position: "relative",
            borderRight: "1px solid rgba(184,255,92,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(60% 60% at 50% 50%, rgba(184,255,92,0.08), transparent 70%)",
            }}
          />
          <div
            style={{
              position: "relative",
              width: 380,
              height: 380,
              borderRadius: "50%",
              overflow: "hidden",
              border: "1px solid rgba(184,255,92,0.26)",
              boxShadow:
                "inset 0 0 60px rgba(184,255,92,0.1), 0 0 80px -10px rgba(184,255,92,0.3)",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: "50%",
                height: "50%",
                transformOrigin: "0 0",
                background:
                  "conic-gradient(from 0deg, rgba(184,255,92,0.22), rgba(184,255,92,0) 70deg)",
                animation: "dv-sweep 6s linear infinite",
              }}
            />
            <svg viewBox="0 0 380 380" style={{ position: "absolute", inset: 0 }}>
              <circle cx="190" cy="190" r="55" fill="none" stroke="rgba(184,255,92,0.14)" />
              <circle cx="190" cy="190" r="105" fill="none" stroke="rgba(184,255,92,0.11)" />
              <circle cx="190" cy="190" r="155" fill="none" stroke="rgba(184,255,92,0.08)" />
              <line x1="190" y1="30" x2="190" y2="350" stroke="rgba(184,255,92,0.08)" />
              <line x1="30" y1="190" x2="350" y2="190" stroke="rgba(184,255,92,0.08)" />
              <g fill="#b8ff5c">
                <circle cx="190" cy="190" r="6" />
                <circle cx="260" cy="130" r="3.5" />
                <circle cx="120" cy="135" r="3.5" />
                <circle cx="285" cy="215" r="3.5" />
                <circle cx="125" cy="250" r="3.5" />
                <circle cx="240" cy="270" r="3.5" />
                <circle cx="165" cy="95" r="3.5" />
                <circle cx="95" cy="195" r="3.5" />
                <circle cx="300" cy="170" r="3.5" />
                <circle cx="160" cy="290" r="3.5" />
                <circle cx="310" cy="250" r="3.5" />
              </g>
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "repeating-linear-gradient(transparent, transparent 3px, rgba(0,0,0,0.13) 4px)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%,-50%)",
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(8,12,6,0.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(184,255,92,0.5)",
              }}
            >
              <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
                <path d="M8 15.5 L13 21 L23 9" fill="none" stroke="#b8ff5c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* right: earned all-clear */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "50px 56px",
            maxWidth: 600,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.24em",
              color: "#6f8a4a",
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            Scan complete · {report.counts.healthy}/{report.total} cleared
          </div>
          <h2
            style={{
              fontFamily: "var(--font-archivo), sans-serif",
              fontWeight: 800,
              fontSize: 38,
              lineHeight: 1.02,
              margin: "0 0 16px",
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
            }}
          >
            Nothing hiding
            <br />
            in here.
          </h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "#93a883", margin: "0 0 30px", maxWidth: 440 }}>
            Every dependency checks out against live advisories. No known CVEs, no abandoned
            packages, no typosquats, no install-time scripts. This manifest is safe to install.
          </p>
          <ExportToolbar report={report} shareUrl={shareUrl} />
          {report.transitive && report.transitive.scanned > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, fontSize: 11.5, color: "#8aa06a" }}>
              <RiskGlyph status="healthy" size={9} />
              {report.transitive.scanned} transitive dependencies also scanned — none high or critical.
            </div>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 26,
            }}
          >
            {metrics.map((m) => (
              <div
                key={m.label}
                style={{
                  background: "rgba(184,255,92,0.05)",
                  border: "1px solid rgba(184,255,92,0.18)",
                  borderRadius: 9,
                  padding: "14px 16px",
                }}
              >
                <div style={{ fontSize: 26, color: "#b8ff5c", fontWeight: 600 }}>{m.value}</div>
                <div style={{ fontSize: 10, color: "#7a8a5a", letterSpacing: "0.12em", marginTop: 2 }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 12,
              color: "#6f8a4a",
              lineHeight: 2,
            }}
          >
            {summary.map((s, i) => (
              <span key={s}>
                <span style={{ color: "#b8ff5c" }}>✓</span> {s}
                {i < summary.length - 1 ? "   " : ""}
              </span>
            ))}
            {report.hiddenHealthy > 0 && (
              <span style={{ opacity: 0.6 }}> &nbsp; +{report.hiddenHealthy} more</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
