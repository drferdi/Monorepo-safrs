// GET /api/hub/documents/:id — one official Sentra document as a PDF, for signed-in crew only.
// The logic and its tests live in src/lib/server/official-documents.ts.

import { serveOfficialDocument } from '@/lib/server/official-documents'

export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return serveOfficialDocument(request, id)
}
