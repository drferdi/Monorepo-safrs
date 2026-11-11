import type { CollectionConfig } from "payload";

import { RELIABILITY_TIERS } from "../../modules/historical-domain/index";
import { canAuthor, isAdmin, publishedOrAuthenticated } from "../access/index";

const SOURCE_TYPES = [
  "inscription",
  "manuscript",
  "archival_document",
  "law",
  "government_record",
  "official_statistics",
  "museum_catalogue",
  "photograph",
  "map",
  "academic_book",
  "academic_article",
  "thesis",
  "newspaper",
  "oral_history",
  "corporate_record",
  "community_archive",
  "website",
] as const;

/**
 * Otoritas bibliografis dan arsip. Sebuah sumber bukan otomatis sebuah klaim
 * historis (Technical Bible bagian 10) — hubungan sumber ke klaim hidup di
 * EvidenceLink, lengkap dengan peran dan kekuatannya.
 */
export const Sources: CollectionConfig = {
  slug: "sources",
  admin: {
    useAsTitle: "title",
    group: "Evidence",
    defaultColumns: ["title", "sourceType", "institution", "_status"],
  },
  versions: { drafts: true },
  access: {
    read: publishedOrAuthenticated,
    create: canAuthor,
    update: canAuthor,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      ({ data, req }) => {
        // Peneliti boleh membuat sumber; hanya publisher yang menerbitkannya.
        if (data._status === "published") {
          const role = (req.user as { role?: string } | null)?.role;
          if (role !== "admin" && role !== "publisher") {
            throw new Error(
              "Only a publisher may publish a source. Save it as a draft and hand it to review.",
            );
          }
        }
        return data;
      },
    ],
  },
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "sourceType",
      type: "select",
      required: true,
      options: SOURCE_TYPES.map((value) => ({ label: value, value })),
    },
    { name: "authors", type: "text", hasMany: true },
    {
      type: "row",
      fields: [
        { name: "institution", type: "text", admin: { width: "50%" } },
        { name: "publisher", type: "text", admin: { width: "50%" } },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "publicationYear", type: "number", admin: { width: "33%" } },
        { name: "language", type: "text", admin: { width: "33%" } },
        {
          name: "reliabilityTier",
          type: "select",
          admin: { width: "34%" },
          options: RELIABILITY_TIERS.map((value) => ({ label: value, value })),
        },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "archiveCollection", type: "text", admin: { width: "50%" } },
        { name: "inventoryNumber", type: "text", admin: { width: "50%" } },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "url", type: "text", admin: { width: "34%" } },
        { name: "doi", type: "text", admin: { width: "33%" } },
        { name: "isbn", type: "text", admin: { width: "33%" } },
      ],
    },
    {
      name: "citation",
      type: "textarea",
      admin: { description: "Full citation as it should appear publicly." },
    },
    { name: "accessDate", type: "date" },
    {
      name: "linkStatus",
      type: "select",
      defaultValue: "active",
      admin: { position: "sidebar" },
      options: [
        { label: "Active", value: "active" },
        { label: "Superseded", value: "superseded" },
        { label: "Withdrawn", value: "withdrawn" },
        { label: "Broken link", value: "broken_link" },
      ],
    },
    { name: "notes", type: "textarea" },
  ],
};
