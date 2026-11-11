// Drferdi — vision, brought to life.
import { NextResponse } from 'next/server'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'

// Temporary: Return hardcoded staff until DB migration
const MY_ACCOUNT = {
  id: '1',
  staffId: 'ferdi',
  name: 'dr. Ferdi Iskandar',
  role: 'DOKTER PENANGGUNG JAWAB',
  color: '#D47A57',
  gender: 'male',
  avatarUrl: '/avatar/doctor-m.png',
  locationLat: -7.8166,
  locationLng: 112.0116,
  locationLabel: 'Ruang Dokter',
  canChat: true,
  canVideo: true,
  isActive: true,
}

export async function GET(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  // Return single account
  return NextResponse.json({
    success: true,
    data: [MY_ACCOUNT],
    message: '1 staff ditemukan',
  })
}
