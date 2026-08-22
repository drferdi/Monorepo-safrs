import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const contentDirectory = path.join(root, "src", "content", "marketing");

/** Phase 1: landing only — import home from live Webflow source. */
const PAGES = [["https://www.podiumautomation.com/", "home"]];

function normalizeDocument(source) {
  let html = source.replace(/\r\n/g, "\n");

  html = html.replace(
    /https:\/\/www\.podiumautomation\.com(\/[^"'\s>]*)?/gi,
    (_match, pathname = "") => {
      if (!pathname || pathname === "/") return "/";
      return pathname.endsWith("/") ? pathname : `${pathname}/`;
    },
  );

  html = html.replace(
    /(\s(?:href|action)=["'])(\/(?!\/)[^"'?#]*)(["'])/g,
    (_match, prefix, routePath, suffix) => {
      if (routePath === "/") return `${prefix}/${suffix}`;
      const withSlash = routePath.endsWith("/") ? routePath : `${routePath}/`;
      return `${prefix}${withSlash}${suffix}`;
    },
  );

  return html;
}

await mkdir(contentDirectory, { recursive: true });

for (const [url, fileName] of PAGES) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "SentraBotMarketingImport/1.0 (+https://sentrahai.com)",
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }

  const html = normalizeDocument(await response.text());
  await writeFile(
    path.join(contentDirectory, `${fileName}.html`),
    html,
    "utf8",
  );
  console.log(`Imported ${fileName}.html from ${url}`);
}

console.log(`Imported ${PAGES.length} landing HTML page(s).`);
