import type { CollectionConfig } from "payload";

import { REPRESENTATION_POLICIES } from "../../modules/historical-domain/index";
import { canAuthor, isAdmin, publishedOrAuthenticated } from "../access/index";
import { chronologyField } from "../fields/chronology";
import { slugField } from "../fields/slug";

/**
 * Identitas historis.
 *
 * `representationPolicy` mencegah kerusakan yang paling halus di proyek ini:
 * citra yang terlihat autentik dipasangkan pada tokoh yang wajahnya tidak
 * pernah terdokumentasi. Jayabhaya adalah `no_known_likeness`, dan sistem harus
 * mampu menolak potret yang meyakinkan sekalipun (Technical Bible bagian 7).
 *
 * Alias adalah data kelas satu, bukan metadata pencarian: Jayabaya dan
 * Jayabhaya harus sama-sama menemukan orang yang sama tanpa pengunjung perlu
 * menguasai transliterasi.
 */
export const People: CollectionConfig = {
  slug: "people",
  admin: {
    useAsTitle: "canonicalName",
    group: "Historical record",
    defaultColumns: ["canonicalName", "representationPolicy", "_status"],
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
    { name: "displayName", type: "text" },
    {
      name: "aliases",
      type: "text",
      hasMany: true,
      admin: {
        description:
          "Historical spellings and alternative names. Searchable, and shown where naming matters.",
      },
    },
    { name: "titles", type: "text", hasMany: true },
    { name: "regnalNames", type: "text", hasMany: true },
    chronologyField({
      name: "birthChronology",
      label: "Birth chronology",
      required: false,
    }),
    chronologyField({
      name: "deathChronology",
      label: "Death chronology",
      required: false,
    }),
    {
      name: "representationPolicy",
      type: "select",
      required: true,
      defaultValue: "no_known_likeness",
      admin: {
        position: "sidebar",
        description:
          "What kind of image may ever stand for this person. Default assumes no authenticated likeness exists.",
      },
      options: REPRESENTATION_POLICIES.map((value) => ({
        label: value,
        value,
      })),
    },
    { name: "summary", type: "textarea" },
    { name: "biography", type: "richText" },
  ],
};
