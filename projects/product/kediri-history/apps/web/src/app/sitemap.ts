import type { MetadataRoute } from "next";

import {
  listArtifacts,
  listEventsChronologically,
  listPeople,
  listPlaces,
} from "../content/queries";
import { SITE_URL } from "../site";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, people, places, artifacts] = await Promise.all([
    listEventsChronologically(),
    listPeople(),
    listPlaces(),
    listArtifacts(),
  ]);

  const publicEntries = PUBLIC_PATHS.map(
    (path) =>
      ({
        url: `${SITE_URL}${path}`,
        lastModified: LAST_UPDATED,
        changeFrequency:
          path === "" || path === "/journey" ? "weekly" : "monthly",
        priority: path === "" || path === "/journey" ? 1 : 0.7,
      }) satisfies MetadataRoute.Sitemap[number],
  );

  const archiveEntries = [
    ...events.map((entry) => `/archive/events/${entry.slug}`),
    ...people.map((entry) => `/archive/people/${entry.slug}`),
    ...places.map((entry) => `/archive/places/${entry.slug}`),
    ...artifacts.map((entry) => `/archive/objects/${entry.slug}`),
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: LAST_UPDATED,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...publicEntries, ...archiveEntries];
}
