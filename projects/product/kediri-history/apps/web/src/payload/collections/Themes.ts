import type { CollectionConfig } from "payload";

import { canAuthor, isAdmin, publishedOrAuthenticated } from "../access/index";
import { slugField } from "../fields/slug";

/**
 * Tema membuat hubungan non-linear tanpa menduplikasi kebenaran
 * (Technical Bible bagian 15). Tema Brantas adalah yang paling penting: ia
 * menyambung 1042, 1678, 1869, 1912, 1948, dan 2026 menjadi satu sejarah yang
 * tidak berurutan waktu.
 *
 * Enam tema kurasi awal, bukan puluhan (UX Bible bagian 22).
 */
export const Themes: CollectionConfig = {
  slug: "themes",
  admin: {
    useAsTitle: "title",
    group: "Experience",
    defaultColumns: ["title", "order", "_status"],
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
    { name: "title", type: "text", required: true },
    slugField("title"),
    { name: "summary", type: "textarea", required: true },
    { name: "description", type: "richText" },
    {
      name: "order",
      type: "number",
      required: true,
      defaultValue: 0,
      admin: { position: "sidebar" },
    },
    {
      name: "heroMedia",
      type: "relationship",
      relationTo: "media-assets",
    },
  ],
};
