/**
 * deps.dev client — resolved transitive dependency graph (keyless).
 *
 * GET /v3/systems/npm/packages/{name}/versions/{version}:dependencies returns
 * `nodes[]` each with a `versionKey {system,name,version}` and a `relation`
 * (SELF | DIRECT | INDIRECT). Everything that isn't SELF is something this
 * package drags in — i.e. our transitive surface.
 */
import { fetchJson } from "./http";

export interface DepNode {
  name: string;
  version: string;
}

interface DepsResponse {
  nodes?: Array<{
    versionKey?: { system?: string; name?: string; version?: string };
    relation?: string;
  }>;
}

function encodePkg(name: string): string {
  // scoped names: "@scope/pkg" → "%40scope%2Fpkg"
  return encodeURIComponent(name);
}

/** Transitive nodes (relation !== SELF) for a resolved npm package@version. */
export async function fetchTransitiveNodes(
  name: string,
  version: string,
  signal?: AbortSignal,
): Promise<DepNode[]> {
  const url = `https://api.deps.dev/v3/systems/npm/packages/${encodePkg(
    name,
  )}/versions/${encodeURIComponent(version)}:dependencies`;
  const data = await fetchJson<DepsResponse>(url, {
    timeoutMs: 7000,
    signal,
    retries: 0,
  }).catch(() => null);
  if (!data?.nodes) return [];
  const out: DepNode[] = [];
  for (const n of data.nodes) {
    if (n.relation === "SELF") continue;
    const k = n.versionKey;
    if (k?.name && k.version) out.push({ name: k.name, version: k.version });
  }
  return out;
}
