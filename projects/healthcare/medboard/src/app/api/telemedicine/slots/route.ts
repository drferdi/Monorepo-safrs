import { NextResponse } from 'next/server'

import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'
import { getDoctorSlots } from '@/lib/telemedicine/slots'

import type { ApiResponse, DoctorScheduleSlot } from '@/types/telemedicine.types'

export async function GET(request: Request): Promise<NextResponse> {
  const session = getCrewSessionFromRequest(request)
  if (!session) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        message: 'Unauthorized',
        timestamp: new Date().toISOString(),
      },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const doctorId = searchParams.get('doctorId')
  const date = searchParams.get('date') // YYYY-MM-DD

  if (!doctorId || !date) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        message: 'Parameter doctorId dan date wajib diisi',
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    )
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        data: null,
        message: 'Format date harus YYYY-MM-DD',
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    )
  }

  const slots = await getDoctorSlots(doctorId, date)

  return NextResponse.json<ApiResponse<DoctorScheduleSlot[]>>({
    success: true,
    data: slots,
    message: `${slots.filter(s => s.isAvailable).length} slot tersedia`,
    timestamp: new Date().toISOString(),
  })
}
