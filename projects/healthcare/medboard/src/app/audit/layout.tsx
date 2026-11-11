import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { ADMIN_CONSOLE_ROLES } from '@/lib/server/admin-console-roles'
import { CREW_ACCESS_COOKIE_NAME } from '@/lib/crew-access'

// Read the role directly from the signed cookie payload (base64 part before the dot).
// HMAC verification is intentionally skipped here — this is a UI-level redirect gate only.
// All data endpoints in /api/v1/logs/** still do full session + HMAC verification.
function getRoleFromCookie(token: string): string | null {
  try {
    const [payloadB64] = token.split('.')
    if (!payloadB64) return null
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as {
      role?: string
      expiresAt?: number
    }
    if (payload.expiresAt && payload.expiresAt <= Math.floor(Date.now() / 1000)) return null
    return payload.role ?? null
  } catch {
    return null
  }
}

export default async function AuditLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get(CREW_ACCESS_COOKIE_NAME)?.value ?? ''
  const role = getRoleFromCookie(token)

  if (!role || !ADMIN_CONSOLE_ROLES.has(role)) {
    redirect('/')
  }

  return <>{children}</>
}
