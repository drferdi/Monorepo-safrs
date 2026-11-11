import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json(
    {
      status: 'DISABLED',
      error: 'medical_knowledge_disabled',
      message: 'Medical knowledge endpoint sementara dinonaktifkan selama exit Google total.',
    },
    { status: 503 },
  )
}
