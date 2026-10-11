// Fetches the pinned TheOracle embedding model into theoracle/model/ once; every file is checked by SHA-256.
import { existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileSha256, modelDir, profile } from "./theoracle-model.mjs";

try {
  for (const [name, expected] of Object.entries(profile.files)) {
    const target = `${modelDir}${profile.id}/${name}`;
    if (existsSync(target) && statSync(target).size === expected.size && await fileSha256(target) === expected.sha256) continue;
    mkdirSync(dirname(target), { recursive: true });
    const response = await fetch(`https://huggingface.co/${profile.id}/resolve/${profile.revision}/${name}`, { redirect: "follow" });
    if (!response.ok || !response.body) throw new Error(`Model TheOracle gagal diunduh: ${name} (${response.status}).`);
    const partial = `${target}.partial`;
    await writeFile(partial, response.body);
    if (await fileSha256(partial) !== expected.sha256) { rmSync(partial); throw new Error(`Hash model TheOracle tidak cocok: ${name}.`); }
    renameSync(partial, target);
  }
  console.log("Sentrapedia: model embedding TheOracle tersedia dan terverifikasi.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
