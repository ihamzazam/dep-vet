"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AmbientBackground, TopBar } from "@/components/chrome";
import { Landing } from "@/components/Landing";
import { Analyzing } from "@/components/Analyzing";
import { Report } from "@/components/Report";
import {
  DEMO_MIXED,
  DEMO_HEALTHY,
  EXAMPLE_REAL,
  EXAMPLE_CLEAN,
  EXAMPLE_BROKEN,
} from "@/lib/demo";
import { parseManifest } from "@/lib/parse";
import type { AnalyzeResponse, ScanReport } from "@/lib/types";

declare const pendo: {
  track: (event: string, properties?: Record<string, string | number | boolean>) => void;
} | undefined;

type Screen = "landing" | "analyzing" | "report";
type Source = "real" | "clean" | "broken" | "custom";

const PHASES = [
  "ESTABLISHING DEPENDENCY TREE",
  "CROSS-REFERENCING CVE DATABASE",
  "INSPECTING INSTALL SCRIPTS",
  "COMPILING VERDICT",
];
const MIN_SCAN_MS = 2800;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function Home() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [input, setInputState] = useState("");
  const [source, setSource] = useState<Source>("custom");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ScanReport | null>(null);

  const [scanPhase, setScanPhase] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [scanTotal, setScanTotal] = useState(0);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const runId = useRef(0); // guards against a stale run resolving after reset

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    if (interval.current !== null) {
      clearInterval(interval.current);
      interval.current = null;
    }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const setInput = useCallback((v: string) => {
    setInputState(v);
    setSource("custom");
    setError(null);
  }, []);

  const reset = useCallback(() => {
    runId.current += 1;
    clearTimers();
    setScreen("landing");
    setReport(null);
    setScanPhase(0);
    setScanCount(0);
    setError(null);
  }, [clearTimers]);

  const startScan = useCallback(
    async (src: Source, text: string) => {
      const parsed = parseManifest(text);
      if (!parsed.ok) {
        if (typeof pendo !== "undefined") {
          pendo.track("manifest_parse_failed", {
            error_message: parsed.error.substring(0, 200),
            input_length: text.length,
            source: src,
          });
        }
        setScreen("landing");
        setError(parsed.error);
        return;
      }

      if (typeof pendo !== "undefined") {
        pendo.track("manifest_submitted", {
          source: src,
          dependency_count: parsed.deps.length,
          project_name: parsed.name ?? "unknown",
          input_length: text.length,
        });
      }

      setError(null);

      const total =
        src === "real" ? 46 : src === "clean" ? 38 : parsed.deps.length;

      const myRun = ++runId.current;
      clearTimers();
      setScreen("analyzing");
      setScanPhase(0);
      setScanCount(0);
      setScanTotal(total);

      // phase timeline (matches the design cadence)
      timers.current.push(setTimeout(() => setScanPhase(1), 800));
      timers.current.push(setTimeout(() => setScanPhase(2), 1550));
      timers.current.push(setTimeout(() => setScanPhase(3), 2350));
      // count ticker
      const step = Math.max(1, Math.ceil(total / 24));
      interval.current = setInterval(() => {
        setScanCount((c) => (c >= total ? c : Math.min(total, c + step)));
      }, 50);

      const started = Date.now();
      let result: { report?: ScanReport; error?: string };
      try {
        if (src === "real") result = { report: DEMO_MIXED };
        else if (src === "clean") result = { report: DEMO_HEALTHY };
        else {
          const res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ manifest: text }),
          });
          const json = (await res.json()) as AnalyzeResponse & { error?: string };
          result = res.ok
            ? { report: json.report }
            : { error: json.error ?? "SCAN FAILED — please try again." };
        }
      } catch {
        result = {
          error:
            "NETWORK ERROR — could not reach the scanner. Check your connection and retry.",
        };
      }

      // hold the reveal for at least the animation window
      const elapsed = Date.now() - started;
      if (elapsed < MIN_SCAN_MS) await sleep(MIN_SCAN_MS - elapsed);
      if (myRun !== runId.current) return; // a reset happened mid-scan

      clearTimers();
      if (result.error || !result.report) {
        const errorMsg = result.error ?? "SCAN FAILED — please try again.";
        if (typeof pendo !== "undefined") {
          pendo.track("scan_failed", {
            error_message: errorMsg.substring(0, 200),
            source: src,
            is_network_error: errorMsg.startsWith("NETWORK ERROR"),
            is_timeout: errorMsg.includes("TIMED OUT"),
          });
        }
        setScreen("landing");
        setError(errorMsg);
        return;
      }
      setScanCount(result.report.total);
      setReport(result.report);
      setScreen("report");

      if (typeof pendo !== "undefined") {
        const rpt = result.report;
        pendo.track("scan_completed", {
          verdict: rpt.mode,
          total_packages: rpt.total,
          critical_count: rpt.counts.critical,
          warning_count: rpt.counts.warning,
          healthy_count: rpt.counts.healthy,
          fix_count: rpt.fixes.length,
          has_typosquat_caught: !!rpt.caught,
          typosquat_package_name: rpt.caught?.name ?? "",
          scan_duration_ms: elapsed,
          source: src,
          has_ai_enrichment: rpt.packages.some((p) => !!p.aiNote),
        });
      }
    },
    [clearTimers],
  );

  const loadExample = useCallback(
    (src: Exclude<Source, "custom">, text: string) => {
      if (typeof pendo !== "undefined") {
        pendo.track("example_loaded", {
          example_type: src,
        });
      }
      setInputState(text);
      setSource(src);
      setError(null);
      void startScan(src, text);
    },
    [startScan],
  );

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background: "#080c06",
        color: "#eef5e4",
        fontFamily: "var(--font-jetbrains), monospace",
        overflow: "hidden",
      }}
    >
      <AmbientBackground />
      <TopBar />

      {screen === "landing" && (
        <Landing
          input={input}
          onInput={setInput}
          error={error}
          onScan={() => startScan(source, input)}
          onLoadReal={() => loadExample("real", EXAMPLE_REAL)}
          onLoadClean={() => loadExample("clean", EXAMPLE_CLEAN)}
          onLoadBroken={() => loadExample("broken", EXAMPLE_BROKEN)}
        />
      )}

      {screen === "analyzing" && (
        <Analyzing
          phaseNum={scanPhase + 1}
          phaseText={PHASES[scanPhase] ?? PHASES[0]}
          scanCount={scanCount}
          scanTotal={scanTotal}
          scanPct={scanTotal ? Math.round((scanCount / scanTotal) * 100) : 0}
        />
      )}

      {screen === "report" && report && <Report report={report} onReset={reset} />}
    </div>
  );
}
