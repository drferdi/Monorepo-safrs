import type { MetadataRoute } from "next";

const SITE_URL = "https://kediri.sentrahai.com";
const LAST_UPDATED = new Date("2026-09-04T00:00:00.000Z");

const PUBLIC_PATHS = [
  "",
  "/journey",
  "/archive",
  "/explore",
  "/explore/places",
  "/explore/timeline",
  "/about",
  "/methodology",
  "/rights",
  "/accessibility",
  "/sources",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: LAST_UPDATED,
    changeFrequency: path === "" || path === "/journey" ? "weekly" : "monthly",
    priority: path === "" || path === "/journey" ? 1 : 0.7,
  }));
}
