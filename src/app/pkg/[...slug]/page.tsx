import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { analyzeManifest } from "@/lib/analyze";
import { getCachedReport, setCachedReport, manifestKey } from "@/lib/cache";
import { rateLimit } from "@/lib/ratelimit";
import { parsePkgSlug } from "@/lib/pkg";
import { AmbientBackground, TopBar } from "@/components/chrome";
import { PackageVerdict } from "@/components/PackageVerdict";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

type Params = { slug: string[] };

function manifestFor(name: string, version?: string): string {
  return JSON.stringify({ dependencies: { [name]: version ?? "latest" } });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { name } = parsePkgSlug((await params).slug);
  const label = name || "this package";
  return {
    title: `Is ${label} safe to install? — DepVet`,
    description: `Supply-chain check for the npm package ${label}: known CVEs, abandonment, typosquat, malicious install scripts, and transitive risk — one verdict, no signup.`,
    openGraph: {
      title: `${label} — DepVet supply-chain check`,
      description: `Is ${label} safe to install? CVEs, abandonment, typosquats, install scripts, and transitive risk in one verdict.`,
      images: [{ url: `/api/og?name=${encodeURIComponent(label)}`, width: 1200, height: 630 }],
    },
  };
}

const PAGE_STYLE: React.CSSProperties = {
  position: "relative",
  minHeight: "100vh",
  background: "#080c06",
  color: "#eef5e4",
  fontFamily: "var(--font-jetbrains), monospace",
  overflow: "hidden",
};

export default async function PkgPage({ params }: { params: Promise<Params> }) {
  const { name, version } = parsePkgSlug((await params).slug);
  const manifest = manifestFor(name, version);

  const key = manifestKey(manifest);
  let report = getCachedReport(key);

  // /pkg is a crawlable GET: serve cache freely, but gate live analysis behind a
  // per-IP rate limit, a hard time budget, and AI-off so bots can't run up cost.
  if (!report) {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
    if (rateLimit(ip).ok) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 14_000);
      try {
        const outcome = await analyzeManifest(manifest, { signal: ctrl.signal, ai: false });
        if (outcome.ok) {
          report = outcome.report;
          setCachedReport(key, report);
        }
      } catch {
        // fail open to the "couldn't check" view
      } finally {
        clearTimeout(timer);
      }
    }
  }

  return (
    <div style={PAGE_STYLE}>
      <AmbientBackground />
      <TopBar />
      {report ? (
        <PackageVerdict report={report} name={name} />
      ) : (
        <div style={{ position: "relative", zIndex: 2, maxWidth: 640, margin: "0 auto", padding: "64px 28px" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.24em", color: "#ffb020", textTransform: "uppercase", marginBottom: 14 }}>
            [ supply-chain check ]
          </div>
          <p style={{ fontSize: 14, color: "#93a883", lineHeight: 1.6, maxWidth: 460 }}>
            Couldn&apos;t check <span style={{ color: "#cfe6b0" }}>{name || "that package"}</span>.
            Make sure it&apos;s a valid npm package name.
          </p>
          <Link href="/" style={{ display: "inline-block", marginTop: 22, fontSize: 12, color: "#cfe6b0", border: "1px solid rgba(184,255,92,0.3)", padding: "10px 16px", borderRadius: 7, textDecoration: "none" }}>
            ← Scan a package.json
          </Link>
        </div>
      )}
    </div>
  );
}
