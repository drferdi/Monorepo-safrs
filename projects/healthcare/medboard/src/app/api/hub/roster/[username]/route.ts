import { NextResponse } from 'next/server'
import { isCrewAuthorizedRequest, listCrewAccessUsers } from '@/lib/server/crew-access-auth'
import { listAllCrewProfiles } from '@/lib/server/crew-access-profile'

export const runtime = 'nodejs'

function maskValue(value: string): string {
  return value ? '***' : ''
}

export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  if (!isCrewAuthorizedRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { username } = await params
    const users = await listCrewAccessUsers()
    const profiles = listAllCrewProfiles()
    const user = users.find(item => item.username === username)

    if (!user) {
      return NextResponse.json({ ok: false, error: 'User tidak ditemukan.' }, { status: 404 })
    }

    const profile = profiles.get(user.username)

    return NextResponse.json({
      ok: true,
      member: {
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        institution: user.institution,
        profession: user.profession,
        role: user.role,
        profile: profile
          ? {
              fullName: profile.fullName,
              birthPlace: profile.birthPlace,
              birthDate: profile.birthDate,
              gender: profile.gender,
              domicile: profile.domicile,
              bloodType: profile.bloodType,
              degrees: profile.degrees,
              jobTitles: profile.jobTitles,
              employeeId: maskValue(profile.employeeId),
              strNumber: maskValue(profile.strNumber),
              sipNumber: maskValue(profile.sipNumber),
              serviceAreas: profile.serviceAreas,
              serviceAreaOther: profile.serviceAreaOther,
              institutionAdditional: profile.institutionAdditional,
              avatarUrl: profile.avatarUrl,
              whatsappNumber: profile.whatsappNumber,
              githubUrl: profile.githubUrl,
              linkedinUrl: profile.linkedinUrl,
              gravatarUrl: profile.gravatarUrl,
              blogUrl: profile.blogUrl,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('[Hub] Roster detail error:', error)
    return NextResponse.json({ ok: false, error: 'Gagal memuat profile crew.' }, { status: 500 })
  }
}
