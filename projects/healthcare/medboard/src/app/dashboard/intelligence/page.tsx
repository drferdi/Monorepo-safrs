import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import IntelligenceDashboardLiveStatus from './IntelligenceDashboardLiveStatus'
import IntelligenceDashboardScaffold from './IntelligenceDashboardScaffold'
import { resolveIntelligenceDashboardAccess } from '@/lib/intelligence/server'
import { getCrewSessionFromCookieHeader } from '@/lib/server/crew-access-auth'

export const dynamic = 'force-dynamic'

export default async function IntelligenceDashboardPage(): Promise<React.JSX.Element> {
  const headerStore = await headers()
  const session = getCrewSessionFromCookieHeader(headerStore.get('cookie') ?? '')

  if (!session) {
    redirect('/login')
  }

  const access = resolveIntelligenceDashboardAccess(session.role)

  return (
    <IntelligenceDashboardScaffold
      access={access}
      statusContent={<IntelligenceDashboardLiveStatus />}
    />
  )
}

