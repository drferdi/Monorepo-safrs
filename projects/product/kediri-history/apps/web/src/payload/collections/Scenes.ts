import type { CollectionConfig } from "payload";

import {
  CHOREOGRAPHY_KEYS,
  isKnownChoreographyKey,
  isKnownVisualVariant,
  VISUAL_VARIANTS,
} from "../../modules/motion/index";
import { canAuthor, isAdmin, publishedOrAuthenticated } from "../access/index";
import { slugField } from "../fields/slug";

/**
 * Sebuah Scene MENYAJIKAN sejarah; ia tidak memilikinya (Technical Bible
 * bagian 17).
 *
 * Karena itu tidak ada satu pun field di sini yang menyimpan raja, hasil
 * pertempuran, atau sumber sebagai teks bebas. Yang ada hanyalah relasi ke
 * Event dan EvidenceClaim, ditambah naskah editorial dan satu choreographyKey.
 *
 * `choreographyKey` adalah seluruh permukaan kontrak CMS terhadap motion. CMS
 * boleh memilih "bridgeConstruction". CMS tidak boleh menyimpan selector,
 * tween, durasi, easing, nilai scrub, atau start/end ScrollTrigger — mengubah
 * CMS menjadi mesin animasi tak bertipe adalah cara tercepat menghancurkan
 * pemisahan yang menjaga proyek ini (Technical Bible bagian 20).
 */
export const Scenes: CollectionConfig = {
  slug: "scenes",
  admin: {
    useAsTitle: "title",
    group: "Experience",
    defaultColumns: [
      "order",
      "title",
      "dateDisplay",
      "choreographyKey",
      "_status",
    ],
  },
  versions: { drafts: true },
  defaultSort: "order",
  access: {
    read: publishedOrAuthenticated,
    create: canAuthor,
    update: canAuthor,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (
          typeof data.choreographyKey === "string" &&
          data.choreographyKey.length > 0 &&
          !isKnownChoreographyKey(data.choreographyKey)
        ) {
          throw new Error(
            `Unknown choreography key "${data.choreographyKey}". The motion registry in code decides what exists.`,
          );
        }
        if (
          typeof data.visualVariant === "string" &&
          data.visualVariant.length > 0 &&
          !isKnownVisualVariant(data.visualVariant)
        ) {
          throw new Error(
            `Unknown visual variant "${data.visualVariant}". The visual registry in code decides what exists.`,
          );
        }
        if (data._status === "published" && !data.primaryEvent) {
          throw new Error(
            "A published scene needs a primary event. A scene presents history; it cannot invent it.",
          );
        }
        if (data._status === "published" && !data.narrativeShort) {
          throw new Error(
            "A published scene needs its short narrative. Meaning must exist before motion does.",
          );
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: "order",
      type: "number",
      required: true,
      admin: { position: "sidebar" },
    },
    {
      name: "act",
      type: "relationship",
      relationTo: "journey-acts",
      required: true,
      admin: { position: "sidebar" },
    },
    { name: "title", type: "text", required: true },
    slugField("title"),
    { name: "subtitle", type: "text" },
    {
      name: "dateDisplay",
      type: "text",
      required: true,
      admin: { description: "The date as the reader sees it, e.g. 1135." },
    },
    {
      name: "primaryEvent",
      type: "relationship",
      relationTo: "events",
      admin: {
        description:
          "The single event this scene presents. Historical facts come from here, never from scene copy.",
      },
    },
    {
      name: "supportingEvents",
      type: "relationship",
      relationTo: "events",
      hasMany: true,
    },
    {
      name: "narrativeShort",
      type: "textarea",
      admin: { description: "Depth 1: the glance. One statement." },
    },
    {
      name: "narrativeLong",
      type: "richText",
      admin: { description: "Depth 2: the story. Context and interpretation." },
    },
    {
      name: "masterLine",
      type: "textarea",
      admin: {
        description:
          "Satu kalimat yang memikul scene ini, disajikan dalam tipografi monumental. Naskah editorial adalah milik CMS (Technical Bible bagian 19); kode hanya memiliki tipografinya. Ia harus tetap terbaca pada keadaan istirahat, bukan hanya pada satu titik progres gulir (UX Bible bagian 39).",
      },
    },
    {
      name: "featuredClaims",
      type: "relationship",
      relationTo: "evidence-claims",
      hasMany: true,
      admin: {
        description:
          "Only published claims may appear here. Depth 3 opens from these.",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "featuredPeople",
          type: "relationship",
          relationTo: "people",
          hasMany: true,
          admin: { width: "50%" },
        },
        {
          name: "featuredPlaces",
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
          name: "featuredArtifacts",
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
      name: "heroMedia",
      type: "relationship",
      relationTo: "media-assets",
      admin: {
        description:
          "One dominant visual idea. If reviewers cannot name it, the scene is unfocused.",
      },
    },
    {
      name: "featuredMedia",
      type: "relationship",
      relationTo: "media-assets",
      hasMany: true,
    },
    {
      name: "evidenceBadgeMode",
      type: "select",
      required: true,
      defaultValue: "auto",
      admin: {
        position: "sidebar",
        description:
          "auto derives the badge from the featured claims. Force a mode only where a scene deliberately shifts register, such as history beside tradition.",
      },
      options: [
        { label: "Auto from claims", value: "auto" },
        { label: "Always show", value: "always" },
        { label: "Hidden (no factual claim on screen)", value: "hidden" },
      ],
    },
    {
      name: "visualVariant",
      type: "select",
      admin: {
        position: "sidebar",
        description:
          "Intent only, sama seperti choreographyKey: ia memilih perlakuan visual yang sudah teruji di kode, bukan menyimpan nilai gaya.",
      },
      options: VISUAL_VARIANTS.map((value) => ({ label: value, value })),
    },
    {
      name: "choreographyKey",
      type: "select",
      admin: {
        position: "sidebar",
        description:
          "Intent only. The code registry maps this to a tested timeline.",
      },
      options: CHOREOGRAPHY_KEYS.map((value) => ({ label: value, value })),
    },
    {
      name: "sceneType",
      type: "select",
      required: true,
      defaultValue: "supporting",
      admin: { position: "sidebar" },
      options: [
        { label: "Hero", value: "hero" },
        { label: "Supporting", value: "supporting" },
        { label: "Interlude", value: "interlude" },
        { label: "Optional (non-linear room)", value: "optional" },
      ],
    },
    {
      name: "seo",
      type: "group",
      fields: [
        { name: "title", type: "text" },
        { name: "description", type: "textarea" },
        {
          name: "shareMedia",
          type: "relationship",
          relationTo: "media-assets",
        },
      ],
    },
  ],
};
