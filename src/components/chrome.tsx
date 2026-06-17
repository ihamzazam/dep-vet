import { Logo, COLORS } from "./glyphs";

/** Fixed ambient grid + vignette behind everything. */
export function AmbientBackground() {
  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(184,255,92,0.038) 1px, transparent 1px), linear-gradient(90deg, rgba(184,255,92,0.038) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(120% 90% at 80% 10%, rgba(184,255,92,0.05), transparent 50%), radial-gradient(100% 100% at 50% 120%, rgba(0,0,0,0.55), transparent 60%)",
        }}
      />
    </>
  );
}

export function TopBar() {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "18px 30px",
        borderBottom: "1px solid rgba(184,255,92,0.1)",
      }}
    >
      <Logo />
      <span
        style={{
          fontFamily: "var(--font-archivo), sans-serif",
          fontWeight: 800,
          fontSize: 18,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        Dep<span style={{ color: COLORS.phosphor }}>Vet</span>
      </span>
      <span
        style={{
          fontSize: 10,
          color: "#6f8a4a",
          letterSpacing: "0.16em",
          marginLeft: 6,
          whiteSpace: "nowrap",
        }}
      >
        SUPPLY-CHAIN SCANNER
      </span>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 18 }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 10,
            letterSpacing: "0.14em",
            color: "#6f8a4a",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: COLORS.phosphor,
              boxShadow: `0 0 8px ${COLORS.phosphor}`,
              animation: "dv-pulse 2s infinite",
            }}
          />
          SCANNER ONLINE
        </span>
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.14em",
            color: "#4a5a38",
            whiteSpace: "nowrap",
          }}
          className="dv-nodata"
        >
          v0.9 · NO DATA LEAVES BROWSER
        </span>
      </div>
    </div>
  );
}
