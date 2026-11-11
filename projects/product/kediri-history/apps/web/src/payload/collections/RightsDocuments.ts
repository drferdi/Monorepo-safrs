import type { CollectionConfig } from "payload";

import { canCurateAssets, isAdmin, neverPublic } from "../access/index";

/**
 * Perjanjian hak, surat izin, dan lisensi. Privat tanpa kecuali: dokumen ini
 * memuat nama, syarat komersial, dan kadang informasi kontak (Technical Bible
 * bagian 40). Ia tidak pernah dilayani ke browser publik.
 */
export const RightsDocuments: CollectionConfig = {
  slug: "rights-documents",
  admin: {
    useAsTitle: "title",
    group: "Rights & Media",
    description: "Private. Never public.",
  },
  upload: { disableLocalStorage: true },
  access: {
    read: neverPublic,
    create: canCurateAssets,
    update: canCurateAssets,
    delete: isAdmin,
  },
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "rightsType",
      type: "select",
      required: true,
      options: [
        {
          label: "Institutional permission",
          value: "institutional_permission",
        },
        { label: "Licence agreement", value: "licence_agreement" },
        { label: "Model / subject release", value: "subject_release" },
        { label: "Community donation agreement", value: "community_donation" },
        {
          label: "Public domain assessment",
          value: "public_domain_assessment",
        },
      ],
    },
    { name: "institution", type: "text" },
    {
      type: "row",
      fields: [
        { name: "effectiveFrom", type: "date", admin: { width: "50%" } },
        { name: "expiresAt", type: "date", admin: { width: "50%" } },
      ],
    },
    {
      name: "notes",
      type: "textarea",
      admin: {
        description: "Scope and limits of the permission, in plain language.",
      },
    },
  ],
};
