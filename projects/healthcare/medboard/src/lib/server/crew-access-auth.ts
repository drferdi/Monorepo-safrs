import 'server-only'

import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'

import {
  CREW_ACCESS_COOKIE_NAME,
  CREW_ACCESS_INSTITUTIONS,
  CREW_ACCESS_PROFESSIONS,
  CREW_ACCESS_SESSION_TTL_SECONDS,
  type CrewAccessInstitution,
  type CrewAccessProfession,
  type CrewAccessSession,
  type CrewAccessUser,
  isCrewAccessInstitution,
  isCrewAccessProfession,
} from '@/lib/crew-access'
import { prisma } from '@/lib/prisma'

interface SessionPayloadV1 {
  v: 1
  username: string
  displayName: string
  email: string
  institution: CrewAccessInstitution
  profession: CrewAccessProfession
  role: string
  issuedAt: number
  expiresAt: number
}

const DEFAULT_INSTITUTION = CREW_ACCESS_INSTITUTIONS[0]
const DEFAULT_PROFESSION = CREW_ACCESS_PROFESSIONS[3]
const CLINICAL_CREW_ROLES = new Set([
  'DOKTER',
  'DOKTER_GIGI',
  'PERAWAT',
  'BIDAN',
  'APOTEKER',
  'TRIAGE_OFFICER',
])
const PASSWORD_HASH_VERSION = 'scrypt'
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEYLEN = 64

let cachedSecret: string | null = null

function normalizeUsername(input: string): string {
  return input.trim().toLowerCase()
}

function normalizeEmail(input: string): string {
  return input.trim().toLowerCase()
}

function normalizeRole(input: string | null | undefined): string {
  return String(input ?? '')
    .trim()
    .toUpperCase()
}

function normalizeInstitution(value: unknown): CrewAccessInstitution {
  const institution = String(value ?? '').trim()
  return isCrewAccessInstitution(institution) ? institution : DEFAULT_INSTITUTION
}

function normalizeProfession(value: unknown, roleValue: unknown): CrewAccessProfession {
  const profession = String(value ?? '').trim()
  if (isCrewAccessProfession(profession)) return profession

  const normalizedRole = String(roleValue ?? '')
    .trim()
    .toUpperCase()
  switch (normalizedRole) {
    case 'DOKTER':
    case 'DOCTOR':
      return 'Dokter'
    case 'DOKTER_GIGI':
      return 'Dokter Gigi'
    case 'PERAWAT':
      return 'Perawat'
    case 'BIDAN':
      return 'Bidan'
    case 'APOTEKER':
      return 'Apoteker'
    default:
      return DEFAULT_PROFESSION
  }
}

async function deriveScryptKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  params: { N: number; r: number; p: number }
): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, params, (error, derivedKey) => {
      if (error) {
        reject(error)
        return
      }
      resolve(derivedKey as Buffer)
    })
  })
}

function parsePasswordHash(storedHash: string): {
  salt: Buffer
  derivedKey: Buffer
  N: number
  r: number
  p: number
} | null {
  const parts = storedHash.split('$')
  if (parts.length !== 6 || parts[0] !== PASSWORD_HASH_VERSION) return null

  const [, n, r, p, salt, derived] = parts
  const parsedN = Number(n)
  const parsedR = Number(r)
  const parsedP = Number(p)
  if (!Number.isFinite(parsedN) || !Number.isFinite(parsedR) || !Number.isFinite(parsedP))
    return null

  try {
    return {
      salt: Buffer.from(salt, 'base64url'),
      derivedKey: Buffer.from(derived, 'base64url'),
      N: parsedN,
      r: parsedR,
      p: parsedP,
    }
  } catch {
    return null
  }
}

export async function hashCrewAccessPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derivedKey = await deriveScryptKey(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })

  return [
    PASSWORD_HASH_VERSION,
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt.toString('base64url'),
    Buffer.from(derivedKey).toString('base64url'),
  ].join('$')
}

async function verifyPasswordHash(password: string, passwordHash: string): Promise<boolean> {
  const parsed = parsePasswordHash(passwordHash)
  if (!parsed) return false

  const derivedKey = await deriveScryptKey(password, parsed.salt, parsed.derivedKey.length, {
    N: parsed.N,
    r: parsed.r,
    p: parsed.p,
  })

  if (derivedKey.length !== parsed.derivedKey.length) return false
  return timingSafeEqual(derivedKey, parsed.derivedKey)
}

function getSecret(): string {
  if (cachedSecret) return cachedSecret

  const envSecret = process.env.CREW_ACCESS_SECRET?.trim()
  if (envSecret) {
    cachedSecret = envSecret
    return envSecret
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('CREW_ACCESS_SECRET belum diatur untuk production.')
  }

  cachedSecret = randomBytes(48).toString('hex')
  return cachedSecret
}

function createSignature(payloadBase64: string): string {
  return createHmac('sha256', getSecret()).update(payloadBase64).digest('base64url')
}

function parseCookie(cookieHeader: string, cookieName: string): string | null {
  const pairs = cookieHeader.split(';').map((p) => p.trim())
  for (const pair of pairs) {
    if (!pair) continue
    const eqIdx = pair.indexOf('=')
    if (eqIdx <= 0) continue
    const key = pair.slice(0, eqIdx).trim()
    const value = pair.slice(eqIdx + 1).trim()
    if (key === cookieName) return value
  }
  return null
}

function toSession(payload: SessionPayloadV1): CrewAccessSession {
  return {
    username: payload.username,
    displayName: payload.displayName,
    email: payload.email,
    institution: payload.institution,
    profession: payload.profession,
    role: payload.role ?? 'PERAWAT',
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
  }
}

function dbUserToCrewAccessUser(user: {
  username: string
  displayName: string
  email: string | null
  institution: string
  profession: string
  role: string
}): CrewAccessUser {
  return {
    username: user.username,
    displayName: user.displayName,
    email: user.email ?? `${user.username}@local.invalid`,
    institution: normalizeInstitution(user.institution),
    profession: normalizeProfession(user.profession, user.role),
    role: user.role,
  }
}

export async function listCrewAccessUsers(): Promise<CrewAccessUser[]> {
  const users = await prisma.user.findMany({
    where: { status: { not: 'DELETED' } },
    orderBy: { createdAt: 'asc' },
  })
  return users.map(dbUserToCrewAccessUser)
}

export async function validateCrewAccess(
  username: string,
  password: string
): Promise<CrewAccessUser | null> {
  const normalizedUsername = normalizeUsername(username)
  const normalizedEmail = normalizeEmail(username)

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: normalizedUsername }, { email: normalizedEmail }],
      NOT: { status: 'DELETED' },
    },
  })

  if (!user) return null
  if (user.status === 'INACTIVE') return null
  if (!(await verifyPasswordHash(password, user.passwordHash))) return null

  return dbUserToCrewAccessUser(user)
}

export function createCrewSession(user: CrewAccessUser): {
  token: string
  session: CrewAccessSession
} {
  const nowSeconds = Math.floor(Date.now() / 1000)
  const payload: SessionPayloadV1 = {
    v: 1,
    username: normalizeUsername(user.username),
    displayName: user.displayName,
    email: normalizeEmail(user.email ?? `${user.username}@local.invalid`),
    institution: normalizeInstitution(user.institution),
    profession: isCrewAccessProfession(user.profession ?? '')
      ? (user.profession ?? DEFAULT_PROFESSION)
      : DEFAULT_PROFESSION,
    role: user.role ?? 'PERAWAT',
    issuedAt: nowSeconds,
    expiresAt: nowSeconds + CREW_ACCESS_SESSION_TTL_SECONDS,
  }

  const payloadBase64 = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url')
  const signature = createSignature(payloadBase64)
  return {
    token: `${payloadBase64}.${signature}`,
    session: toSession(payload),
  }
}

/**
 * Verify crew session from raw cookie header string.
 * Stateless: trusts the HMAC-signed token without a DB round-trip.
 * Deactivated users retain their session until it expires naturally.
 */
export function getCrewSessionFromCookieHeader(cookieHeader: string): CrewAccessSession | null {
  try {
    const token = parseCookie(cookieHeader, CREW_ACCESS_COOKIE_NAME)
    if (!token) return null

    const parts = token.split('.')
    if (parts.length !== 2) return null

    const [payloadBase64, signature] = parts
    const expectedSignature = createSignature(payloadBase64)
    const actualSigBuffer = Buffer.from(signature, 'utf-8')
    const expectedSigBuffer = Buffer.from(expectedSignature, 'utf-8')

    if (actualSigBuffer.length !== expectedSigBuffer.length) return null
    if (!timingSafeEqual(actualSigBuffer, expectedSigBuffer)) return null

    const payload = JSON.parse(
      Buffer.from(payloadBase64, 'base64url').toString('utf-8')
    ) as SessionPayloadV1

    if (payload.v !== 1) return null
    if (!payload.username || !payload.displayName) return null
    if (!Number.isInteger(payload.issuedAt) || !Number.isInteger(payload.expiresAt)) return null
    if (payload.expiresAt <= Math.floor(Date.now() / 1000)) return null

    return toSession(payload)
  } catch {
    return null
  }
}

export function getCrewSessionFromRequest(request: Request): CrewAccessSession | null {
  return getCrewSessionFromCookieHeader(request.headers.get('cookie') ?? '')
}

function safeTokenEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf-8')
  const rightBuffer = Buffer.from(right, 'utf-8')
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

function getAutomationTokenFromRequest(request: Request): string {
  const tokenFromHeader = request.headers.get('x-crew-access-token')?.trim() ?? ''
  if (tokenFromHeader) return tokenFromHeader

  const authorization = request.headers.get('authorization')?.trim() ?? ''
  if (/^bearer\s+/i.test(authorization)) {
    return authorization.replace(/^bearer\s+/i, '').trim()
  }
  return ''
}

export function getCrewAuthorizationMode(
  request: Request
): 'session' | 'automation-token' | 'none' {
  if (getCrewSessionFromRequest(request)) return 'session'

  const automationToken = getAutomationTokenFromRequest(request)
  const expectedAutomationToken = process.env.CREW_ACCESS_AUTOMATION_TOKEN?.trim() ?? ''
  if (!automationToken || !expectedAutomationToken) return 'none'

  return safeTokenEqual(automationToken, expectedAutomationToken) ? 'automation-token' : 'none'
}

export function isCrewAuthorizedRequest(request: Request): boolean {
  return getCrewAuthorizationMode(request) !== 'none'
}

export function hasAnyCrewRole(
  role: string | null | undefined,
  allowedRoles: readonly string[]
): boolean {
  const normalizedRole = normalizeRole(role)
  return allowedRoles.some((candidate) => normalizeRole(candidate) === normalizedRole)
}

export function isClinicalCrewRole(role: string | null | undefined): boolean {
  return CLINICAL_CREW_ROLES.has(normalizeRole(role))
}

export function getSessionCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production'
  const sameSite: 'none' | 'lax' = isProduction ? 'none' : 'lax'
  return {
    name: CREW_ACCESS_COOKIE_NAME,
    httpOnly: true,
    sameSite,
    secure: isProduction,
    path: '/',
    maxAge: CREW_ACCESS_SESSION_TTL_SECONDS,
  }
}

/** No-op: retained for API compatibility. User data is in the database. */
export function invalidateCrewAccessUserCache(): void {
  // no-op
}

export async function appendCrewAccessUserToFile(user: {
  username: string
  displayName: string
  email: string
  institution: string
  profession: string
  role: string
  passwordHash: string
}): Promise<void> {
  await prisma.user.create({
    data: {
      username: normalizeUsername(user.username),
      passwordHash: user.passwordHash,
      displayName: user.displayName,
      email: normalizeEmail(user.email),
      institution: user.institution,
      profession: user.profession,
      role: user.role,
      status: 'ACTIVE',
    },
  })
}

export async function listCrewAccessUsersAll(): Promise<(CrewAccessUser & { status?: string })[]> {
  const users = await prisma.user.findMany({
    where: { status: { not: 'DELETED' } },
    orderBy: { createdAt: 'asc' },
  })
  return users.map((u) => ({
    ...dbUserToCrewAccessUser(u),
    status: u.status,
  }))
}

export async function updateCrewAccessUser(
  username: string,
  updates: {
    displayName?: string
    email?: string
    institution?: string
    profession?: string
    role?: string
  }
): Promise<void> {
  const key = username.toLowerCase()
  const user = await prisma.user.findUnique({ where: { username: key } })
  if (!user) throw new Error('User tidak ditemukan.')

  await prisma.user.update({
    where: { username: key },
    data: {
      ...(updates.displayName !== undefined && { displayName: updates.displayName.trim() }),
      ...(updates.email !== undefined && { email: updates.email.trim().toLowerCase() }),
      ...(updates.institution !== undefined && { institution: updates.institution.trim() }),
      ...(updates.profession !== undefined && { profession: updates.profession.trim() }),
      ...(updates.role !== undefined && { role: updates.role.trim() }),
    },
  })
}

export async function deactivateCrewAccessUser(username: string, by: string): Promise<void> {
  const key = username.toLowerCase()
  const user = await prisma.user.findUnique({ where: { username: key } })
  if (!user) throw new Error('User tidak ditemukan.')

  await prisma.user.update({
    where: { username: key },
    data: {
      status: 'INACTIVE',
      deactivatedAt: new Date(),
      deactivatedBy: by,
    },
  })
}

export async function reactivateCrewAccessUser(username: string): Promise<void> {
  const key = username.toLowerCase()
  const user = await prisma.user.findUnique({ where: { username: key } })
  if (!user) throw new Error('User tidak ditemukan.')

  await prisma.user.update({
    where: { username: key },
    data: {
      status: 'ACTIVE',
      deactivatedAt: null,
      deactivatedBy: null,
    },
  })
}

export async function deleteCrewAccessUser(username: string): Promise<void> {
  const key = username.toLowerCase()
  const user = await prisma.user.findUnique({ where: { username: key } })
  if (!user) throw new Error('User tidak ditemukan.')

  await prisma.user.update({
    where: { username: key },
    data: {
      status: 'DELETED',
      deletedAt: new Date(),
      deletedBy: key,
      displayName: '[Deleted User]',
      email: `deleted-${key}@deleted.invalid`,
      passwordHash: 'DELETED',
    },
  })
}

export async function adminResetPassword(username: string, newPassword: string): Promise<void> {
  if (newPassword.length < 8) throw new Error('Password minimal 8 karakter.')

  const newHash = await hashCrewAccessPassword(newPassword)
  const key = username.toLowerCase()
  const user = await prisma.user.findUnique({ where: { username: key } })
  if (!user) throw new Error('User tidak ditemukan.')

  await prisma.user.update({
    where: { username: key },
    data: { passwordHash: newHash },
  })
}

export async function getCrewAccessConfigStatus(): Promise<{ ok: boolean; message: string }> {
  try {
    const count = await prisma.user.count({ where: { status: 'ACTIVE' } })
    if (count === 0) {
      return {
        ok: false,
        message: 'Tidak ada user aktif di database. Jalankan: SEED_ADMIN_PASSWORD=xxx pnpm seed',
      }
    }
    getSecret()
    return { ok: true, message: '' }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Konfigurasi auth tidak valid.',
    }
  }
}

let _configChecked = false

/** Call once at app startup to validate config and warn about insecure defaults. */
export function assertCrewAccessConfigOnStartup(): void {
  if (_configChecked) return
  _configChecked = true

  if (!process.env.CREW_ACCESS_SECRET?.trim()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[crew-access] CREW_ACCESS_SECRET belum diatur. Produksi tidak dapat berjalan tanpa secret.'
      )
    }
    process.stderr.write(
      '[crew-access] WARNING: CREW_ACCESS_SECRET tidak diset. Menggunakan ephemeral secret — semua session akan invalid setelah restart.\n'
    )
  }
}

// ============================================================================
// PASSKEY (WebAuthn) — additive login mechanism alongside username/password.
// ============================================================================

const PASSKEY_CHALLENGE_TTL_MS = 5 * 60 * 1000

interface PendingChallenge {
  challenge: string
  expiresAt: number
}

/** Registration ceremonies are session-authenticated, so keyed by username. */
const pendingRegistrationChallenges = new Map<string, PendingChallenge>()

/**
 * Authentication (login) ceremonies happen before any session exists, so the
 * challenge itself is the lookup key — a single-use, time-boxed anti-replay
 * nonce. Knowing a valid challenge value does not help an attacker forge a
 * signed assertion; that still requires the authenticator's private key.
 */
const pendingAuthenticationChallenges = new Map<string, PendingChallenge>()

function pruneExpiredChallenges(store: Map<string, PendingChallenge>): void {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key)
  }
}

export function getWebAuthnRpID(): string {
  const override = process.env.CREW_ACCESS_WEBAUTHN_RP_ID?.trim()
  if (override) return override

  try {
    return new URL(process.env.NEXT_PUBLIC_BASE_URL ?? DEFAULT_APP_BASE_URL).hostname
  } catch {
    return 'localhost'
  }
}

const DEFAULT_APP_BASE_URL = 'https://medboard.sentrahai.com'

/**
 * Origins allowed to complete a WebAuthn ceremony against this RP. Must
 * include the extension's `chrome-extension://<id>` origin once the
 * extension has a stable ID (pinned manifest key or published listing) —
 * set via CREW_ACCESS_WEBAUTHN_ORIGINS (comma-separated). Defaults to the
 * primary web origin only.
 */
export function getWebAuthnAllowedOrigins(): string[] {
  const configured = process.env.CREW_ACCESS_WEBAUTHN_ORIGINS?.trim()
  if (configured) {
    return configured
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  }
  return [process.env.NEXT_PUBLIC_BASE_URL ?? DEFAULT_APP_BASE_URL]
}

export function startPasskeyRegistrationChallenge(username: string, challenge: string): void {
  pruneExpiredChallenges(pendingRegistrationChallenges)
  pendingRegistrationChallenges.set(normalizeUsername(username), {
    challenge,
    expiresAt: Date.now() + PASSKEY_CHALLENGE_TTL_MS,
  })
}

export function consumePasskeyRegistrationChallenge(username: string): string | null {
  pruneExpiredChallenges(pendingRegistrationChallenges)
  const key = normalizeUsername(username)
  const entry = pendingRegistrationChallenges.get(key)
  if (!entry) return null
  pendingRegistrationChallenges.delete(key)
  return entry.challenge
}

export function startPasskeyAuthenticationChallenge(challenge: string): void {
  pruneExpiredChallenges(pendingAuthenticationChallenges)
  pendingAuthenticationChallenges.set(challenge, {
    challenge,
    expiresAt: Date.now() + PASSKEY_CHALLENGE_TTL_MS,
  })
}

/** Single-use: returns true and consumes the challenge iff it is currently pending. */
export function consumePasskeyAuthenticationChallenge(challenge: string): boolean {
  pruneExpiredChallenges(pendingAuthenticationChallenges)
  if (!pendingAuthenticationChallenges.has(challenge)) return false
  pendingAuthenticationChallenges.delete(challenge)
  return true
}

export async function getCrewUserIdByUsername(username: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { username: normalizeUsername(username), NOT: { status: 'DELETED' } },
    select: { id: true },
  })
  return user?.id ?? null
}

export async function listPasskeyCredentialsForUser(userId: string): Promise<
  {
    credentialId: string
    transports: string | null
  }[]
> {
  return prisma.passkey.findMany({
    where: { userId },
    select: { credentialId: true, transports: true },
  })
}

export async function findPasskeyCredentialById(credentialId: string): Promise<{
  id: string
  userId: string
  credentialId: string
  publicKey: Uint8Array
  counter: number
  transports: string | null
} | null> {
  return prisma.passkey.findUnique({ where: { credentialId } })
}

export async function savePasskeyCredential(input: {
  userId: string
  credentialId: string
  publicKey: Uint8Array
  counter: number
  transports?: string
  deviceType: string
  backedUp: boolean
  name?: string
}): Promise<void> {
  await prisma.passkey.create({
    data: {
      userId: input.userId,
      credentialId: input.credentialId,
      publicKey: Buffer.from(input.publicKey),
      counter: input.counter,
      transports: input.transports,
      deviceType: input.deviceType,
      backedUp: input.backedUp,
      name: input.name,
    },
  })
}

export async function updatePasskeyCounter(credentialId: string, counter: number): Promise<void> {
  await prisma.passkey.update({
    where: { credentialId },
    data: { counter, lastUsedAt: new Date() },
  })
}

export async function getCrewUserById(userId: string): Promise<CrewAccessUser | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, NOT: { status: 'DELETED' } },
  })
  if (!user) return null
  return dbUserToCrewAccessUser(user)
}
