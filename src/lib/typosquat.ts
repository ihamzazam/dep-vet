import { TOP_PACKAGES, TOP_PACKAGE_SET } from "./top-packages";

/**
 * Damerau-Levenshtein (optimal string alignment) edit distance.
 * Counts insertions, deletions, substitutions, and adjacent transpositions.
 */
export function editDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const d: number[][] = Array.from({ length: al + 1 }, () =>
    new Array<number>(bl + 1).fill(0),
  );
  for (let i = 0; i <= al; i++) d[i][0] = i;
  for (let j = 0; j <= bl; j++) d[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost, // substitution
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // transposition
      }
    }
  }
  return d[al][bl];
}

export interface TyposquatHit {
  target: string;
  distance: number;
}

/**
 * Returns the closest popular package this name might be impersonating, or null.
 *
 * Heuristic (Day 1): the name is NOT itself a known-good package, is at least
 * 3 chars, and is edit-distance 1-2 from a top package whose length is within 2.
 * Identical names are never flagged. Scoped names are checked on the bare name.
 */
export function detectTyposquat(rawName: string): TyposquatHit | null {
  // Scoped packages live in an owned namespace; the bare-name approach produces
  // false positives (e.g. "@babel/core" → "core" → "cors"). Skip them.
  if (rawName.startsWith("@")) return null;
  const name = bareName(rawName).toLowerCase();
  if (name.length < 3) return null;
  if (TOP_PACKAGE_SET.has(name)) return null; // it IS a known package

  let best: TyposquatHit | null = null;
  for (const target of TOP_PACKAGES) {
    if (Math.abs(target.length - name.length) > 2) continue;
    if (target === name) return null;
    const dist = editDistance(name, target);
    if (dist >= 1 && dist <= 2) {
      if (!best || dist < best.distance) best = { target, distance: dist };
    }
  }
  return best;
}

function bareName(name: string): string {
  // "@scope/pkg" -> "pkg"; otherwise unchanged
  const slash = name.lastIndexOf("/");
  return slash >= 0 ? name.slice(slash + 1) : name;
}
