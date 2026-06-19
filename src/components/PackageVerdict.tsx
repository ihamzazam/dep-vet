"use client";

import Link from "next/link";
import type { ScanReport } from "@/lib/types";
import { COLORS, RiskGlyph, PkgName, statusColor } from "./glyphs";
import { ActionPill, StatTile, VulnLine, TransitiveSection } from "./Report";
import { npmUrl } from "@/lib/links";

const WORD = { critical: "Critical risk", warning: "Use with caution", healthy: "Looks healthy" } as const;

export function PackageVerdict({ report, name }: { report: ScanReport; name: string }) {
  const p = report.packages[0];
  const notFound = !p || p.summaryRight.includes("not found on npm");

  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        maxWidth: 760,
        margin: "0 auto",
        padding: "48px 28px 64px",
      }}
    >
      <Link
        href="/"
        style={{ fontSize: 11, color: "#6f8a4a", letterSpacing: "0.14em", textDecoration: "none" }}
      >
        ← DepVet · scan a full package.json
      </Link>

      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          letterSpacing: "0.24em",
          color: "#ffb020",
          textTransform: "uppercase",
          margin: "28px 0 14px",
        }}
      >
        [ supply-chain check ]
      </div>

      {notFound ? (
        <>
          <h1
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: "clamp(26px,4vw,38px)",
              color: "#cfe6b0",
              margin: "0 0 16px",
              wordBreak: "break-word",
            }}
          >
            {name}
          </h1>
          <p style={{ fontSize: 14, color: "#93a883", lineHeight: 1.6, maxWidth: 460 }}>
            We couldn&apos;t find <span style={{ color: "#cfe6b0" }}>{name}</span> on the npm
            registry. Double-check the spelling — or, if it&apos;s a near-miss of a popular package,
            that&apos;s exactly the kind of typosquat DepVet flags.
          </p>
        </>
      ) : (
        <>
          <h1
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: "clamp(24px,3.6vw,36px)",
              color: statusColor(p.status),
              margin: "0 0 14px",
              wordBreak: "break-word",
            }}
          >
            <PkgName name={p.name} version={p.version} versionColor="#6f8a4a" />
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <RiskGlyph status={p.status} size={14} />
            <span
              style={{
                fontFamily: "var(--font-archivo), sans-serif",
                fontWeight: 800,
                fontSize: 22,
                textTransform: "uppercase",
                letterSpacing: "-0.01em",
                color: statusColor(p.status),
              }}
            >
              {WORD[p.status]}
            </span>
            <a
              href={npmUrl(p.name)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginLeft: "auto",
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

          {report.verdictLine && (
            <p style={{ fontSize: 14, color: "#cfe6b0", lineHeight: 1.6, margin: "0 0 24px", maxWidth: 620 }}>
              {report.verdictLine}
            </p>
          )}

          {/* detail card */}
          <div
            style={{
              border: "1px solid rgba(184,255,92,0.14)",
              borderRadius: 10,
              padding: "18px 18px 8px",
              marginBottom: 26,
            }}
          >
            {p.tags.length > 0 && p.status !== "healthy" && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {p.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.12em",
                      color: p.status === "critical" ? "#ff8a7d" : "#ffc870",
                      border: `1px solid ${p.status === "critical" ? "rgba(255,90,72,0.4)" : "rgba(255,176,32,0.4)"}`,
                      padding: "2px 7px",
                      borderRadius: 3,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {p.description && (
              <div style={{ fontSize: 12.5, color: "#cbb78f", lineHeight: 1.6, marginBottom: 14, maxWidth: 660 }}>
                {p.description}
              </div>
            )}
            {p.vulns.map((v) => (
              <VulnLine key={v.id} vuln={v} />
            ))}
            {p.aiNote && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, letterSpacing: "0.18em", color: "#6f8a4a", textTransform: "uppercase", marginBottom: 6 }}>
                  ▸ in plain english
                </div>
                <div style={{ fontSize: 12, color: "#c8dab0", lineHeight: 1.6, borderLeft: "2px solid rgba(184,255,92,0.35)", paddingLeft: 12 }}>
                  {p.aiNote}
                </div>
              </div>
            )}
            <StatTile stat={p.stats} />
            {p.action && (
              <div style={{ marginBottom: 12 }}>
                <ActionPill action={p.action} />
              </div>
            )}
          </div>

          <TransitiveSection transitive={report.transitive} />
        </>
      )}

      <div style={{ fontSize: 10.5, color: "#4a5a38", letterSpacing: "0.04em", lineHeight: 1.7, marginTop: 8 }}>
        Checked against OSV (vulnerabilities), the npm registry (maintenance, install scripts),
        and deps.dev (transitive graph). Based on public data; not a substitute for a full
        security audit.
      </div>

      <div style={{ marginTop: 24 }}>
        <Link
          href="/"
          style={{
            display: "inline-block",
            fontFamily: "var(--font-archivo), sans-serif",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "#0a0c07",
            background: COLORS.phosphor,
            border: "none",
            padding: "12px 22px",
            borderRadius: 7,
            textDecoration: "none",
            boxShadow: "0 0 28px -8px rgba(184,255,92,0.6)",
          }}
        >
          Scan a full package.json →
        </Link>
      </div>
    </div>
  );
}
