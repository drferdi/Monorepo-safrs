import type { CollectionConfig } from "payload";

import {
  EVIDENCE_CLASS_LABELS,
  EVIDENCE_CLASSES,
} from "../../modules/historical-domain/index";
import {
  canApproveEvidenceField,
  canAuthor,
  isAdmin,
  publishedOrAuthenticated,
} from "../access/index";
import { slugField } from "../fields/slug";

/**
 * Entitas integritas inti: satu proposisi historis atomik.
 *
 * Dua pernyataan berikut adalah dua klaim, bukan satu, karena hubungan
 * buktinya berbeda (Technical Bible bagian 11):
 *   A. Prasasti Hantang memuat frasa Panjalu Jayati.
 *   B. Frasa itu ditafsirkan sebagai bukti kemenangan Panjalu atas Janggala.
 *
 * Kelas evidence dan tingkat keyakinan adalah dua sumbu berbeda. Sebuah
 * tradisi dapat terdokumentasi dengan sangat kuat SEBAGAI tradisi, tanpa
 * satu pun isi supranaturalnya menjadi fakta.
 */
export const EvidenceClaims: CollectionConfig = {
  slug: "evidence-claims",
  labels: { singular: "Evidence claim", plural: "Evidence claims" },
  admin: {
    useAsTitle: "canonicalStatement",
    group: "Evidence",
    defaultColumns: [
      "canonicalStatement",
      "evidenceClass",
      "confidence",
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
  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        if (data._status !== "published") return data;

        const role = (req.user as { role?: string } | null)?.role;
        if (role !== "admin" && role !== "publisher") {
          throw new Error(
            "Only a publisher may publish a claim. Hand it to review instead.",
          );
        }
        if (!data.reviewedBy || !data.reviewedAt) {
          throw new Error(
            "A published claim needs a named historical reviewer and a review date.",
          );
        }
        if (!data.publicSummary) {
          throw new Error(
            "A published claim needs a public summary. The audience reads this, not the canonical statement.",
          );
        }

        // sourceLinks adalah field join: ia tidak pernah hadir di `data`, jadi
        // gerbang ini harus MENGHITUNG tautan yang benar-benar ada. Akibatnya
        // sebuah klaim tidak dapat lahir langsung dalam keadaan terbit — ia
        // dibuat sebagai draf, ditautkan ke sumbernya, baru diterbitkan.
        // Itu memang alur editorial yang benar, bukan kerepotan.
        const claimId = originalDoc?.id;
        if (operation === "create" || claimId === undefined) {
          throw new Error(
            "A claim cannot be created as published. Save it as a draft, attach at least one EvidenceLink, then publish.",
          );
        }
        const links = await req.payload.count({
          collection: "evidence-links",
          where: {
            and: [
              { claim: { equals: claimId } },
              { role: { in: ["supports", "contextualizes"] } },
            ],
          },
          req,
        });
        if (links.totalDocs === 0) {
          throw new Error(
            "A published claim needs at least one supporting EvidenceLink. A claim without a source is not evidence.",
          );
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: "canonicalStatement",
      type: "textarea",
      required: true,
      admin: {
        description:
          "One atomic proposition, stated precisely. Split anything that needs the word and.",
      },
    },
    slugField("canonicalStatement"),
    {
      name: "publicSummary",
      type: "textarea",
      admin: { description: "How this is phrased for the public." },
    },
    {
      type: "row",
      fields: [
        {
          name: "evidenceClass",
          type: "select",
          required: true,
          admin: { width: "50%" },
          options: EVIDENCE_CLASSES.map((value) => ({
            label: EVIDENCE_CLASS_LABELS[value],
            value,
          })),
        },
        {
          name: "confidence",
          type: "select",
          required: true,
          defaultValue: "moderate",
          admin: {
            width: "50%",
            description:
              "How strongly this is attested. Independent of the evidence class.",
          },
          options: [
            { label: "High", value: "high" },
            { label: "Moderate", value: "moderate" },
            { label: "Low", value: "low" },
            { label: "Contested", value: "contested" },
          ],
        },
      ],
    },
    {
      name: "sourceLinks",
      type: "join",
      collection: "evidence-links",
      on: "claim",
      admin: {
        description:
          "Every link from this claim to a source, with its role and strength.",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "events",
          type: "relationship",
          relationTo: "events",
          hasMany: true,
          admin: { width: "50%" },
        },
        {
          name: "people",
          type: "relationship",
          relationTo: "people",
          hasMany: true,
          admin: { width: "50%" },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "places",
          type: "relationship",
          relationTo: "places",
          hasMany: true,
          admin: { width: "50%" },
        },
        {
          name: "artifacts",
          type: "relationship",
          relationTo: "artifacts",
          hasMany: true,
          admin: { width: "50%" },
        },
      ],
    },
    {
      name: "competingClaims",
      type: "relationship",
      relationTo: "evidence-claims",
      hasMany: true,
      admin: {
        description:
          "Where scholarship disagrees, record the disagreement. Never reconcile it silently.",
      },
    },
    {
      name: "supersededBy",
      type: "relationship",
      relationTo: "evidence-claims",
      admin: {
        position: "sidebar",
        description: "Corrections replace, they do not overwrite.",
      },
    },
    {
      name: "editorialNotes",
      type: "textarea",
      admin: { description: "Internal. Never rendered publicly." },
    },
    {
      name: "reviewedBy",
      type: "relationship",
      relationTo: "users",
      access: { update: canApproveEvidenceField },
      admin: { position: "sidebar" },
    },
    {
      name: "reviewedAt",
      type: "date",
      access: { update: canApproveEvidenceField },
      admin: { position: "sidebar" },
    },
  ],
};
