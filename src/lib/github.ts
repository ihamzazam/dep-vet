/**
 * Fetch a repo's root package.json for the "scan a GitHub repo by URL" mode.
 *
 * Strategy (keyless, cheap-first): try the raw CDN on `main` then `master`
 * (not rate-limited), and only fall back to the GitHub contents API (auto-
 * resolves the default branch, ~60 req/hr/IP) for repos on a different default
 * branch. Results are cached upstream by the resulting manifest hash.
 */
import { fetchText, fetchJson } from "./http";

export type RepoFetch =
  | { ok: true; manifest: string; repo: string }
  | { ok: false; error: string };

const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;
const REPO_RE = /^[A-Za-z0-9_.-]+$/;

/** Parse "owner/repo", "github.com/owner/repo", or a full URL → {owner, repo}. */
export function parseRepo(input: string): { owner: string; repo: string } | null {
  let s = (input || "").trim();
  if (!s) return null;
  s = s.replace(/^https?:\/\//i, "").replace(/^(www\.)?github\.com\//i, "");
  const parts = s.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, "");
  if (!OWNER_RE.test(owner) || !REPO_RE.test(repo)) return null;
  return { owner, repo };
}

interface ContentsResponse {
  content?: string;
  encoding?: string;
}

export async function fetchRepoManifest(
  input: string,
  signal?: AbortSignal,
): Promise<RepoFetch> {
  const parsed = parseRepo(input);
  if (!parsed) {
    return {
      ok: false,
      error:
        "INVALID REPO — use a GitHub URL or owner/repo, e.g. github.com/expressjs/express.",
    };
  }
  const { owner, repo } = parsed;
  const slug = `${owner}/${repo}`;

  // 1) raw CDN, common default branches (not rate-limited)
  for (const branch of ["main", "master"]) {
    try {
      const txt = await fetchText(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/package.json`,
        { timeoutMs: 7000, signal },
      );
      if (txt) return { ok: true, manifest: txt, repo: slug };
    } catch {
      // network/other — fall through to the API
    }
  }

  // 2) contents API fallback (auto default branch)
  try {
    const data = await fetchJson<ContentsResponse>(
      `https://api.github.com/repos/${owner}/${repo}/contents/package.json`,
      { timeoutMs: 8000, signal, accept: "application/vnd.github+json", retries: 0 },
    );
    if (data?.content && data.encoding === "base64") {
      const manifest = Buffer.from(data.content, "base64").toString("utf-8");
      return { ok: true, manifest, repo: slug };
    }
  } catch (e) {
    const status = (e as { status?: number })?.status;
    if (status === 403) {
      return {
        ok: false,
        error:
          "GITHUB RATE LIMIT — too many repo lookups right now. Paste the package.json directly, or try again shortly.",
      };
    }
  }

  return {
    ok: false,
    error: `NO PACKAGE.JSON — couldn't read a root package.json from ${slug}. Is it a public repo with package.json at the root?`,
  };
}
