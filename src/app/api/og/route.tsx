import { ImageResponse } from "next/og";

export const runtime = "nodejs";

/** Dynamic OG card for shared /pkg links (brand + package name, no live scan). */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("name") || "your dependencies";
  const name = raw.slice(0, 60);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#080c06",
          padding: 72,
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 34, height: 34, border: "3px solid #b8ff5c", borderRadius: 6, display: "flex" }} />
          <div style={{ fontSize: 30, fontWeight: 800, color: "#eef5e4", letterSpacing: 2, display: "flex" }}>
            Dep<span style={{ color: "#b8ff5c" }}>Vet</span>
          </div>
          <div style={{ fontSize: 16, color: "#6f8a4a", letterSpacing: 4, marginLeft: 8 }}>
            SUPPLY-CHAIN CHECK
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, color: "#ffb020", letterSpacing: 3, marginBottom: 18 }}>
            IS IT SAFE TO INSTALL?
          </div>
          <div
            style={{
              fontSize: name.length > 26 ? 64 : 88,
              fontWeight: 700,
              color: "#cfe6b0",
              lineHeight: 1.05,
            }}
          >
            {name}
          </div>
        </div>

        <div style={{ fontSize: 22, color: "#6f8a4a" }}>
          CVEs · abandonment · typosquats · install scripts · transitive risk — no signup
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
