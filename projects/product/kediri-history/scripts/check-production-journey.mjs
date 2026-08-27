import { readFileSync } from "node:fs";
import path from "node:path";

const htmlPath = path.resolve(
  "apps",
  "web",
  ".next",
  "server",
  "app",
  "journey.html",
);
const html = readFileSync(htmlPath, "utf8");

const forbidden = [
  "Pratinjau editorial lokal",
  "Naskah editorial untuk peninjauan",
  "/api/editorial-preview/",
  "Before We Go Back",
  "The City Continues",
  "Kota ini terus berlanjut.",
  "data-media-slot=",
];
const leaked = forbidden.filter((marker) => html.includes(marker));
const publishedSceneCount = (html.match(/class="scene"/gu) ?? []).length;

if (publishedSceneCount === 0) {
  console.error("Production Journey boundary failed: no CMS scene rendered.");
  process.exit(1);
}

if (leaked.length > 0) {
  console.error(
    `Production Journey boundary failed: editorial marker(s) leaked: ${leaked.join(", ")}`,
  );
  process.exit(1);
}

console.log(
  `Production Journey boundary passed: ${publishedSceneCount} CMS scene(s), 0 editorial markers or preview media.`,
);
