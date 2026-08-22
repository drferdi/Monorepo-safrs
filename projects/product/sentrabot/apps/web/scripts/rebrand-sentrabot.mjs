import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { WAVES } from "./rebrand-phrases.mjs";

const root = path.resolve(import.meta.dirname, "..");
const contentDirectory = path.join(root, "src", "content", "marketing");

const waveArg = process.argv.find((arg) => arg.startsWith("--wave="));
const runAll = process.argv.includes("--all");
const waveNumber = waveArg ? Number(waveArg.split("=")[1]) : 1;

const wavesToRun = runAll
  ? Object.keys(WAVES)
      .map(Number)
      .sort((a, b) => a - b)
  : [waveNumber];

function isolateScripts(html) {
  const scriptPlaceholders = [];
  const stripped = html.replace(/<script\b[\s\S]*?<\/script>/gi, (block) => {
    const index = scriptPlaceholders.length;
    scriptPlaceholders.push(block);
    return `<!--SAFRS_SCRIPT_${index}-->`;
  });
  return { stripped, scriptPlaceholders };
}

function restoreScripts(html, scriptPlaceholders) {
  return html.replace(/<!--SAFRS_SCRIPT_(\d+)-->/g, (_match, index) => {
    return scriptPlaceholders[Number(index)] ?? _match;
  });
}

function applyReplacements(html, replacements) {
  let output = html;
  for (const [from, to] of replacements) {
    output = output.split(from).join(to);
  }
  return output;
}

function rebrandHtml(source, wave) {
  const { stripped, scriptPlaceholders } = isolateScripts(source);
  const rebranded = applyReplacements(stripped, wave.global);
  return restoreScripts(rebranded, scriptPlaceholders);
}

function rebrandPage(source, wave, fileName) {
  const html = rebrandHtml(source, wave);
  const pageReplacements = wave.pages?.[fileName];
  if (!pageReplacements) return html;

  const { stripped, scriptPlaceholders } = isolateScripts(html);
  const rebranded = applyReplacements(stripped, pageReplacements);
  return restoreScripts(rebranded, scriptPlaceholders);
}

for (const n of wavesToRun) {
  if (!WAVES[n]) {
    console.error(
      `Unknown wave ${n}. Available: ${Object.keys(WAVES).join(", ")}`,
    );
    process.exit(1);
  }
}

const landingOnly = process.env.MARKETING_LANDING_ONLY !== "0";
const files = (await readdir(contentDirectory)).filter((file) => {
  if (!file.endsWith(".html")) return false;
  if (landingOnly && file !== "home.html") return false;
  return true;
});
let totalUpdated = 0;

for (const waveNum of wavesToRun) {
  const wave = WAVES[waveNum];
  let updated = 0;

  for (const file of files) {
    const filePath = path.join(contentDirectory, file);
    const before = await readFile(filePath, "utf8");
    const after = rebrandPage(before, wave, file);
    if (after !== before) {
      await writeFile(filePath, after, "utf8");
      updated += 1;
      console.log(`  wave ${waveNum}: ${file}`);
    }
  }

  console.log(`Wave ${waveNum}: updated ${updated} HTML file(s).`);
  totalUpdated += updated;
}

console.log(
  `Done. ${totalUpdated} file update(s) across ${wavesToRun.length} wave(s).`,
);
