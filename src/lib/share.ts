/**
 * Shareable links with no database: the manifest is encoded into the URL hash
 * (base64url of UTF-8). Opening the link re-runs the scan against live data.
 * Browser-only (uses btoa/atob + TextEncoder).
 */

// Keep links sane; very large manifests fall back to "no share link".
const MAX_ENCODED = 12_000;

export function encodeManifest(manifest: string): string {
  try {
    const bytes = new TextEncoder().encode(manifest);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    const b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return b64.length > MAX_ENCODED ? "" : b64;
  } catch {
    return "";
  }
}

export function decodeManifest(encoded: string): string | null {
  try {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}
