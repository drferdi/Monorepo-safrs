// Uploads theoracle/index/vectors.f32 as the pinned artefact for the index described by theoracle/index/manifest.json.
// Writes to GitHub, so it needs Gaffer's explicit go and refuses to run without --yes:
//   npm run knowledge:publish -- --yes
// Idempotent: an asset whose name already exists is left alone, because the name carries indexSha256.
import { existsSync, readFileSync } from "node:fs";
import { fileSha256 } from "./theoracle-model.mjs";
import { apiHeaders, assetName, findRelease, indexToken, manifestPath, readManifest, releaseTag, repository, vectorsPath } from "./theoracle-index.mjs";

const fail = message => { console.error(`publish-theoracle-index: ${message}`); process.exit(1); };

if (!process.argv.includes("--yes")) fail("this uploads to GitHub; re-run with --yes once Gaffer has approved it.");
if (!existsSync(manifestPath) || !existsSync(vectorsPath)) fail("theoracle/index/manifest.json and vectors.f32 must both be present.");

const manifest = readManifest();
const name = assetName(manifest);
// Never publish an artefact the manifest does not describe: the installer would reject it and the runtime would
// refuse to answer a case.
if (await fileSha256(vectorsPath) !== manifest.vectors.sha256) fail("vectors.f32 does not match manifest.vectors.sha256; run npm run knowledge:build first.");

const token = indexToken();
if (!token) fail("SENTRAPEDIA_INDEX_TOKEN (or GH_TOKEN) with write access to the repository contents is needed.");

let release = await findRelease(token);
if (!release) {
  const created = await fetch(`https://api.github.com/repos/${repository}/releases`, {
    method: "POST",
    headers: { ...apiHeaders(token), "content-type": "application/json" },
    body: JSON.stringify({
      tag_name: releaseTag,
      name: "TheOracle index artefacts",
      body: "Generated TheOracle vector files, one asset per index version (`vectors-<indexSha256>.f32`), fetched by `npm run knowledge:install`. Private data: not covered by the public Sentrapedia licence.",
      make_latest: "false",
    }),
  });
  if (!created.ok) fail(`GitHub ${created.status} creating release ${releaseTag}: ${(await created.text()).slice(0, 200)}`);
  release = await created.json();
  console.log(`publish-theoracle-index: created release ${releaseTag}.`);
}

if (release.assets?.some(asset => asset.name === name)) {
  console.log(`publish-theoracle-index: ${name} is already published; nothing to do.`);
} else {
  const bytes = readFileSync(vectorsPath);
  const upload = await fetch(`https://uploads.github.com/repos/${repository}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { ...apiHeaders(token), "content-type": "application/octet-stream" },
    body: bytes,
  });
  if (!upload.ok) fail(`GitHub ${upload.status} uploading ${name}: ${(await upload.text()).slice(0, 200)}`);
  const asset = await upload.json();
  if (asset.size !== bytes.byteLength) fail(`${name} uploaded as ${asset.size} bytes instead of ${bytes.byteLength}; delete the asset and retry.`);
  console.log(`publish-theoracle-index: ${name} published (${asset.size} bytes).`);
}
