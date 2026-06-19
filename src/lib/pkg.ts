/** Parse a /pkg/[...slug] route into a package name + optional version. */
export interface ParsedPkg {
  name: string;
  version?: string;
}

export function parsePkgSlug(slug: string[]): ParsedPkg {
  // Next gives catch-all segments URL-encoded (e.g. "@"→"%40"); decode each.
  const joined = (slug || [])
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    })
    .join("/")
    .trim();
  if (!joined) return { name: "" };

  // scoped "@scope/name[@version]" — the version "@" is the SECOND one.
  if (joined.startsWith("@")) {
    const at = joined.indexOf("@", 1);
    if (at > 0) return { name: joined.slice(0, at), version: joined.slice(at + 1) || undefined };
    return { name: joined };
  }
  // unscoped "name[@version]"
  const at = joined.indexOf("@");
  if (at > 0) return { name: joined.slice(0, at), version: joined.slice(at + 1) || undefined };
  return { name: joined };
}

/** Build the /pkg path for a package name (catch-all keeps scoped slashes). */
export function pkgHref(name: string, version?: string): string {
  const base = `/pkg/${name.trim()}`;
  return version ? `${base}@${version}` : base;
}
