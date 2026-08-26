import type { CollectionConfig } from "payload";

import {
  NEVER_PUBLIC_RIGHTS_CLASS,
  RIGHTS_CLASSES,
  VISUAL_EVIDENCE_CLASSES,
} from "../../modules/historical-domain/index";
import {
  canCurateAssets,
  isAdmin,
  publishedOrAuthenticated,
} from "../access/index";

/**
 * Derivatif publik. Media adalah entitas berprovenance, bukan lampiran berkas
 * (Technical Bible bagian 14).
 *
 * Autentisitas dan izin adalah dua pertanyaan terpisah: visualEvidenceClass
 * menjawab "ini bukti apa", rightsClass menjawab "boleh dipakai atau tidak".
 * Gerbang terbit di bawah menolak aset yang tidak dapat menjawab keduanya.
 */
export const MediaAssets: CollectionConfig = {
  slug: "media-assets",
  admin: {
    useAsTitle: "title",
    group: "Rights & Media",
    defaultColumns: ["title", "visualEvidenceClass", "rightsClass", "_status"],
  },
  upload: { disableLocalStorage: true },
  versions: { drafts: true },
  access: {
    read: publishedOrAuthenticated,
    create: canCurateAssets,
    update: canCurateAssets,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data._status !== "published") return data;

        const missing: string[] = [];
        if (!data.visualEvidenceClass) missing.push("visualEvidenceClass");
        if (!data.rightsClass) missing.push("rightsClass");
        if (!data.altText) missing.push("altText");
        if (!data.creditLine) missing.push("creditLine");
        if (missing.length > 0) {
          throw new Error(
            `A public asset needs provenance and rights before it can publish. Missing: ${missing.join(", ")}.`,
          );
        }
        if (data.rightsClass === NEVER_PUBLIC_RIGHTS_CLASS) {
          throw new Error(
            "A reference-only asset may inform research and design, but it never ships publicly.",
          );
        }
        if (
          data.rightsExpiresAt &&
          new Date(data.rightsExpiresAt).getTime() < Date.now()
        ) {
          throw new Error(
            "The permission covering this asset has expired. Renew it before publishing.",
          );
        }
        return data;
      },
    ],
  },
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "altText",
      type: "textarea",
      admin: {
        description:
          "Describe what is visible, for someone who cannot see it. Required before publishing.",
      },
    },
    {
      name: "caption",
      type: "textarea",
      admin: { description: "Public caption: what it shows, when, and where." },
    },
    {
      type: "row",
      fields: [
        {
          name: "visualEvidenceClass",
          type: "select",
          admin: { width: "50%" },
          options: VISUAL_EVIDENCE_CLASSES.map((value) => ({
            label: value,
            value,
          })),
        },
        {
          name: "rightsClass",
          type: "select",
          admin: { width: "50%" },
          options: RIGHTS_CLASSES.map((value) => ({ label: value, value })),
        },
      ],
    },
    {
      name: "master",
      type: "relationship",
      relationTo: "media-masters",
      admin: {
        description:
          "The private archival original this derivative comes from.",
      },
    },
    {
      name: "rightsDocument",
      type: "relationship",
      relationTo: "rights-documents",
    },
    { name: "rightsExpiresAt", type: "date" },
    {
      type: "row",
      fields: [
        { name: "creator", type: "text", admin: { width: "50%" } },
        { name: "institution", type: "text", admin: { width: "50%" } },
      ],
    },
    {
      name: "creditLine",
      type: "text",
      admin: {
        description:
          "Exactly as the holding institution requires it to appear.",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "dateCreated",
          type: "text",
          admin: { width: "50%", description: "When the image was made." },
        },
        {
          name: "dateDepicted",
          type: "text",
          admin: { width: "50%", description: "When the subject existed." },
        },
      ],
    },
    {
      name: "contextNote",
      type: "textarea",
      admin: {
        description:
          "Archival captions carry the politics of the archive that wrote them. Record that context here rather than repeating it as narration.",
      },
    },
    {
      name: "uncertaintyNote",
      type: "textarea",
      admin: { description: "What this image does NOT establish." },
    },
    {
      name: "assetStatus",
      type: "select",
      defaultValue: "amber",
      admin: { position: "sidebar" },
      options: [
        { label: "GREEN - production ready", value: "green" },
        { label: "BLUE - verified, awaiting rights", value: "blue" },
        { label: "AMBER - evidence incomplete", value: "amber" },
        { label: "RED - claim without adequate visual proof", value: "red" },
        { label: "BLACK - prohibited representation", value: "black" },
      ],
    },
  ],
};
