import { type NextRequest } from 'next/server'
import { z } from 'zod'

import { extractClinicalAnamnesisRich } from '@/lib/clinical/anamnesis-extractor'
import { handleCorsPreflight, jsonWithCors } from '@/lib/server/api-cors'
import { isCrewAuthorizedRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

const CORS_METHODS = ['POST', 'OPTIONS'] as const

const ExtractAnamnesisRequestSchema = z.object({
  text: z.string().trim().min(3).max(2000),
})

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request, CORS_METHODS)
}

export async function POST(request: NextRequest) {
  if (!(await isCrewAuthorizedRequest(request))) {
    return jsonWithCors(request, CORS_METHODS, { ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return jsonWithCors(
      request,
      CORS_METHODS,
      { ok: false, error: 'Body JSON tidak valid' },
      { status: 400 }
    )
  }

  const parsedBody = ExtractAnamnesisRequestSchema.safeParse(rawBody)
  if (!parsedBody.success) {
    return jsonWithCors(
      request,
      CORS_METHODS,
      {
        ok: false,
        error: 'Field wajib `text` harus berupa string klinis minimal 3 karakter',
      },
      { status: 400 }
    )
  }

  try {
    const extraction = await extractClinicalAnamnesisRich(parsedBody.data.text)

    return jsonWithCors(request, CORS_METHODS, {
      ok: true,
      data: extraction.data,
      meta: {
        source: extraction.source,
      },
    })
  } catch {
    return jsonWithCors(
      request,
      CORS_METHODS,
      { ok: false, error: 'Gagal mengekstrak anamnesis klinis' },
      { status: 500 }
    )
  }
}
