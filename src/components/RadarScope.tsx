import type { CSSProperties, ReactNode } from "react";

/**
 * The signature instrument: a circular radar scope with rings, a crosshair, a
 * sweeping phosphor cone, and a CRT scanline overlay. Callers pass `children`
 * as <svg> node elements (blips / diamonds / triangles) positioned in a
 * `0 0 {size} {size}` viewBox.
 */
export function RadarScope({
  size,
  sweepSeconds = 4.5,
  sweepDeg = 62,
  sweepAlpha = 0.26,
  glow = "inset 0 0 80px rgba(184,255,92,0.05), 0 0 60px -10px rgba(184,255,92,0.14)",
  border = "rgba(184,255,92,0.18)",
  style,
  children,
}: {
  size: number;
  sweepSeconds?: number;
  sweepDeg?: number;
  sweepAlpha?: number;
  glow?: string;
  border?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const r = [0.14, 0.275, 0.41].map((f) => +(f * size).toFixed(1));
  const lo = +(size * 0.06).toFixed(1);
  const hi = +(size * 0.94).toFixed(1);
  const c = size / 2;
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        border: `1px solid ${border}`,
        boxShadow: glow,
        ...style,
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
          background: `conic-gradient(from 0deg, rgba(184,255,92,${sweepAlpha}), rgba(184,255,92,0) ${sweepDeg}deg)`,
          animation: `dv-sweep ${sweepSeconds}s linear infinite`,
        }}
      />
      <svg viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", inset: 0 }}>
        <circle cx={c} cy={c} r={r[0]} fill="none" stroke="rgba(184,255,92,0.13)" />
        <circle cx={c} cy={c} r={r[1]} fill="none" stroke="rgba(184,255,92,0.1)" />
        <circle cx={c} cy={c} r={r[2]} fill="none" stroke="rgba(184,255,92,0.08)" />
        <line x1={c} y1={lo} x2={c} y2={hi} stroke="rgba(184,255,92,0.09)" />
        <line x1={lo} y1={c} x2={hi} y2={c} stroke="rgba(184,255,92,0.09)" />
        {children}
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
  );
}
