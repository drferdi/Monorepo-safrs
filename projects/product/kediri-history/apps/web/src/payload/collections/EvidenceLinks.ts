import type { CollectionConfig } from "payload";

import {
  EVIDENCE_LINK_ROLES,
  EVIDENCE_LINK_STRENGTHS,
} from "../../modules/historical-domain/index";
import { canAuthor, isAdmin, publishedOrAuthenticated } from "../access/index";

/**
 * Sambungan klaim ke sumber, dengan metadata yang membuat sistem ini dapat
 * diaudit (Technical Bible bagian 12).
 *
 * Peran `contradicts` adalah bagian terpenting dari koleksi ini: ia membuat
 * ketidaksepakatan dapat direpresentasikan, bukan dihapus. Sebuah sumber yang
 * membantah klaim tetap dicatat sebagai bukti — itulah bedanya sejarah dari
 * promosi.
 *
 * `locator` menuntut ketepatan: halaman, baris prasasti, atau frame arsip,
 * bukan sekadar menunjuk seluruh buku.
 */
export const EvidenceLinks: CollectionConfig = {
  slug: "evidence-links",
  labels: { singular: "Evidence link", plural: "Evidence links" },
  admin: {
    useAsTitle: "locator",
    group: "Evidence",
    defaultColumns: ["claim", "source", "role", "strength"],
  },
  versions: { drafts: true },
  access: {
    read: publishedOrAuthenticated,
    create: canAuthor,
    update: canAuthor,
    delete: isAdmin,
  },
  fields: [
    {
      name: "claim",
      type: "relationship",
      relationTo: "evidence-claims",
      required: true,
      index: true,
    },
    {
      name: "source",
      type: "relationship",
      relationTo: "sources",
      required: true,
      index: true,
    },
    {
      type: "row",
      fields: [
        {
          name: "role",
          type: "select",
          required: true,
          defaultValue: "supports",
          admin: { width: "50%" },
          options: EVIDENCE_LINK_ROLES.map((value) => ({
            label: value,
            value,
          })),
        },
        {
          name: "strength",
          type: "select",
          required: true,
          defaultValue: "moderate",
          admin: { width: "50%" },
          options: EVIDENCE_LINK_STRENGTHS.map((value) => ({
            label: value,
            value,
          })),
        },
      ],
    },
    {
      name: "locator",
      type: "text",
      admin: {
        description:
          "Page, chapter, inscription line, archive frame, table, or paragraph. Be exact.",
      },
    },
    { name: "note", type: "textarea" },
  ],
};
