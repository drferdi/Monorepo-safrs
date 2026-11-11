import type { Field } from "payload";

import { SLUG_PATTERN, toSlug } from "../../modules/historical-domain/index";

/**
 * Slug stabil. Tautan pendidikan yang dibagikan hari ini harus tetap hidup
 * bertahun-tahun kemudian, jadi bentuknya dibatasi dan divalidasi.
 */
export function slugField(source = "canonicalName"): Field {
  return {
    name: "slug",
    type: "text",
    required: true,
    unique: true,
    index: true,
    admin: {
      position: "sidebar",
      description: "Stable public identifier. Changing it breaks shared links.",
    },
    hooks: {
      beforeValidate: [
        ({ value, data }) => {
          if (typeof value === "string" && value.length > 0)
            return toSlug(value);
          const candidate = (data as Record<string, unknown> | undefined)?.[
            source
          ];
          return typeof candidate === "string" ? toSlug(candidate) : value;
        },
      ],
    },
    validate: (value: unknown) => {
      if (typeof value !== "string" || !SLUG_PATTERN.test(value)) {
        return "Slug must be lowercase words separated by hyphens.";
      }
      return true;
    },
  };
}
