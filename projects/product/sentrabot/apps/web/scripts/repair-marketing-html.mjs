import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const contentDirectory = path.join(root, "src", "content", "marketing");

/** Restore asset/CDN paths corrupted by overly broad text replacement. */
const ASSET_REPAIRS = [
  ["podium-pendampingan belajar-staging", "podium-automation-staging"],
  ["podium-pendampingan belajar", "podium-automation"],
  ["team/podium-pendampingan belajar/", "team/podium-automation/"],
  ["href%2c%20location.html", "href, location.href"],
  ["href%2c%20location-2.html", "href, location.href"],
  [
    'data-wf-domain="www.sentrabot.sentrahai.com"',
    'data-wf-domain="www.podiumautomation.com"',
  ],
];

function repairHtml(source) {
  let html = source;
  for (const [from, to] of ASSET_REPAIRS) {
    html = html.split(from).join(to);
  }
  return html;
}

const files = await readdir(contentDirectory);
let updated = 0;
for (const file of files) {
  if (!file.endsWith(".html")) continue;
  const filePath = path.join(contentDirectory, file);
  const before = await readFile(filePath, "utf8");
  const after = repairHtml(before);
  if (after !== before) {
    await writeFile(filePath, after, "utf8");
    updated += 1;
  }
}

console.log(`Marketing HTML asset repair: updated ${updated} file(s).`);
