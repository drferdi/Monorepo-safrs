import type { Field } from "payload";

import { CHRONOLOGY_PRECISIONS } from "../../modules/historical-domain/index";

/**
 * Kronologi terstruktur, bukan timestamp. Tahun 1222 tidak pernah menjadi
 * 1222-01-01 (Technical Bible bagian 6). Presisi wajib diisi supaya
 * ketidaktahuan menjadi data, bukan celah.
 */
export function chronologyField(options?: {
  name?: string;
  label?: string;
  required?: boolean;
}): Field {
  return {
    name: options?.name ?? "chronology",
    type: "group",
    label: options?.label ?? "Chronology",
    fields: [
      {
        type: "row",
        fields: [
          {
            name: "startYear",
            type: "number",
            required: options?.required ?? true,
            admin: { width: "34%", description: "Negative for BCE." },
          },
          {
            name: "startMonth",
            type: "number",
            min: 1,
            max: 12,
            admin: { width: "33%" },
          },
          {
            name: "startDay",
            type: "number",
            min: 1,
            max: 31,
            admin: { width: "33%" },
          },
        ],
      },
      {
        type: "row",
        fields: [
          { name: "endYear", type: "number", admin: { width: "34%" } },
          {
            name: "endMonth",
            type: "number",
            min: 1,
            max: 12,
            admin: { width: "33%" },
          },
          {
            name: "endDay",
            type: "number",
            min: 1,
            max: 31,
            admin: { width: "33%" },
          },
        ],
      },
      {
        name: "precision",
        type: "select",
        required: options?.required ?? true,
        options: CHRONOLOGY_PRECISIONS.map((value) => ({
          label: value,
          value,
        })),
        admin: {
          description:
            "Pick the precision the evidence actually supports. Never widen a date to fit a field.",
        },
      },
      {
        name: "display",
        type: "text",
        required: options?.required ?? true,
        admin: {
          description:
            'Human-readable form shown to the public, e.g. "27 Juli 879" or "c. 1042".',
        },
      },
    ],
  };
}
