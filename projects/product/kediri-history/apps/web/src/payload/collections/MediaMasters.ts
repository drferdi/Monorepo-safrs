import type { CollectionConfig } from "payload";

import { canCurateAssets, isAdmin, neverPublic } from "../access/index";

/**
 * Master arsip: TIFF museum, pindaian resolusi penuh, RAW. Privat tanpa
 * kecuali dan tidak pernah dikirim ke browser (Technical Bible bagian 38).
 *
 * Master yang sudah disetujui bersifat imutabel secara logis: koreksi
 * menghasilkan master baru, bukan menimpa yang lama, karena provenance yang
 * hilang tidak dapat dibangun ulang sementara kode selalu bisa.
 */
export const MediaMasters: CollectionConfig = {
  slug: "media-masters",
  admin: {
    useAsTitle: "title",
    group: "Rights & Media",
    description: "Private archival masters. Never public.",
  },
  upload: { disableLocalStorage: true },
  access: {
    read: neverPublic,
    create: canCurateAssets,
    update: canCurateAssets,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation }) => {
        if (operation === "update" && originalDoc?.approved === true) {
          const immutable = [
            "originInstitution",
            "inventoryReference",
            "checksum",
          ];
          for (const field of immutable) {
            if (
              data[field] !== undefined &&
              data[field] !== originalDoc[field]
            ) {
              throw new Error(
                `An approved master is immutable: ${field} cannot change. Create a new master instead.`,
              );
            }
          }
        }
        return data;
      },
    ],
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "originInstitution", type: "text", required: true },
    {
      name: "inventoryReference",
      type: "text",
      admin: {
        description:
          "Catalogue or shelfmark reference at the holding institution.",
      },
    },
    { name: "sourceUrl", type: "text" },
    {
      name: "checksum",
      type: "text",
      admin: { description: "SHA-256 of the original file as received." },
    },
    {
      name: "rightsDocument",
      type: "relationship",
      relationTo: "rights-documents",
      admin: { description: "The permission this master was received under." },
    },
    {
      name: "approved",
      type: "checkbox",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description: "Once approved, provenance fields become immutable.",
      },
    },
    { name: "notes", type: "textarea" },
  ],
};
