// The pinned TheOracle vector artefact (Gaffer, 2026-10-25: option A1 of
// docs/plans/active/2026-10-25-theoracle-index-out-of-git.md). theoracle/index/vectors.f32 is a build output, not a
// git file: every rebuild stored a whole new 53 MB Git LFS object, which the included 10 GiB per-account quota
// cannot carry. The tracked theoracle/index/manifest.json is the pin - a download is accepted only if its SHA-256
// equals manifest.vectors.sha256, the same check src/lib/theoracle-grounding.ts runs before it answers a case.
// Release assets are outside the Git LFS quota (2 GiB per file, no bandwidth limit) and the repository stays
// private, so every call needs a token with read access to its contents.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { indexDir, root } from "./theoracle-model.mjs";

export const repository = "drferdi/Sentrapedia";
// One release holds every index version; the asset name carries indexSha256, so an upload never replaces an older
// artefact and an older commit keeps finding its own index.
export const releaseTag = "theoracle-index";
export const manifestPath = `${indexDir}manifest.json`;
export const vectorsPath = `${indexDir}vectors.f32`;

// Run from the capsule root or stop with the folder spelled out (Gaffer, 2026-10-25): from anywhere else npm says
// "Missing script" and node says "Cannot find module", neither of which says where to stand. The path is computed
// from this file, so the message is right on any machine.
export function requireCapsuleRoot(command) {
  const here = resolve(process.cwd()), capsule = resolve(root);
  if (here === capsule) return;
  console.error(`Jalankan perintah ini dari folder capsule Sentrapedia:\n  cd ${capsule}\n  npm run ${command}\nSekarang berjalan di ${here}.`);
  process.exit(1);
}

export const readManifest = () => JSON.parse(readFileSync(manifestPath, "utf8"));
export const assetName = manifest => `vectors-${manifest.indexSha256}.f32`;
// SENTRAPEDIA_INDEX_TOKEN is the server and workstation name; GH_TOKEN and GITHUB_TOKEN are what CI already sets.
export const indexToken = () => process.env.SENTRAPEDIA_INDEX_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";

export const apiHeaders = (token, accept = "application/vnd.github+json") => ({
  accept,
  authorization: `Bearer ${token}`,
  "x-github-api-version": "2022-11-28",
  "user-agent": "sentrapedia-theoracle-index",
});

// The release, or null when the tag does not exist yet. Any other failure is an error: a 401 or 403 must not read
// as "not published".
export async function findRelease(token) {
  const response = await fetch(`https://api.github.com/repos/${repository}/releases/tags/${releaseTag}`, { headers: apiHeaders(token) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub ${response.status} for release ${releaseTag} of ${repository}: ${(await response.text()).slice(0, 200)}`);
  return response.json();
}
