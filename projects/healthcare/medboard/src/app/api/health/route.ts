import { getCrewAccessConfigStatus } from '@/lib/server/crew-access-auth'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function hasNonEmptyEnv(name: string): boolean {
  return Boolean(process.env[name]?.trim())
}

function hasTrustedProxyHeaders(): boolean {
  const explicit = process.env.TRUST_PROXY_HEADERS?.trim().toLowerCase()
  if (explicit === 'true') return true
  if (explicit === 'false') return false
  return hasNonEmptyEnv('RAILWAY_ENVIRONMENT_ID')
}

async function buildChecks() {
  const crewAccess = await getCrewAccessConfigStatus()
  const hasDatabase = hasNonEmptyEnv('DATABASE_URL')
  const hasAutomationToken = hasNonEmptyEnv('CREW_ACCESS_AUTOMATION_TOKEN')
  const hasServerActionsKey = hasNonEmptyEnv('NEXT_SERVER_ACTIONS_ENCRYPTION_KEY')
  const hasDeepSeek = hasNonEmptyEnv('DEEPSEEK_API_KEY')
  const hasLiveKit =
    hasNonEmptyEnv('LIVEKIT_URL') &&
    hasNonEmptyEnv('LIVEKIT_API_KEY') &&
    hasNonEmptyEnv('LIVEKIT_API_SECRET')

  return {
    database: {
      ok: hasDatabase,
      required: true,
      message: hasDatabase ? 'DATABASE_URL tersedia.' : 'DATABASE_URL belum diatur.',
    },
    crew_access: {
      ok: crewAccess.ok,
      required: true,
      message: crewAccess.ok ? 'Crew access siap.' : crewAccess.message,
    },
    bridge_automation: {
      ok: hasAutomationToken,
      required: true,
      message: hasAutomationToken
        ? 'CREW_ACCESS_AUTOMATION_TOKEN tersedia.'
        : 'CREW_ACCESS_AUTOMATION_TOKEN belum diatur.',
    },
    server_actions_key: {
      ok: hasServerActionsKey,
      required: false,
      message: hasServerActionsKey
        ? 'NEXT_SERVER_ACTIONS_ENCRYPTION_KEY tersedia.'
        : 'NEXT_SERVER_ACTIONS_ENCRYPTION_KEY belum diatur.',
    },
    trusted_proxy_headers: {
      ok: hasTrustedProxyHeaders(),
      required: false,
      message: hasTrustedProxyHeaders()
        ? 'Proxy headers dipercaya.'
        : 'TRUST_PROXY_HEADERS belum aktif.',
    },
    cdss_ai: {
      ok: hasDeepSeek,
      required: false,
      message:
        hasDeepSeek ? 'Provider AI CDSS tersedia.' : 'DEEPSEEK_API_KEY belum diatur.',
    },
    livekit: {
      ok: hasLiveKit,
      required: false,
      message: hasLiveKit
        ? 'LiveKit tersedia.'
        : 'LIVEKIT_URL/LIVEKIT_API_KEY/LIVEKIT_API_SECRET belum lengkap.',
    },
    sentry: {
      ok: hasNonEmptyEnv('SENTRY_DSN'),
      required: false,
      message: hasNonEmptyEnv('SENTRY_DSN') ? 'Sentry tersedia.' : 'SENTRY_DSN belum diatur.',
    },
    public_base_url: {
      ok: hasNonEmptyEnv('NEXT_PUBLIC_BASE_URL'),
      required: false,
      message: hasNonEmptyEnv('NEXT_PUBLIC_BASE_URL')
        ? 'NEXT_PUBLIC_BASE_URL tersedia.'
        : 'NEXT_PUBLIC_BASE_URL belum diatur.',
    },
  }
}

export async function GET() {
  const checks = await buildChecks()
  const criticalFailures = Object.values(checks).filter((check) => check.required && !check.ok)
  const warnings = Object.values(checks).filter((check) => !check.required && !check.ok)

  const status = criticalFailures.length > 0 ? 'error' : warnings.length > 0 ? 'degraded' : 'ok'

  return NextResponse.json(
    {
      status,
      service: 'intelligenceboard',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'development',
      release:
        process.env.RAILWAY_GIT_COMMIT_SHA ??
        process.env.VERCEL_GIT_COMMIT_SHA ??
        process.env.RAILWAY_DEPLOYMENT_ID ??
        null,
      checks,
    },
    { status: criticalFailures.length > 0 ? 503 : 200 }
  )
}
