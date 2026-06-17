/** package.json parsing with friendly, demo-grade error messages. */

export interface Dependency {
  name: string;
  range: string;
  dev: boolean;
}

export type ParseResult =
  | { ok: true; deps: Dependency[]; name: string | null }
  | { ok: false; error: string };

/** Hard cap so a pasted monorepo lockfile can't fan out into thousands of calls. */
export const MAX_DEPS = 200;

const NAME_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i;

export function parseManifest(text: string): ParseResult {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return {
      ok: false,
      error: "NO MANIFEST LOADED — paste a package.json or pick a target above.",
    };
  }

  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "invalid JSON";
    return {
      ok: false,
      error: `MANIFEST UNREADABLE — ${msg}. Check for a trailing comma or missing brace.`,
    };
  }

  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return {
      ok: false,
      error: "MANIFEST UNREADABLE — expected a JSON object with a dependencies field.",
    };
  }

  const obj = json as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name : null;

  const byName = new Map<string, Dependency>();
  collect(obj.dependencies, false, byName);
  collect(obj.devDependencies, true, byName); // deps win on conflict (added first)

  const deps = [...byName.values()];
  if (deps.length === 0) {
    return {
      ok: false,
      error:
        "NO DEPENDENCIES FOUND — this manifest has no dependencies or devDependencies to scan.",
    };
  }
  if (deps.length > MAX_DEPS) {
    return {
      ok: false,
      error: `TOO MANY DEPENDENCIES — ${deps.length} direct deps exceeds the ${MAX_DEPS} scan limit for the live demo.`,
    };
  }

  return { ok: true, deps, name };
}

function collect(
  field: unknown,
  dev: boolean,
  out: Map<string, Dependency>,
): void {
  if (!field || typeof field !== "object" || Array.isArray(field)) return;
  for (const [name, range] of Object.entries(field as Record<string, unknown>)) {
    if (out.has(name)) continue;
    if (!NAME_RE.test(name)) continue; // skip clearly bogus keys
    out.set(name, {
      name,
      range: typeof range === "string" ? range : "*",
      dev,
    });
  }
}
