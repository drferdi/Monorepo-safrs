import { readFile } from "node:fs/promises";
import path from "node:path";
import type { MarketingPageName } from "./marketing-routes.ts";

const marketingDirectory = path.join(
  process.cwd(),
  "src",
  "content",
  "marketing",
);

export async function loadMarketingHtml(
  pageName: MarketingPageName,
): Promise<string> {
  const filePath = path.join(marketingDirectory, `${pageName}.html`);
  return readFile(filePath, "utf8");
}
