"use client";

import { useState } from "react";
import { COLORS, ErrorTriangle } from "./glyphs";

export interface LandingProps {
  input: string;
  onInput: (v: string) => void;
  error: string | null;
  onScan: () => void;
  onScanRepo: (repo: string) => void;
  onLoadReal: () => void;
  onLoadClean: () => void;
  onLoadBroken: () => void;
}

const chipBase: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains), monospace",
  fontSize: 12,
  background: "transparent",
  padding: "9px 13px",
  borderRadius: 6,
  cursor: "pointer",
};

export function Landing({
  input,
  onInput,
  error,
  onScan,
  onScanRepo,
  onLoadReal,
  onLoadClean,
  onLoadBroken,
}: LandingProps) {
  const [repoInput, setRepoInput] = useState("");
  const submitRepo = () => {
    const v = repoInput.trim();
    if (v) onScanRepo(v);
  };
  return (
    <div
      className="dv-landing"
      style={{
        position: "relative",
        zIndex: 2,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        minHeight: "calc(100vh - 61px)",
      }}
    >
      {/* copy + paste */}
      <div
        className="dv-landing-copy"
        style={{
          padding: "64px 60px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: 640,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            letterSpacing: "0.24em",
            color: COLORS.amber,
            textTransform: "uppercase",
            marginBottom: 20,
          }}
        >
          [ supply-chain recon ]
        </div>
        <h1
          className="dv-h1"
          style={{
            fontFamily: "var(--font-archivo), sans-serif",
            fontWeight: 900,
            fontSize: "clamp(40px,4.4vw,56px)",
            lineHeight: 0.95,
            margin: "0 0 20px",
            letterSpacing: "-0.03em",
            textTransform: "uppercase",
            textWrap: "balance",
          }}
        >
          Audit before
          <br />
          you install.
        </h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.65,
            color: "#93a883",
            margin: "0 0 28px",
            maxWidth: 440,
          }}
        >
          Paste your <span style={{ color: "#cfe6b0" }}>package.json</span>. Every
          dependency is cross-checked against live vulnerability data, abandonment,
          typosquats, and malicious install-scripts — then plotted on the scope. One
          verdict, a prioritized fix list. Nothing leaves your browser.
        </p>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer?.files?.[0];
            if (file) file.text().then((t) => onInput(t)).catch(() => {});
          }}
          style={{
            position: "relative",
            background: "rgba(10,16,8,0.7)",
            border: "1px solid rgba(184,255,92,0.22)",
            borderRadius: 9,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 13px",
              borderBottom: "1px solid rgba(184,255,92,0.12)",
              background: "rgba(184,255,92,0.03)",
            }}
          >
            <span style={{ fontSize: 10, letterSpacing: "0.16em", color: "#6f8a4a" }}>
              ▸ package.json
            </span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "#4a5a38" }}>
              paste · drop a file · ⌘↵ to scan
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => onInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                onScan();
              }
            }}
            autoFocus
            placeholder={'{ "dependencies": { "react": "^18.2.0", ... } }'}
            spellCheck={false}
            aria-label="package.json input"
            style={{
              width: "100%",
              height: 150,
              resize: "none",
              border: "none",
              outline: "none",
              background: "transparent",
              color: "#cfe6b0",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 13,
              lineHeight: 1.6,
              padding: 14,
              caretColor: COLORS.phosphor,
            }}
          />
        </div>

        {/* or scan a public GitHub repo by URL */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: "#4a5a38", letterSpacing: "0.14em" }}>OR REPO:</span>
          <input
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitRepo();
              }
            }}
            placeholder="github.com/owner/repo"
            spellCheck={false}
            aria-label="GitHub repository URL"
            style={{
              flex: "1 1 220px",
              minWidth: 0,
              background: "rgba(10,16,8,0.7)",
              border: "1px solid rgba(184,255,92,0.22)",
              borderRadius: 7,
              color: "#cfe6b0",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 12,
              padding: "10px 12px",
              outline: "none",
              caretColor: COLORS.phosphor,
            }}
          />
          <button
            onClick={submitRepo}
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 12,
              color: "#cfe6b0",
              background: "transparent",
              border: "1px solid rgba(184,255,92,0.3)",
              padding: "10px 14px",
              borderRadius: 7,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            scan repo →
          </button>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              marginTop: 12,
              padding: "11px 14px",
              border: "1px solid rgba(255,69,48,0.4)",
              background: "rgba(255,69,48,0.08)",
              borderRadius: 7,
            }}
          >
            <ErrorTriangle />
            <div style={{ fontSize: 12, color: "#ffb1a8", lineHeight: 1.5 }}>{error}</div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 18,
          }}
        >
          <button
            onClick={onScan}
            style={{
              fontFamily: "var(--font-archivo), sans-serif",
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#0a0c07",
              background: COLORS.phosphor,
              border: "none",
              padding: "13px 26px",
              borderRadius: 7,
              cursor: "pointer",
              boxShadow: "0 0 34px -6px rgba(184,255,92,0.6)",
            }}
          >
            Initiate scan →
          </button>
          <span
            style={{ fontSize: 10, color: "#4a5a38", letterSpacing: "0.14em", margin: "0 4px" }}
          >
            TRY:
          </span>
          <button
            onClick={onLoadReal}
            style={{ ...chipBase, color: "#cfe6b0", border: "1px solid rgba(184,255,92,0.3)" }}
          >
            real-world app
          </button>
          <button
            onClick={onLoadClean}
            style={{ ...chipBase, color: "#cfe6b0", border: "1px solid rgba(184,255,92,0.3)" }}
          >
            clean project
          </button>
          <button
            onClick={onLoadBroken}
            style={{ ...chipBase, color: "#caa", border: "1px solid rgba(255,176,32,0.3)" }}
          >
            broken manifest
          </button>
        </div>

        <p
          style={{
            marginTop: 22,
            maxWidth: 460,
            fontSize: 10.5,
            lineHeight: 1.6,
            letterSpacing: "0.02em",
            color: "#4a5a38",
          }}
        >
          Results are based on public data (OSV · npm registry) and are not a
          substitute for a full security audit.
        </p>
      </div>

      {/* ambient radar */}
      <div className="dv-landing-radar" style={{ position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            right: "clamp(-56px,-2.5vw,-16px)",
            top: "50%",
            transform: "translateY(-50%)",
            width: "clamp(360px,38vw,520px)",
            height: "clamp(360px,38vw,520px)",
            borderRadius: "50%",
            overflow: "hidden",
            border: "1px solid rgba(184,255,92,0.18)",
            boxShadow:
              "inset 0 0 80px rgba(184,255,92,0.05), 0 0 60px -10px rgba(184,255,92,0.14)",
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
                "conic-gradient(from 0deg, rgba(184,255,92,0.26), rgba(184,255,92,0) 62deg)",
              animation: "dv-sweep 4.5s linear infinite",
            }}
          />
          <svg viewBox="0 0 520 520" style={{ position: "absolute", inset: 0 }}>
            <circle cx="260" cy="260" r="70" fill="none" stroke="rgba(184,255,92,0.13)" />
            <circle cx="260" cy="260" r="140" fill="none" stroke="rgba(184,255,92,0.1)" />
            <circle cx="260" cy="260" r="215" fill="none" stroke="rgba(184,255,92,0.08)" />
            <line x1="260" y1="30" x2="260" y2="490" stroke="rgba(184,255,92,0.09)" />
            <line x1="30" y1="260" x2="490" y2="260" stroke="rgba(184,255,92,0.09)" />
            <circle cx="260" cy="260" r="6" fill="#b8ff5c" />
            <circle cx="350" cy="180" r="4" fill="#b8ff5c" style={{ animation: "dv-pulse 3s infinite" }} />
            <circle cx="170" cy="330" r="4" fill="#b8ff5c" style={{ animation: "dv-pulse 3.5s infinite" }} />
            <circle cx="360" cy="350" r="4" fill="#b8ff5c" style={{ animation: "dv-pulse 2.7s infinite" }} />
            <circle cx="150" cy="170" r="4" fill="#b8ff5c" style={{ animation: "dv-pulse 3.2s infinite" }} />
            <circle cx="400" cy="270" r="4" fill="#b8ff5c" style={{ animation: "dv-pulse 2.4s infinite" }} />
            <rect x="394" y="134" width="12" height="12" transform="rotate(45 400 140)" fill="#ff4530" style={{ animation: "dv-pulse 1.8s infinite" }} />
            <polygon points="190,360 197,373 183,373" fill="#ffb020" style={{ animation: "dv-pulse 2.6s infinite" }} />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(transparent, transparent 3px, rgba(0,0,0,0.16) 4px)",
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 34,
            right: 48,
            textAlign: "right",
            fontSize: 10,
            letterSpacing: "0.16em",
            color: "#4a5a38",
            lineHeight: 1.8,
          }}
        >
          STANDBY · AWAITING MANIFEST
          <br />
          <span style={{ color: "#6f8a4a" }}>46 TARGET CAPACITY · 0 LOCKED</span>
        </div>
      </div>
    </div>
  );
}
