import type { CSSProperties } from "react";
import type { RiskStatus } from "@/lib/types";

export const COLORS = {
  phosphor: "#b8ff5c",
  amber: "#ffb020",
  red: "#ff4530",
  red2: "#ff5a48",
  ink: "#0a0c07",
} as const;

export function statusColor(status: RiskStatus): string {
  return status === "critical"
    ? COLORS.red
    : status === "warning"
      ? COLORS.amber
      : COLORS.phosphor;
}

/**
 * Shape-coded risk glyph — critical = diamond, warning = triangle,
 * healthy = circle. Pairs shape with color so the signal is never
 * conveyed by color alone (color-blind safe, per the brief).
 */
export function RiskGlyph({
  status,
  size = 11,
  style,
}: {
  status: RiskStatus;
  size?: number;
  style?: CSSProperties;
}) {
  const base: CSSProperties = { display: "inline-block", flexShrink: 0, ...style };
  if (status === "critical") {
    return (
      <span
        aria-label="critical"
        style={{
          ...base,
          width: size,
          height: size,
          background: COLORS.red,
          transform: "rotate(45deg)",
        }}
      />
    );
  }
  if (status === "warning") {
    const half = Math.round(size * 0.55);
    return (
      <span
        aria-label="warning"
        style={{
          ...base,
          width: 0,
          height: 0,
          borderLeft: `${half}px solid transparent`,
          borderRight: `${half}px solid transparent`,
          borderBottom: `${size}px solid ${COLORS.amber}`,
        }}
      />
    );
  }
  return (
    <span
      aria-label="healthy"
      style={{
        ...base,
        width: size,
        height: size,
        borderRadius: "50%",
        background: COLORS.phosphor,
      }}
    />
  );
}

/** DepVet crosshair wordmark glyph. */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden>
      <rect
        x="2.5"
        y="2.5"
        width="17"
        height="17"
        rx="2.5"
        fill="none"
        stroke={COLORS.phosphor}
        strokeWidth="1.6"
      />
      <line x1="11" y1="2.5" x2="11" y2="19.5" stroke={COLORS.phosphor} strokeWidth="1.6" />
      <line x1="2.5" y1="11" x2="19.5" y2="11" stroke={COLORS.phosphor} strokeWidth="1.6" />
      <circle cx="11" cy="11" r="2.4" fill={COLORS.phosphor} />
    </svg>
  );
}

/** Warning-triangle icon used in the inline error readout. */
export function ErrorTriangle({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{ flexShrink: 0, marginTop: 1 }}
      aria-hidden
    >
      <polygon
        points="8,1.5 15,14 1,14"
        fill="none"
        stroke="#ff5a48"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <rect x="7.2" y="6" width="1.6" height="4.5" fill="#ff5a48" />
      <rect x="7.2" y="11.3" width="1.6" height="1.6" fill="#ff5a48" />
    </svg>
  );
}

/** "name@version" with the @version dimmed, matching the design. */
export function PkgName({
  name,
  version,
  color,
  versionColor,
}: {
  name: string;
  version: string;
  color?: string;
  versionColor?: string;
}) {
  return (
    <span style={{ color }}>
      {name}
      <span style={{ color: versionColor }}>@{version}</span>
    </span>
  );
}
