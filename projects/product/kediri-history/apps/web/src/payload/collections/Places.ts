import type { CollectionConfig } from "payload";

import { canAuthor, isAdmin, publishedOrAuthenticated } from "../access/index";
import { slugField } from "../fields/slug";

const PLACE_TYPES = [
  "city",
  "region",
  "river",
  "kingdom",
  "settlement",
  "archaeological_site",
  "building",
  "bridge",
  "religious_site",
  "industrial_site",
  "transport_site",
  "landscape",
  "uncertain_historical_location",
] as const;

/**
 * Geografi modern dan geografi historis adalah objek epistemik yang berbeda
 * (Technical Bible bagian 8).
 *
 * Jembatan Lama dapat ditunjukkan tepat pada koordinatnya. Panjalu tidak boleh
 * diberi poligon Google Maps palsu. Karena itu lokasi modern dan lokasi
 * historis adalah dua kelompok terpisah, dan yang historis membawa tingkat
 * kepastiannya sendiri — peta rekonstruksi dan peta modern tidak pernah
 * berbicara dengan bahasa kepastian yang sama.
 */
export const Places: CollectionConfig = {
  slug: "places",
  admin: {
    useAsTitle: "canonicalName",
    group: "Historical record",
    defaultColumns: ["canonicalName", "placeType", "_status"],
  },
  versions: { drafts: true },
  access: {
    read: publishedOrAuthenticated,
    create: canAuthor,
    update: canAuthor,
    delete: isAdmin,
  },
  fields: [
    { name: "canonicalName", type: "text", required: true },
    slugField(),
    { name: "aliases", type: "text", hasMany: true },
    {
      name: "placeType",
      type: "select",
      required: true,
      options: PLACE_TYPES.map((value) => ({ label: value, value })),
    },
    {
      name: "modernLocation",
      type: "group",
      admin: {
        description:
          "Only for places that genuinely survive at a known location today.",
      },
      fields: [
        {
          type: "row",
          fields: [
            { name: "latitude", type: "number", admin: { width: "50%" } },
            { name: "longitude", type: "number", admin: { width: "50%" } },
          ],
        },
        { name: "addressContext", type: "text" },
      ],
    },
    {
      name: "historicalLocation",
      type: "group",
      admin: {
        description:
          "Where scholarship places it, and how confidently. Never sharpen a zone into a border.",
      },
      fields: [
        {
          name: "certainty",
          type: "select",
          defaultValue: "approximate_zone",
          options: [
            { label: "Precisely known", value: "precise" },
            { label: "Approximate zone", value: "approximate_zone" },
            { label: "Disputed among scholars", value: "disputed" },
            { label: "Unknown", value: "unknown" },
          ],
        },
        { name: "description", type: "textarea" },
        {
          name: "geometryReference",
          type: "text",
          admin: {
            description:
              "Reference to a reconstruction dataset, never a fabricated exact polygon.",
          },
        },
      ],
    },
    { name: "administrativeContext", type: "text" },
    { name: "heritageStatus", type: "text" },
    { name: "summary", type: "textarea" },
    { name: "history", type: "richText" },
  ],
};
