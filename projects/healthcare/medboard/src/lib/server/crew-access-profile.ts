// Drferdi — vision, brought to life.
import 'server-only'

import fs from 'node:fs'
import path from 'node:path'

import {
  type CrewAccessProfession,
  type CrewAccessServiceArea,
  type CrewAccessSession,
  isCrewAccessGender,
  isCrewAccessServiceArea,
} from '@/lib/crew-access'
import {
  CREW_PROFILE_MAX_DEGREES,
  CREW_PROFILE_MAX_POSITIONS,
  type CrewProfileData,
  type CrewProfileDegree,
  type CrewProfilePosition,
  createEmptyCrewProfile,
  isCrewProfileBloodType,
  normalizeCrewProfileDegree,
  normalizeCrewProfilePosition,
  resolveCrewProfileAvatarUrl,
} from '@/lib/crew-profile'
import { resolveRuntimeDataFile } from '@/lib/server/runtime-data-path'
// listCrewAccessUsers removed — crew-access-profile uses sync file storage only

interface CrewProfileStoreRecord extends CrewProfileData {
  username: string
  updatedAt: string
}

class CrewProfileValidationError extends Error {}
class CrewProfileConflictError extends Error {}
class CrewProfileStorageError extends Error {}

function getProfileFilePath(): string {
  return (
    process.env.CREW_ACCESS_PROFILE_FILE?.trim() ||
    resolveRuntimeDataFile('crew-access-user-profiles.json')
  )
}

function getProfileLockFilePath(): string {
  return `${getProfileFilePath()}.lock`
}

function ensureRuntimeDirectory(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeUrl(value: unknown): string {
  const normalized = normalizeText(value)
  if (!normalized) return ''
  if (/^https?:\/\//i.test(normalized)) return normalized
  return `https://${normalized}`
}

function isExactIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [yearText, monthText, dayText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const parsed = new Date(`${value}T00:00:00.000Z`)

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  )
}

let _profileCache: { mtimeMs: number; data: CrewProfileStoreRecord[] } | null = null

function readProfileStore(): CrewProfileStoreRecord[] {
  const filePath = getProfileFilePath()

  let stat: fs.Stats
  try {
    stat = fs.statSync(filePath)
  } catch {
    return []
  }

  if (_profileCache && _profileCache.mtimeMs === stat.mtimeMs) {
    return _profileCache.data
  }

  const raw = fs.readFileSync(filePath, 'utf-8').trim()
  if (!raw) {
    _profileCache = { mtimeMs: stat.mtimeMs, data: [] }
    return []
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    const data = Array.isArray(parsed) ? (parsed as CrewProfileStoreRecord[]) : []
    _profileCache = { mtimeMs: stat.mtimeMs, data }
    return data
  } catch {
    throw new CrewProfileStorageError(
      'File profil user rusak dan perlu diperbaiki sebelum profil dapat diubah.'
    )
  }
}

function writeProfileStore(records: CrewProfileStoreRecord[]): void {
  const filePath = getProfileFilePath()
  ensureRuntimeDirectory(filePath)
  const tempPath = `${filePath}.tmp`
  fs.writeFileSync(tempPath, JSON.stringify(records, null, 2), 'utf-8')
  fs.renameSync(tempPath, filePath)
}

async function withProfileLock<T>(task: () => Promise<T>): Promise<T> {
  const lockPath = getProfileLockFilePath()
  ensureRuntimeDirectory(lockPath)
  const startedAt = Date.now()
  const staleThresholdMs = 30_000

  while (true) {
    try {
      const handle = fs.openSync(lockPath, 'wx')
      try {
        return await task()
      } finally {
        fs.closeSync(handle)
        fs.rmSync(lockPath, { force: true })
      }
    } catch (error) {
      const isLockBusy =
        error instanceof Error &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code === 'EEXIST'
      if (!isLockBusy) throw error
      try {
        const stat = fs.statSync(lockPath)
        if (Date.now() - stat.mtimeMs > staleThresholdMs) {
          fs.rmSync(lockPath, { force: true })
          continue
        }
      } catch {
        continue
      }
      if (Date.now() - startedAt > 2000) {
        throw new CrewProfileConflictError(
          'Profil sedang diperbarui. Silakan coba lagi beberapa saat.'
        )
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }
}

function normalizeServiceAreas(raw: unknown): CrewAccessServiceArea[] {
  const values = Array.isArray(raw) ? raw : []
  return Array.from(
    new Set(
      values
        .map((value) => normalizeText(value))
        .filter((value): value is CrewAccessServiceArea => isCrewAccessServiceArea(value))
    )
  )
}

function normalizeJobTitles(raw: unknown): CrewProfilePosition[] {
  const values = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : []

  return Array.from(
    new Set(
      values
        .map((value) => normalizeCrewProfilePosition(normalizeText(value)))
        .filter((value): value is CrewProfilePosition => Boolean(value))
    )
  )
}

function normalizeDegrees(raw: unknown): CrewProfileDegree[] {
  const values = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : []

  return Array.from(
    new Set(
      values
        .map((value) => normalizeCrewProfileDegree(normalizeText(value)))
        .filter((value): value is CrewProfileDegree => Boolean(value))
    )
  )
}

function sanitizeStoredProfile(raw: unknown): CrewProfileData {
  if (!raw || typeof raw !== 'object') return createEmptyCrewProfile()
  const body = raw as Record<string, unknown>
  const gender = normalizeText(body.gender)
  const bloodType = normalizeText(body.bloodType)

  return {
    fullName: normalizeText(body.fullName).slice(0, 120),
    birthPlace: normalizeText(body.birthPlace).slice(0, 80),
    birthDate: isExactIsoDate(normalizeText(body.birthDate)) ? normalizeText(body.birthDate) : '',
    gender: isCrewAccessGender(gender) ? gender : '',
    domicile: normalizeText(body.domicile).slice(0, 120),
    bloodType: isCrewProfileBloodType(bloodType) ? bloodType : '',
    degrees: normalizeDegrees(body.degrees ?? body.degree).slice(0, CREW_PROFILE_MAX_DEGREES),
    jobTitles: normalizeJobTitles(body.jobTitles ?? body.jobTitle).slice(
      0,
      CREW_PROFILE_MAX_POSITIONS
    ),
    employeeId: normalizeText(body.employeeId).slice(0, 64),
    strNumber: normalizeText(body.strNumber).slice(0, 64),
    sipNumber: normalizeText(body.sipNumber).slice(0, 64),
    serviceAreas: normalizeServiceAreas(body.serviceAreas),
    serviceAreaOther: normalizeText(body.serviceAreaOther).slice(0, 120),
    institutionAdditional: normalizeText(body.institutionAdditional).slice(0, 120),
    avatarUrl: normalizeText(body.avatarUrl).slice(0, 260),
    whatsappNumber: normalizeText(body.whatsappNumber).slice(0, 24),
    githubUrl: normalizeUrl(body.githubUrl).slice(0, 260),
    linkedinUrl: normalizeUrl(body.linkedinUrl).slice(0, 260),
    gravatarUrl: normalizeUrl(body.gravatarUrl).slice(0, 260),
    blogUrl: normalizeUrl(body.blogUrl).slice(0, 260),
    instagramUrl: normalizeUrl(body.instagramUrl).slice(0, 260),
    tiktokUrl: normalizeUrl(body.tiktokUrl).slice(0, 260),
    youtubeUrl: normalizeUrl(body.youtubeUrl).slice(0, 260),
  }
}

function findCrewProfessionByUsername(_username: string): CrewAccessProfession | '' {
  // User profession lookup removed — auth is now DB-backed (async).
  // Avatar resolution falls back to gender/service-area heuristic.
  return ''
}

function resolveNormalizedAvatar(args: {
  username: string
  gender?: CrewProfileData['gender']
  profession?: CrewAccessProfession | string
  serviceAreas?: CrewAccessServiceArea[]
  fallbackAvatar?: string
}): string {
  const profession = args.profession || findCrewProfessionByUsername(args.username)
  if (!args.gender) {
    return args.fallbackAvatar || '/avatar.png'
  }

  return resolveCrewProfileAvatarUrl({
    gender: args.gender,
    profession,
    serviceAreas: args.serviceAreas ?? [],
  })
}

function buildDefaultProfile(session: CrewAccessSession): CrewProfileData {
  return {
    ...createEmptyCrewProfile(),
    fullName: session.displayName,
    avatarUrl: resolveNormalizedAvatar({
      username: session.username,
      profession: session.profession,
      fallbackAvatar: resolveCrewProfileAvatarUrl({
        profession: session.profession,
      }),
    }),
  }
}

function validateProfileInput(raw: unknown, session: CrewAccessSession): CrewProfileData {
  if (!raw || typeof raw !== 'object') {
    throw new CrewProfileValidationError('Payload profil tidak valid.')
  }

  const body = raw as Record<string, unknown>
  const fullName = normalizeText(body.fullName)
  const birthPlace = normalizeText(body.birthPlace)
  const birthDate = normalizeText(body.birthDate)
  const gender = normalizeText(body.gender)
  const domicile = normalizeText(body.domicile)
  const bloodType = normalizeText(body.bloodType)
  const degrees = normalizeDegrees(body.degrees ?? body.degree)
  const jobTitles = normalizeJobTitles(body.jobTitles ?? body.jobTitle)
  const employeeId = normalizeText(body.employeeId)
  const strNumber = normalizeText(body.strNumber)
  const sipNumber = normalizeText(body.sipNumber)
  const serviceAreas = normalizeServiceAreas(body.serviceAreas)
  const serviceAreaOther = normalizeText(body.serviceAreaOther)
  const institutionAdditional = normalizeText(body.institutionAdditional)
  const whatsappNumber = normalizeText(body.whatsappNumber)
  const githubUrl = normalizeUrl(body.githubUrl)
  const linkedinUrl = normalizeUrl(body.linkedinUrl)
  const gravatarUrl = normalizeUrl(body.gravatarUrl)
  const blogUrl = normalizeUrl(body.blogUrl)
  const instagramUrl = normalizeUrl(body.instagramUrl)
  const tiktokUrl = normalizeUrl(body.tiktokUrl)
  const youtubeUrl = normalizeUrl(body.youtubeUrl)
  if (fullName.length < 3 || fullName.length > 120) {
    throw new CrewProfileValidationError('Nama lengkap wajib diisi 3-120 karakter.')
  }

  if (birthPlace && (birthPlace.length < 2 || birthPlace.length > 80)) {
    throw new CrewProfileValidationError('Tempat lahir harus 2-80 karakter.')
  }

  if (birthDate) {
    const parsedBirthDate = new Date(`${birthDate}T00:00:00.000Z`)
    if (!isExactIsoDate(birthDate) || parsedBirthDate > new Date()) {
      throw new CrewProfileValidationError(
        'Tanggal lahir wajib valid dan tidak boleh di masa depan.'
      )
    }
  }

  if (gender && !isCrewAccessGender(gender)) {
    throw new CrewProfileValidationError('Jenis kelamin tidak valid.')
  }

  if (domicile && (domicile.length < 3 || domicile.length > 120)) {
    throw new CrewProfileValidationError('Domisili harus 3-120 karakter.')
  }

  if (bloodType && !isCrewProfileBloodType(bloodType)) {
    throw new CrewProfileValidationError('Golongan darah tidak valid.')
  }

  if (degrees.length > CREW_PROFILE_MAX_DEGREES) {
    throw new CrewProfileValidationError(`Gelar maksimal ${CREW_PROFILE_MAX_DEGREES} pilihan.`)
  }

  if (jobTitles.length > CREW_PROFILE_MAX_POSITIONS) {
    throw new CrewProfileValidationError(
      `Jabatan atau posisi maksimal ${CREW_PROFILE_MAX_POSITIONS} pilihan.`
    )
  }

  if (employeeId.length > 64 || strNumber.length > 64 || sipNumber.length > 64) {
    throw new CrewProfileValidationError('NIP, STR, dan SIP maksimal 64 karakter.')
  }

  if (institutionAdditional.length > 120) {
    throw new CrewProfileValidationError('Institusi tambahan maksimal 120 karakter.')
  }

  if (whatsappNumber.length > 24) {
    throw new CrewProfileValidationError('Nomor WhatsApp maksimal 24 karakter.')
  }

  if (serviceAreaOther.length > 120) {
    throw new CrewProfileValidationError('Area layanan lainnya maksimal 120 karakter.')
  }

  if (
    [githubUrl, linkedinUrl, gravatarUrl, blogUrl, instagramUrl, tiktokUrl, youtubeUrl].some(
      (value) => value.length > 260
    )
  ) {
    throw new CrewProfileValidationError('Link profil maksimal 260 karakter.')
  }

  return {
    fullName,
    birthPlace,
    birthDate,
    gender: gender && isCrewAccessGender(gender) ? gender : '',
    domicile,
    bloodType: bloodType && isCrewProfileBloodType(bloodType) ? bloodType : '',
    degrees: degrees as CrewProfileDegree[],
    jobTitles: jobTitles as CrewProfilePosition[],
    employeeId,
    strNumber,
    sipNumber,
    serviceAreas,
    serviceAreaOther,
    institutionAdditional,
    avatarUrl: resolveCrewProfileAvatarUrl({
      gender: gender && isCrewAccessGender(gender) ? gender : '',
      profession: session.profession,
      serviceAreas: [],
    }),
    whatsappNumber,
    githubUrl,
    linkedinUrl,
    gravatarUrl,
    blogUrl,
    instagramUrl,
    tiktokUrl,
    youtubeUrl,
  }
}

function sanitizeProfile(profile: CrewProfileData, session: CrewAccessSession): CrewProfileData {
  const defaults = buildDefaultProfile(session)
  const nextAvatarUrl = resolveNormalizedAvatar({
    username: session.username,
    gender: profile.gender,
    profession: session.profession,
    serviceAreas: profile.serviceAreas,
    fallbackAvatar: profile.avatarUrl || defaults.avatarUrl,
  })
  return {
    ...defaults,
    ...profile,
    fullName: profile.fullName || defaults.fullName,
    avatarUrl: nextAvatarUrl,
  }
}

export function listAllCrewProfiles(): Map<string, CrewProfileData> {
  const records = readProfileStore()
  const map = new Map<string, CrewProfileData>()
  const users = new Map<string, { profession?: string }>()
  for (const record of records) {
    const profile = sanitizeStoredProfile(record)
    const user = users.get(record.username)
    map.set(record.username, {
      ...profile,
      avatarUrl: resolveNormalizedAvatar({
        username: record.username,
        gender: profile.gender,
        profession: user?.profession,
        serviceAreas: profile.serviceAreas,
        fallbackAvatar: profile.avatarUrl || '/avatar.png',
      }),
    })
  }
  return map
}

export async function getCrewProfile(session: CrewAccessSession): Promise<CrewProfileData> {
  const records = readProfileStore()
  const record = records.find((item) => item.username === session.username)
  return sanitizeProfile(sanitizeStoredProfile(record), session)
}

export async function updateCrewProfile(
  session: CrewAccessSession,
  raw: unknown
): Promise<CrewProfileData> {
  const nextProfile = validateProfileInput(raw, session)

  return withProfileLock(async () => {
    const records = readProfileStore()
    const sanitized = sanitizeProfile(nextProfile, session)
    const nextRecord: CrewProfileStoreRecord = {
      username: session.username,
      updatedAt: new Date().toISOString(),
      ...sanitized,
    }

    const index = records.findIndex((item) => item.username === session.username)
    if (index >= 0) {
      records[index] = nextRecord
    } else {
      records.push(nextRecord)
    }

    writeProfileStore(records)
    return sanitized
  })
}

export async function upsertCrewProfile(
  username: string,
  profileData: Partial<CrewProfileData>
): Promise<void> {
  return withProfileLock(async () => {
    const records = readProfileStore()
    const index = records.findIndex((item) => item.username === username)
    const existing = index >= 0 ? sanitizeStoredProfile(records[index]) : createEmptyCrewProfile()
    const profession = findCrewProfessionByUsername(username)
    const nextAvatarUrl = resolveNormalizedAvatar({
      username,
      gender: profileData.gender || existing.gender || '',
      profession,
      serviceAreas: profileData.serviceAreas || existing.serviceAreas || [],
      fallbackAvatar: profileData.avatarUrl || existing.avatarUrl || '/avatar.png',
    })

    const merged: CrewProfileStoreRecord = {
      username,
      updatedAt: new Date().toISOString(),
      ...existing,
      ...profileData,
      fullName: profileData.fullName || existing.fullName,
      avatarUrl: nextAvatarUrl,
    }

    if (index >= 0) {
      records[index] = merged
    } else {
      records.push(merged)
    }

    writeProfileStore(records)
  })
}

/** Admin edits any user's profile — validates using target user's profession */
export async function adminUpdateCrewProfile(
  username: string,
  profession: string,
  raw: unknown
): Promise<CrewProfileData> {
  const syntheticSession: CrewAccessSession = {
    username,
    displayName: '',
    email: '',
    institution: '' as CrewAccessSession['institution'],
    profession: profession as CrewAccessSession['profession'],
    role: '',
    issuedAt: 0,
    expiresAt: 0,
  }

  const nextProfile = validateProfileInput(raw, syntheticSession)

  return withProfileLock(async () => {
    const records = readProfileStore()
    const sanitized = sanitizeProfile(nextProfile, syntheticSession)
    const nextRecord: CrewProfileStoreRecord = {
      username,
      updatedAt: new Date().toISOString(),
      ...sanitized,
    }

    const index = records.findIndex((item) => item.username === username)
    if (index >= 0) {
      records[index] = nextRecord
    } else {
      records.push(nextRecord)
    }

    writeProfileStore(records)
    return sanitized
  })
}

export function getCrewProfileErrorStatus(error: unknown): 400 | 409 | 500 {
  if (error instanceof CrewProfileValidationError) return 400
  if (error instanceof CrewProfileConflictError) return 409
  return 500
}
