export interface AnalyzingProps {
  phaseNum: number;
  phaseText: string;
  scanCount: number;
  scanTotal: number;
  scanPct: number;
}

export function Analyzing({
  phaseNum,
  phaseText,
  scanCount,
  scanTotal,
  scanPct,
}: AnalyzingProps) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        minHeight: "calc(100vh - 61px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 30,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.28em",
          color: "#ffb020",
          textTransform: "uppercase",
          marginBottom: 24,
          animation: "dv-flicker 1.6s infinite",
        }}
      >
        ▸ scan in progress — do not close
      </div>

      {/* scope */}
      <div
        style={{
          position: "relative",
          width: 440,
          maxWidth: "92vw",
          aspectRatio: "1 / 1",
          borderRadius: "50%",
          overflow: "hidden",
          border: "1px solid rgba(184,255,92,0.24)",
          boxShadow:
            "inset 0 0 70px rgba(184,255,92,0.07), 0 0 70px -8px rgba(184,255,92,0.22)",
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
              "conic-gradient(from 0deg, rgba(184,255,92,0.34), rgba(184,255,92,0) 64deg)",
            animation: "dv-sweep 2.4s linear infinite",
          }}
        />
        <svg viewBox="0 0 440 440" style={{ position: "absolute", inset: 0 }}>
          <circle cx="220" cy="220" r="60" fill="none" stroke="rgba(184,255,92,0.14)" />
          <circle cx="220" cy="220" r="120" fill="none" stroke="rgba(184,255,92,0.11)" />
          <circle cx="220" cy="220" r="180" fill="none" stroke="rgba(184,255,92,0.08)" />
          <line x1="220" y1="20" x2="220" y2="420" stroke="rgba(184,255,92,0.09)" />
          <line x1="20" y1="220" x2="420" y2="220" stroke="rgba(184,255,92,0.09)" />
          <circle cx="220" cy="220" r="6" fill="#b8ff5c" />
          <g fill="#b8ff5c">
            <circle cx="290" cy="150" r="3.5" style={{ animation: "dv-blip .5s both .1s" }} />
            <circle cx="150" cy="160" r="3.5" style={{ animation: "dv-blip .5s both .25s" }} />
            <circle cx="330" cy="240" r="3.5" style={{ animation: "dv-blip .5s both .4s" }} />
            <circle cx="130" cy="280" r="3.5" style={{ animation: "dv-blip .5s both .55s" }} />
            <circle cx="280" cy="320" r="3.5" style={{ animation: "dv-blip .5s both .7s" }} />
            <circle cx="210" cy="100" r="3.5" style={{ animation: "dv-blip .5s both .85s" }} />
            <circle cx="100" cy="200" r="3.5" style={{ animation: "dv-blip .5s both 1s" }} />
            <circle cx="360" cy="180" r="3.5" style={{ animation: "dv-blip .5s both 1.15s" }} />
            <circle cx="190" cy="340" r="3.5" style={{ animation: "dv-blip .5s both 1.3s" }} />
            <circle cx="340" cy="310" r="3.5" style={{ animation: "dv-blip .5s both .6s" }} />
          </g>
          <polygon
            points="160,300 167,313 153,313"
            fill="#ffb020"
            style={{ animation: "dv-ignite .6s both 1.4s" }}
          />
          <g style={{ animation: "dv-ignite .6s both 1.65s" }}>
            <rect x="354" y="114" width="13" height="13" transform="rotate(45 360 120)" fill="#ff4530" />
            <circle cx="360" cy="120" r="17" fill="none" stroke="#ff4530" strokeWidth="1.5" opacity="0.6" />
          </g>
          <g style={{ animation: "dv-ignite .6s both 1.95s" }}>
            <rect x="114" y="124" width="13" height="13" transform="rotate(45 120 130)" fill="#ff4530" />
            <circle cx="120" cy="130" r="17" fill="none" stroke="#ff4530" strokeWidth="1.5" opacity="0.6" />
          </g>
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

      {/* readout */}
      <div style={{ width: 520, maxWidth: "92vw", marginTop: 34 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 12, letterSpacing: "0.18em", color: "#cfe6b0" }}>
            PHASE {phaseNum}/4 · {phaseText}
          </span>
          <span style={{ fontSize: 12, color: "#b8ff5c" }}>
            {scanCount}/{scanTotal}
          </span>
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 4,
            background: "rgba(184,255,92,0.1)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${scanPct}%`,
              background: "linear-gradient(90deg,#6f8a4a,#b8ff5c)",
              boxShadow: "0 0 12px rgba(184,255,92,0.6)",
              transition: "width .12s linear",
            }}
          />
        </div>
        <div style={{ marginTop: 14, fontSize: 11, color: "#6f8a4a", lineHeight: 1.9 }}>
          <div>
            › resolving transitive tree<span style={{ color: "#b8ff5c" }}> ok</span>
          </div>
          <div>
            › querying advisory feeds (OSV · GHSA · npm audit)
            <span style={{ color: "#b8ff5c" }}> ok</span>
          </div>
          <div style={{ color: "#ffb020" }}>
            › inspecting postinstall scripts &amp; typosquats…
          </div>
        </div>
      </div>
    </div>
  );
}
