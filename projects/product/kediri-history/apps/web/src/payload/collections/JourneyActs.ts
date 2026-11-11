import type { CollectionConfig } from "payload";

import { canAuthor, isAdmin, publishedOrAuthenticated } from "../access/index";
import { slugField } from "../fields/slug";

/**
 * Babak naratif Journey.
 *
 * `visualEraKey` merujuk token era yang didefinisikan di kode. CMS memilih
 * dunia visual mana yang berlaku; CMS tidak pernah memiliki warnanya sendiri
 * (Technical Bible bagian 16). Warna berubah karena kondisi historis berubah,
 * bukan karena ada bagian baru.
 */
const VISUAL_ERA_KEYS = [
  "present",
  "ancient",
  "panjalu",
  "collapse",
  "memory",
  "seventeenthCentury",
  "colonialIndustrial",
  "occupationRevolution",
  "industrialCity",
  "connectedModern",
  "finale",
] as const;

export const JourneyActs: CollectionConfig = {
  slug: "journey-acts",
  labels: { singular: "Journey act", plural: "Journey acts" },
  admin: {
    useAsTitle: "title",
    group: "Experience",
    defaultColumns: ["order", "title", "dateRangeDisplay", "_status"],
  },
  versions: { drafts: true },
  defaultSort: "order",
  access: {
    read: publishedOrAuthenticated,
    create: canAuthor,
    update: canAuthor,
    delete: isAdmin,
  },
  fields: [
    {
      name: "order",
      type: "number",
      required: true,
      unique: true,
      admin: { position: "sidebar" },
    },
    { name: "title", type: "text", required: true },
    slugField("title"),
    { name: "subtitle", type: "text" },
    {
      name: "dateRangeDisplay",
      type: "text",
      required: true,
      admin: { description: "Shown to the reader, e.g. 879 - 1042." },
    },
    { name: "introCopy", type: "textarea" },
    {
      name: "visualEraKey",
      type: "select",
      required: true,
      admin: {
        position: "sidebar",
        description:
          "Which code-defined era palette applies. The CMS selects intent, not colour values.",
      },
      options: VISUAL_ERA_KEYS.map((value) => ({ label: value, value })),
    },
  ],
};
