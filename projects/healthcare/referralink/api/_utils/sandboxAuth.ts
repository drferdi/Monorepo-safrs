import { createHmac, randomBytes as nodeRandomBytes } from 'node:crypto'

import type { RedisCommander, RedisEnvironment } from '../_services/upstashRedis.js'

const SANDBOX_CHALLENGE_TTL_SECONDS = 15 * 60
const SANDBOX_CODE_LENGTH = 6
const SANDBOX_CHALLENGE_ID_BYTES = 24
const SANDBOX_AUTH_MINIMUM_SECRET_LENGTH = 32

const CONSUME_CHALLENGE_SCRIPT = `
local actual = redis.call('GET', KEYS[1])
if not actual then return 0 end
redis.call('DEL', KEYS[1])
if actual == ARGV[1] then return 1 end
return -1
`.trim()

type RandomBytes = (size: number) => Buffer

export type SandboxAuthDependencies = {
  redis: RedisCommander
  env: RedisEnvironment
  now?: () => number
  randomBytes?: RandomBytes
}

export class SandboxAuthConfigurationError extends Error {
  constructor() {
    super('SANDBOX_AUTH_SECRET is not configured securely')
    this.name = 'SandboxAuthConfigurationError'
  }
}

export class SandboxAuthStoreError extends Error {
  constructor() {
    super('Sandbox auth store is unavailable')
    this.name = 'SandboxAuthStoreError'
  }
}

function getSandboxAuthSecret(env: RedisEnvironment): string {
  const secret = env.SANDBOX_AUTH_SECRET?.trim()
  if (!secret || secret.length < SANDBOX_AUTH_MINIMUM_SECRET_LENGTH) {
    throw new SandboxAuthConfigurationError()
  }
  return secret
}

function deriveKey(env: RedisEnvironment, purpose: 'challenge' | 'subject'): Buffer {
  return createHmac('sha256', getSandboxAuthSecret(env))
    .update(`medlink:sandbox-auth:${purpose}:v1`)
    .digest()
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function normalizeCode(code: string): string {
  return code.replace(/\D/g, '')
}

function challengeProof(email: string, code: string, env: RedisEnvironment): string {
  return createHmac('sha256', deriveKey(env, 'challenge'))
    .update(`${normalizeEmail(email)}\0${normalizeCode(code)}`)
    .digest('base64url')
}

function challengeKey(challengeToken: string): string {
  return `medlink:auth:challenge:${challengeToken}`
}

export function createSandboxSubjectHash(email: string, env: RedisEnvironment): string {
  return createHmac('sha256', deriveKey(env, 'subject'))
    .update(normalizeEmail(email))
    .digest('base64url')
}

export function createSandboxVerificationCode(randomBytes: RandomBytes = nodeRandomBytes): string {
  const digits = randomBytes(SANDBOX_CODE_LENGTH)
  return Array.from(digits, (value) => (value % 10).toString()).join('')
}

export async function createSandboxChallenge(
  input: { email: string; code: string },
  dependencies: SandboxAuthDependencies
): Promise<{ challengeToken: string; expiresAt: string }> {
  const code = normalizeCode(input.code)
  if (!normalizeEmail(input.email) || code.length !== SANDBOX_CODE_LENGTH) {
    throw new TypeError('Invalid sandbox challenge material')
  }

  const now = dependencies.now ?? Date.now
  const randomBytes = dependencies.randomBytes ?? nodeRandomBytes
  const challengeToken = randomBytes(SANDBOX_CHALLENGE_ID_BYTES).toString('base64url')
  const proof = challengeProof(input.email, code, dependencies.env)
  const stored = await dependencies.redis.command<unknown>([
    'SET',
    challengeKey(challengeToken),
    proof,
    'NX',
    'EX',
    SANDBOX_CHALLENGE_TTL_SECONDS,
  ])

  if (stored !== 'OK') throw new SandboxAuthStoreError()

  return {
    challengeToken,
    expiresAt: new Date(now() + SANDBOX_CHALLENGE_TTL_SECONDS * 1000).toISOString(),
  }
}

export async function consumeSandboxChallenge(
  input: { email: string; code: string; challengeToken: string },
  dependencies: SandboxAuthDependencies
): Promise<
  { valid: true; verifiedAt: string } | { valid: false; reason: 'expired' | 'mismatch' | 'invalid' }
> {
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(input.challengeToken)) {
    return { valid: false, reason: 'invalid' }
  }

  const code = normalizeCode(input.code)
  if (!normalizeEmail(input.email) || code.length !== SANDBOX_CODE_LENGTH) {
    return { valid: false, reason: 'invalid' }
  }

  const result = await dependencies.redis.command<unknown>([
    'EVAL',
    CONSUME_CHALLENGE_SCRIPT,
    1,
    challengeKey(input.challengeToken),
    challengeProof(input.email, code, dependencies.env),
  ])

  if (typeof result !== 'number' || !Number.isInteger(result) || ![-1, 0, 1].includes(result)) {
    throw new SandboxAuthStoreError()
  }

  if (result === 1) {
    return {
      valid: true,
      verifiedAt: new Date((dependencies.now ?? Date.now)()).toISOString(),
    }
  }
  if (result === -1) return { valid: false, reason: 'mismatch' }
  if (result === 0) return { valid: false, reason: 'expired' }
  throw new SandboxAuthStoreError()
}
