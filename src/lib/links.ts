/** Source links — visible provenance (the data is real; here's where it comes from). */

/** Advisory page for a CVE/GHSA id. OSV is our source and has pages for both. */
export function advisoryUrl(id: string): string {
  return `https://osv.dev/vulnerability/${encodeURIComponent(id)}`;
}

/** npm package page. Names are URL-safe (incl. scoped "@scope/name"). */
export function npmUrl(pkg: string): string {
  return `https://www.npmjs.com/package/${pkg}`;
}
