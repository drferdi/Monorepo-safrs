import type { RedisEnvironment } from '../_services/upstashRedis.js'

type HeaderValue = string | string[] | undefined
type RequestHeaders = Readonly<Record<string, HeaderValue>>

export type OriginPolicyResult =
  | { allowed: true }
  | { allowed: false; reason: 'forbidden' | 'not_configured' }

function firstHeader(value: HeaderValue): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

function canonicalAppUrl(env: RedisEnvironment): URL | null {
  const configured = env.APP_URL?.trim()
  if (!configured) return null

  try {
    const url = new URL(configured)
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    if ((url.protocol !== 'https:' && !(isLocal && url.protocol === 'http:')) || url.username) {
      return null
    }
    if (url.password || url.search || url.hash) return null
    return url
  } catch {
    return null
  }
}

export function evaluateOriginPolicy(
  headers: RequestHeaders,
  env: RedisEnvironment = process.env
): OriginPolicyResult {
  const appUrl = canonicalAppUrl(env)
  if (!appUrl) return { allowed: false, reason: 'not_configured' }

  const origin = firstHeader(headers.origin)
  if (origin) {
    try {
      return new URL(origin).origin === appUrl.origin
        ? { allowed: true }
        : { allowed: false, reason: 'forbidden' }
    } catch {
      return { allowed: false, reason: 'forbidden' }
    }
  }

  const host = firstHeader(headers.host).toLowerCase()
  if (!host || host !== appUrl.host.toLowerCase()) {
    return { allowed: false, reason: 'forbidden' }
  }

  const forwardedProto = firstHeader(headers['x-forwarded-proto']).toLowerCase()
  if (forwardedProto && `${forwardedProto}:` !== appUrl.protocol) {
    return { allowed: false, reason: 'forbidden' }
  }

  return { allowed: true }
}
