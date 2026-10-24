// Fetches the pinned TheOracle vector artefact into theoracle/index/vectors.f32 and checks it by SHA-256.
// Usage: node scripts/install-theoracle-index.mjs (npm run knowledge:install). Not part of postinstall: the public
// code tree has no index and no token, and the Docker dependencies stage installs before the manifest is copied.
import { existsSync, renameSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { fileSha256, indexDir } from "./theoracle-model.mjs";
import { apiHeaders, assetName, findRelease, indexToken, manifestPath, readManifest, repository, vectorsPath } from "./theoracle-index.mjs";

const fail = message => { console.error(`install-theoracle-index: ${message}`); process.exitCode = 1; };

if (process.env.SENTRAPEDIA_SKIP_INDEX === "1") {
  console.warn("Sentrapedia: unduhan index TheOracle dilewati karena SENTRAPEDIA_SKIP_INDEX=1.");
} else if (!existsSync(manifestPath)) {
  // Public code, private data (2026-10-19): no manifest means no database here, which is a supported state.
  console.warn("Sentrapedia: tidak ada theoracle/index/manifest.json, jadi tidak ada index yang dipasang.");
} else {
  const manifest = readManifest();
  const name = assetName(manifest);
  if (existsSync(vectorsPath) && await fileSha256(vectorsPath) === manifest.vectors.sha256) {
    console.log(`Sentrapedia: index TheOracle sudah sesuai manifest (${manifest.indexSha256.slice(0, 12)}).`);
  } else {
    const token = indexToken();
    if (!token) fail("SENTRAPEDIA_INDEX_TOKEN (or GH_TOKEN) is needed to read the private index artefact.");
    else {
      try {
        const release = await findRelease(token);
        const asset = release?.assets?.find(entry => entry.name === name);
        if (!asset) throw new Error(`${name} is not published on release ${repository}@theoracle-index yet. Run npm run knowledge:publish for this index first.`);
        const response = await fetch(asset.url, { headers: apiHeaders(token, "application/octet-stream"), redirect: "follow" });
        if (!response.ok || !response.body) throw new Error(`Index TheOracle gagal diunduh: ${name} (${response.status}).`);
        const partial = `${indexDir}vectors.partial.download`;
        await writeFile(partial, response.body);
        if (await fileSha256(partial) !== manifest.vectors.sha256) { rmSync(partial); throw new Error(`Hash index TheOracle tidak cocok dengan manifest: ${name}.`); }
        renameSync(partial, vectorsPath);
        console.log(`Sentrapedia: index TheOracle terpasang dan terverifikasi (${manifest.indexSha256.slice(0, 12)}).`);
      } catch (error) {
        fail(error.message);
      }
    }
  }
}
