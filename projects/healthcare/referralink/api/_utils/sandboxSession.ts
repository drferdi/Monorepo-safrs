import { createHmac, randomBytes as nodeRandomBytes, timingSafeEqual } from 'node:crypto'

import type { RedisCommander, RedisEnvironment } from '../_services/upstashRedis.js'
import type { SandboxSessionClaims } from '../_types/sandbox-auth.js'

import { createSandboxSubjectHash, SandboxAuthConfigurationError } from './sandboxAuth.js'

export const SANDBOX_SESSION_TTL_SECONDS = 8 * 60 * 60
export const SANDBOX_SESSION_COOKIE_NAME = 'medlink_session'

const SESSION_ID_BYTES = 24
const SESSION_SIGNATURE_CONTEXT = 'medlink:sandbox-auth:session:v1'
const SESSION_COOKIE_ATTRIBUTES = 'Path=/api; HttpOnly; Secure; SameSite=Strict'

type SandboxSessionDependencies = {
  redis: RedisCommander
  env: RedisEnvironment
  now?: () => number
  randomBytes?: (size: number) => Buffer
}

export class SandboxSessionStoreError extends Error {
  constructor() {
    super('Sandbox session store is unavailable')
    this.name = 'SandboxSessionStoreError'
  }
}

function getSecret(env: RedisEnvironment): string {
  const secret = env.SANDBOX_AUTH_SECRET?.trim()
  if (!secret || secret.length < 32) throw new SandboxAuthConfigurationError()
  return secret
}

function signingKey(env: RedisEnvironment): Buffer {
  return createHmac('sha256', getSecret(env)).update(SESSION_SIGNATURE_CONTEXT).digest()
}

function sign(encodedClaims: string, env: RedisEnvironment): Buffer {
  return createHmac('sha256', signingKey(env)).update(encodedClaims).digest()
}

function sessionKey(jti: string): string {
  return `medlink:auth:session:${jti}`
}

type ParsedSessionClaims = Omit<SandboxSessionClaims, 'scope'> & { scope: string }

function isExactClaims(value: unknown): value is ParsedSessionClaims {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const claims = value as Record<string, unknown>
  const expectedKeys = ['aud', 'exp', 'iat', 'jti', 'scope', 'sub', 'version']
  if (Object.keys(claims).sort().join(',') !== expectedKeys.join(',')) return false

  return (
    claims.version === 'v1' &&
    claims.aud === 'medlink' &&
    typeof claims.scope === 'string' &&
    claims.scope.length > 0 &&
    typeof claims.sub === 'string' &&
    /^[A-Za-z0-9_-]{43}$/.test(claims.sub) &&
    typeof claims.jti === 'string' &&
    /^[A-Za-z0-9_-]{32,128}$/.test(claims.jti) &&
    typeof claims.iat === 'number' &&
    Number.isInteger(claims.iat) &&
    typeof claims.exp === 'number' &&
    Number.isInteger(claims.exp) &&
    claims.exp > claims.iat
  )
}

function createToken(claims: SandboxSessionClaims, env: RedisEnvironment): string {
  const encodedClaims = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${encodedClaims}.${sign(encodedClaims, env).toString('base64url')}`
}

function parseToken(
  token: string,
  env: RedisEnvironment,
  now: number
): { valid: true; claims: ParsedSessionClaims } | { valid: false; reason: 'invalid' | 'expired' } {
  const parts = token.split('.')
  if (parts.length !== 2) return { valid: false, reason: 'invalid' }
  const [encodedClaims, encodedSignature] = parts

  let providedSignature: Buffer
  try {
    providedSignature = Buffer.from(encodedSignature, 'base64url')
  } catch {
    return { valid: false, reason: 'invalid' }
  }
  const expectedSignature = sign(encodedClaims, env)
  if (
    providedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(providedSignature, expectedSignature)
  ) {
    return { valid: false, reason: 'invalid' }
  }

  let claims: unknown
  try {
    claims = JSON.parse(Buffer.from(encodedClaims, 'base64url').toString('utf8'))
  } catch {
    return { valid: false, reason: 'invalid' }
  }
  if (!isExactClaims(claims)) return { valid: false, reason: 'invalid' }

  const nowSeconds = Math.floor(now / 1000)
  if (claims.iat > nowSeconds || nowSeconds >= claims.exp) {
    return { valid: false, reason: claims.iat > nowSeconds ? 'invalid' : 'expired' }
  }
  return { valid: true, claims }
}

export async function createSandboxSession(
  input: { email: string },
  dependencies: SandboxSessionDependencies
): Promise<{
  token: string
  cookie: string
  expiresAt: string
  claims: SandboxSessionClaims
}> {
  const now = dependencies.now ?? Date.now
  const nowSeconds = Math.floor(now() / 1000)
  const randomBytes = dependencies.randomBytes ?? nodeRandomBytes
  const claims: SandboxSessionClaims = {
    version: 'v1',
    sub: createSandboxSubjectHash(input.email, dependencies.env),
    scope: 'sandbox',
    iat: nowSeconds,
    exp: nowSeconds + SANDBOX_SESSION_TTL_SECONDS,
    aud: 'medlink',
    jti: randomBytes(SESSION_ID_BYTES).toString('base64url'),
  }
  const token = createToken(claims, dependencies.env)
  const stored = await dependencies.redis.command<unknown>([
    'SET',
    sessionKey(claims.jti),
    claims.sub,
    'NX',
    'EX',
    SANDBOX_SESSION_TTL_SECONDS,
  ])
  if (stored !== 'OK') throw new SandboxSessionStoreError()

  return {
    token,
    claims,
    expiresAt: new Date(claims.exp * 1000).toISOString(),
    cookie: `${SANDBOX_SESSION_COOKIE_NAME}=${token}; Max-Age=${SANDBOX_SESSION_TTL_SECONDS}; ${SESSION_COOKIE_ATTRIBUTES}`,
  }
}

export function parseSandboxSessionCookie(cookieHeaderOrToken: string | undefined): string | null {
  if (!cookieHeaderOrToken) return null
  if (!cookieHeaderOrToken.includes('=')) return cookieHeaderOrToken.trim() || null

  for (const part of cookieHeaderOrToken.split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) continue
    const name = part.slice(0, separator).trim()
    if (name === SANDBOX_SESSION_COOKIE_NAME) {
      return part.slice(separator + 1).trim() || null
    }
  }
  return null
}

export async function verifySandboxSession(
  cookieHeaderOrToken: string | undefined,
  dependencies: SandboxSessionDependencies
): Promise<
  | { valid: true; claims: SandboxSessionClaims }
  | {
      valid: false
      reason: 'invalid' | 'expired' | 'inactive' | 'store_unavailable' | 'wrong_scope'
    }
> {
  const token = parseSandboxSessionCookie(cookieHeaderOrToken)
  if (!token) return { valid: false, reason: 'invalid' }

  let parsed: ReturnType<typeof parseToken>
  try {
    parsed = parseToken(token, dependencies.env, (dependencies.now ?? Date.now)())
  } catch {
    return { valid: false, reason: 'invalid' }
  }
  if (!parsed.valid) return parsed
  if (parsed.claims.scope !== 'sandbox') return { valid: false, reason: 'wrong_scope' }

  try {
    const activeSubject = await dependencies.redis.command<unknown>([
      'GET',
      sessionKey(parsed.claims.jti),
    ])
    if (activeSubject !== parsed.claims.sub) return { valid: false, reason: 'inactive' }
    return { valid: true, claims: { ...parsed.claims, scope: 'sandbox' } }
  } catch {
    return { valid: false, reason: 'store_unavailable' }
  }
}

export function clearSandboxSessionCookie(): string {
  return `${SANDBOX_SESSION_COOKIE_NAME}=; Max-Age=0; ${SESSION_COOKIE_ATTRIBUTES}`
}
