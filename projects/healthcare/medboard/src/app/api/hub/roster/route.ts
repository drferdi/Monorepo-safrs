// Drferdi — vision, brought to life.
import { NextResponse } from 'next/server'
import { isCrewAuthorizedRequest, listCrewAccessUsers } from '@/lib/server/crew-access-auth'
import { listAllCrewProfiles } from '@/lib/server/crew-access-profile'
import { loadCrewRankSummaries } from '@/lib/server/crew-rank-store'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  if (!isCrewAuthorizedRequest(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const users = await listCrewAccessUsers()
    const profiles = listAllCrewProfiles()
    const ranks = await loadCrewRankSummaries(users.map(user => user.username))

    const roster = users.map(user => {
      const profile = profiles.get(user.username)
      return {
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        institution: user.institution,
        profession: user.profession,
        role: user.role,
        rank: ranks.get(user.username),
        profile: profile
          ? {
              fullName: profile.fullName,
              gender: profile.gender,
              degrees: profile.degrees,
              jobTitles: profile.jobTitles,
              avatarUrl: profile.avatarUrl,
              serviceAreas: profile.serviceAreas,
              strNumber: profile.strNumber ? '***' : '',
              sipNumber: profile.sipNumber ? '***' : '',
              employeeId: profile.employeeId ? '***' : '',
              hasGithubUrl: !!profile.githubUrl,
              hasLinkedinUrl: !!profile.linkedinUrl,
              hasGravatarUrl: !!profile.gravatarUrl,
              hasBlogUrl: !!profile.blogUrl,
            }
          : null,
      }
    })

    return NextResponse.json({ ok: true, roster })
  } catch (error) {
    console.error('[Hub] Roster error:', error)
    return NextResponse.json({ ok: false, error: 'Gagal memuat roster.' }, { status: 500 })
  }
}
