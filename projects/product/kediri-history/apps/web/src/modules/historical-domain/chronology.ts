import { z } from "zod";

/**
 * Kronologi historis adalah objek epistemik, bukan timestamp. Tahun 1222 tidak
 * pernah menjadi 1222-01-01 hanya untuk memuaskan sebuah kolom tanggal —
 * presisi disimpan eksplisit (Technical Bible bagian 6).
 */
export const CHRONOLOGY_PRECISIONS = [
  "exact_day",
  "month",
  "year",
  "range",
  "decade",
  "century",
  "approximate",
] as const;

export type ChronologyPrecision = (typeof CHRONOLOGY_PRECISIONS)[number];

export const chronologySchema = z
  .object({
    startYear: z.number().int(),
    startMonth: z.number().int().min(1).max(12).optional(),
    startDay: z.number().int().min(1).max(31).optional(),
    endYear: z.number().int().optional(),
    endMonth: z.number().int().min(1).max(12).optional(),
    endDay: z.number().int().min(1).max(31).optional(),
    precision: z.enum(CHRONOLOGY_PRECISIONS),
    display: z.string().min(1),
  })
  .refine(
    (value) =>
      value.precision !== "year" ||
      (value.startMonth === undefined && value.startDay === undefined),
    {
      message:
        "A year-precision chronology must not carry an invented month or day.",
      path: ["precision"],
    },
  );

export type Chronology = z.infer<typeof chronologySchema>;
