/**
 * npm registry + downloads client.
 *
 * Research notes baked in:
 *  - Full metadata is needed for `time` (last publish) and `maintainers`
 *    (abbreviated strips both). We read install-script intent from the resolved
 *    version's `scripts` (preinstall/install/postinstall). The abbreviated
 *    `hasInstallScript` boolean is the more reliable Day-2 signal — noted below.
 *  - Downloads: we use the per-package point endpoint (last-week). Bulk is
 *    faster but caps at 128 and silently drops scoped packages — not worth the
 *    branching for Day-1 (≤200 deps, concurrency-capped).
 */
import { fetchJson } from "./http";
import { maxSatisfying, validRange, clean as cleanVer } from "semver";

const REGISTRY = "https://registry.npmjs.org";
const DOWNLOADS = "https://api.npmjs.org/downloads/point/last-week";

interface NpmVersion {
  scripts?: Record<string, string>;
  hasInstallScript?: boolean;
  deprecated?: string;
  dist?: { tarball?: string };
}

interface NpmFullMeta {
  name?: string;
  "dist-tags"?: Record<string, string>;
  versions?: Record<string, NpmVersion>;
  time?: Record<string, string>; // version -> ISO, plus "modified"/"created"
  maintainers?: Array<{ name?: string }>;
  deprecated?: string;
  repository?: { url?: string } | string;
}

export interface NpmPackageData {
  found: boolean;
  resolvedVersion: string | null;
  latest: string | null;
  lastPublishIso: string | null;
  maintainers: number | null;
  deprecated: string | null;
  hasInstallScript: boolean;
  installHooks: string[]; // which of pre/install/post were present
  weeklyDownloads: number | null;
}

const INSTALL_HOOKS = ["preinstall", "install", "postinstall"];

function encodeName(name: string): string {
  // scoped packages must be percent-encoded: @scope/name -> @scope%2Fname
  return name.startsWith("@") ? name.replace("/", "%2F") : name;
}

function resolveVersion(
  range: string,
  versions: string[],
  latest: string | null,
): string | null {
  const r = (range || "").trim();
  // exact pin
  const cleaned = cleanVer(r);
  if (cleaned && versions.includes(cleaned)) return cleaned;
  if (versions.includes(r)) return r;
  // tag like "latest"/"next" or "*" or "workspace:*" etc.
  if (!r || r === "*" || r === "latest" || !validRange(r)) return latest;
  const best = maxSatisfying(versions, r);
  return best ?? latest;
}

export async function fetchNpmPackage(
  name: string,
  range: string,
  signal?: AbortSignal,
): Promise<NpmPackageData> {
  const empty: NpmPackageData = {
    found: false,
    resolvedVersion: null,
    latest: null,
    lastPublishIso: null,
    maintainers: null,
    deprecated: null,
    hasInstallScript: false,
    installHooks: [],
    weeklyDownloads: null,
  };

  const [meta, downloads] = await Promise.all([
    fetchJson<NpmFullMeta>(`${REGISTRY}/${encodeName(name)}`, {
      timeoutMs: 7000,
      signal,
    }).catch(() => null),
    fetchWeeklyDownloads(name, signal).catch(() => null),
  ]);

  if (!meta || !meta.versions) {
    return { ...empty, weeklyDownloads: downloads ?? null };
  }

  const versionKeys = Object.keys(meta.versions);
  const latest = meta["dist-tags"]?.latest ?? null;
  const resolved = resolveVersion(range, versionKeys, latest);
  const vObj = resolved ? meta.versions[resolved] : undefined;

  const hooks = vObj?.scripts
    ? INSTALL_HOOKS.filter((h) => h in (vObj.scripts as Record<string, string>))
    : [];
  const hasInstallScript = vObj?.hasInstallScript === true || hooks.length > 0;

  // "Last publish" + abandonment must reflect the PACKAGE's most recent release
  // (time[latest] / time.modified), not the pinned version — otherwise pinning an
  // old version of an actively-maintained package (e.g. react@18.2.0) reads as
  // "abandoned". Fall back to the resolved version's date only if needed.
  const lastPublishIso =
    (latest && meta.time?.[latest]) ||
    meta.time?.modified ||
    (resolved ? (meta.time?.[resolved] ?? null) : null) ||
    null;

  return {
    found: true,
    resolvedVersion: resolved,
    latest,
    lastPublishIso,
    maintainers: Array.isArray(meta.maintainers) ? meta.maintainers.length : null,
    deprecated: vObj?.deprecated ?? meta.deprecated ?? null,
    hasInstallScript,
    installHooks: hooks,
    weeklyDownloads: downloads ?? null,
  };
}

export async function fetchWeeklyDownloads(
  name: string,
  signal?: AbortSignal,
): Promise<number | null> {
  const data = await fetchJson<{ downloads?: number }>(
    `${DOWNLOADS}/${encodeName(name)}`,
    { timeoutMs: 6000, signal },
  );
  return typeof data?.downloads === "number" ? data.downloads : null;
}
