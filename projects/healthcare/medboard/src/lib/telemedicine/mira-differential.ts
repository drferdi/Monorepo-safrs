import { z } from 'zod'

// The MIRA differential Assist sends with a consult (Med-Assist ConsultMiraDifferential).
// MedBoard displays it as MIRA's output; it does not re-rank or re-code it.
const miraDifferentialSchema = z.object({
  engine: z.literal('MIRA'),
  generated_at: z.string().datetime(),
  items: z
    .array(
      z.object({
        rank: z.number().int().min(1),
        icd10: z.string().trim().min(1).max(16),
        nama: z.string().trim().min(1).max(300),
        confidence: z.number().min(0).max(1),
        cannot_miss: z.boolean(),
        rationale: z.string().max(2000),
      })
    )
    .min(1)
    .max(20),
  next_best_actions: z
    .array(
      z.object({
        kind: z.enum(['question', 'exam', 'test']),
        item: z.string().max(500),
        reason: z.string().max(1000),
      })
    )
    .max(20),
  missing_information: z.array(z.string().max(500)).max(20),
})

export type MiraDifferential = z.infer<typeof miraDifferentialSchema>

/** The differential, or null when it is absent or malformed; a bad one never fails the consult. */
export function parseMiraDifferential(value: unknown): MiraDifferential | null {
  if (value === undefined || value === null) return null
  const parsed = miraDifferentialSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}
