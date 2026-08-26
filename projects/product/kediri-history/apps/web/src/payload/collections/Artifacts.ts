import type { CollectionConfig } from "payload";

import { canAuthor, isAdmin, publishedOrAuthenticated } from "../access/index";
import { chronologyField } from "../fields/chronology";
import { slugField } from "../fields/slug";

const ARTIFACT_TYPES = [
  "inscription",
  "manuscript",
  "sculpture",
  "architectural_element",
  "coin",
  "ceramic",
  "tool",
  "machine",
  "document",
  "photograph_object",
  "textile",
  "other",
] as const;

/**
 * Objek fisik dan dokumenter. Identitas objek yang sudah terbit dan metadata
 * inventarisnya dilindungi dari penimpaan sembarangan (Technical Bible bagian
 * 9): Prasasti Hantang D.9 harus dapat berdiri sebagai catatan objek yang
 * stabil, tidak larut menjadi properti sebuah Scene.
 */
export const Artifacts: CollectionConfig = {
  slug: "artifacts",
  admin: {
    useAsTitle: "canonicalName",
    group: "Historical record",
    defaultColumns: [
      "canonicalName",
      "artifactType",
      "holdingInstitution",
      "_status",
    ],
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
      name: "artifactType",
      type: "select",
      required: true,
      options: ARTIFACT_TYPES.map((value) => ({ label: value, value })),
    },
    chronologyField({ required: false }),
    {
      type: "row",
      fields: [
        { name: "material", type: "text", admin: { width: "50%" } },
        { name: "dimensions", type: "text", admin: { width: "50%" } },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "holdingInstitution",
          type: "text",
          admin: { width: "50%" },
        },
        {
          name: "inventoryNumber",
          type: "text",
          admin: {
            width: "50%",
            description: "Catalogue reference, e.g. D.9 at Museum Nasional.",
          },
        },
      ],
    },
    {
      name: "discoveryLocation",
      type: "relationship",
      relationTo: "places",
      admin: {
        description:
          "The documented findspot. Never stage an object as if it were excavated where the story is set.",
      },
    },
    { name: "currentLocation", type: "relationship", relationTo: "places" },
    { name: "provenance", type: "textarea" },
    { name: "transcription", type: "textarea" },
    { name: "translation", type: "textarea" },
    {
      name: "media",
      type: "relationship",
      relationTo: "media-assets",
      hasMany: true,
    },
    { name: "summary", type: "textarea" },
  ],
};
