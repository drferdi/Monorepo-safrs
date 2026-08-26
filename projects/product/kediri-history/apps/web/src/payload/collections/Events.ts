import type { CollectionConfig } from "payload";

import { REVIEW_STATUSES } from "../../modules/historical-domain/index";
import { canAuthor, isAdmin, publishedOrAuthenticated } from "../access/index";
import { chronologyField } from "../fields/chronology";
import { slugField } from "../fields/slug";

/**
 * Sesuatu yang dinyatakan pernah terjadi dalam waktu.
 *
 * Event memiliki relasi ke orang, tempat, artefak, tema, dan klaim
 * (Technical Bible bagian 18). Scene kelak merujuk Event; Scene tidak pernah
 * menyalin isinya. Karena itu memperbaiki sebuah fakta di sini memperbaikinya
 * di seluruh situs, tanpa satu pun berkas React disentuh.
 */
export const Events: CollectionConfig = {
  slug: "events",
  admin: {
    useAsTitle: "canonicalName",
    group: "Historical record",
    defaultColumns: ["canonicalName", "reviewStatus", "_status"],
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
    chronologyField({ required: true }),
    { name: "summary", type: "textarea", required: true },
    { name: "description", type: "richText" },
    {
      type: "row",
      fields: [
        {
          name: "people",
          type: "relationship",
          relationTo: "people",
          hasMany: true,
          admin: { width: "50%" },
        },
        {
          name: "places",
          type: "relationship",
          relationTo: "places",
          hasMany: true,
          admin: { width: "50%" },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "artifacts",
          type: "relationship",
          relationTo: "artifacts",
          hasMany: true,
          admin: { width: "50%" },
        },
        {
          name: "themes",
          type: "relationship",
          relationTo: "themes",
          hasMany: true,
          admin: { width: "50%" },
        },
      ],
    },
    {
      name: "claims",
      type: "relationship",
      relationTo: "evidence-claims",
      hasMany: true,
      admin: {
        description:
          "The atomic propositions this event rests on. Public factual copy must be traceable to one of these.",
      },
    },
    {
      name: "relatedEvents",
      type: "relationship",
      relationTo: "events",
      hasMany: true,
    },
    {
      name: "reviewStatus",
      type: "select",
      required: true,
      defaultValue: "researching",
      admin: { position: "sidebar" },
      options: REVIEW_STATUSES.map((value) => ({ label: value, value })),
    },
  ],
};
