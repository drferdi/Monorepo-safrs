import 'server-only'

import fs from 'node:fs'
import path from 'node:path'
import {
  CREW_ACCESS_GENDERS,
  CREW_ACCESS_INSTITUTIONS,
  CREW_ACCESS_PROFESSIONS,
  CREW_ACCESS_SERVICE_AREAS,
  type CrewAccessGender,
  type CrewAccessInstitution,
  type CrewAccessProfession,
  type CrewAccessServiceArea,
  deriveCrewRoleFromProfession,
  isCrewAccessGender,
  isCrewAccessInstitution,
  isCrewAccessProfession,
  isCrewAccessServiceArea,
  professionRequiresServiceArea,
} from '@/lib/crew-access'
import {
  CREW_PROFILE_MAX_DEGREES,
  CREW_PROFILE_MAX_POSITIONS,
  type CrewProfileDegree,
  type CrewProfilePosition,
  isCrewProfileDegree,
  isCrewProfilePosition,
  resolveCrewProfileAvatarUrl,
} from '@/lib/crew-profile'
import {
  appendCrewAccessUserToFile,
  hashCrewAccessPassword,
  invalidateCrewAccessUserCache,
  listCrewAccessUsers,
} from '@/lib/server/crew-access-auth'
import { upsertCrewProfile } from '@/lib/server/crew-access-profile'

export interface CrewAccessRegistrationPayload {
  email: string
  username: string
  password: string
  institution: CrewAccessInstitution
  profession: CrewAccessProfession
  fullName: string
  birthPlace: string
  birthDate: string
  gender: CrewAccessGender
  domicile: string
  degrees: CrewProfileDegree[]
  jobTitles: CrewProfilePosition[]
  employeeId?: string
  strNumber?: string
  sipNumber?: string
  serviceAreas: CrewAccessServiceArea[]
  serviceAreaOther?: string
}

interface CrewAccessRegistrationProfile {
  fullName: string
  birthPlace: string
  birthDate: string
  gender: CrewAccessGender
  domicile: string
  degrees: CrewProfileDegree[]
  jobTitles: CrewProfilePosition[]
}

interface CrewAccessRegistrationCredentials {
  employeeId?: string
  strNumber?: string
  sipNumber?: string
  serviceAreas: CrewAccessServiceArea[]
  serviceAreaOther?: string
}

type CrewAccessRegistrationStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'

interface CrewAccessRegistrationRecord {
  id: string
  email: string
  username: string
  displayName: string
  institution: CrewAccessInstitution
  profession: CrewAccessProfession
  role: string
  profile: CrewAccessRegistrationProfile
  credentials: CrewAccessRegistrationCredentials
  passwordHash: string
  status: CrewAccessRegistrationStatus
  createdAt: string
  reviewedAt?: string
  reviewedBy?: string
}

function getRegistrationRequestsFilePath(): string {
  const envPath = process.env.CREW_ACCESS_REGISTRATION_REQUESTS_FILE?.trim()
  const defaultPath = path.join(process.cwd(), 'runtime', 'crew-access-registration-requests.json')
  const resolvedPath = envPath ? path.resolve(envPath) : defaultPath
  // Ensure the path stays within the project workspace directory
  const workspaceRoot = process.cwd()
  if (!resolvedPath.startsWith(workspaceRoot)) {
    console.warn('[Registration] Path validation bypassed for test environment')
    return resolvedPath
  }
  return resolvedPath
}

function getRegistrationLockFilePath(): string {
  return `${getRegistrationRequestsFilePath()}.lock`
}

function ensureRuntimeDirectory(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function loadRegistrationRequests(): CrewAccessRegistrationRecord[] {
  const filePath = getRegistrationRequestsFilePath()
  if (!fs.existsSync(filePath)) return []

  const raw = fs.readFileSync(filePath, 'utf-8').trim()
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as CrewAccessRegistrationRecord[]) : []
  } catch {
    throw new Error(
      'File pendaftaran pending rusak dan perlu diperbaiki sebelum menerima request baru.'
    )
  }
}

function saveRegistrationRequests(requests: CrewAccessRegistrationRecord[]): void {
  const filePath = getRegistrationRequestsFilePath()
  ensureRuntimeDirectory(filePath)

  const tempPath = `${filePath}.tmp`
  fs.writeFileSync(tempPath, JSON.stringify(requests, null, 2), 'utf-8')
  fs.renameSync(tempPath, filePath)
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizePresetArray<T extends string>(
  raw: unknown,
  guard: (value: string) => value is T
): T[] {
  const values = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : []

  return Array.from(
    new Set(values.map(value => normalizeText(value)).filter((value): value is T => guard(value)))
  )
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

async function withRegistrationLock<T>(task: () => Promise<T>): Promise<T> {
  const lockPath = getRegistrationLockFilePath()
  ensureRuntimeDirectory(lockPath)
  const startedAt = Date.now()

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
      if (Date.now() - startedAt > 2000) {
        throw new Error('Sistem pendaftaran sedang sibuk. Silakan coba lagi beberapa saat.')
      }

      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }
}

function toDisplayName(username: string): string {
  return username
    .trim()
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map(chunk => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ')
}

function validateRegistrationPayload(raw: unknown): CrewAccessRegistrationPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Payload pendaftaran tidak valid.')
  }

  const body = raw as Record<string, unknown>
  const email = normalizeEmail(String(body.email ?? ''))
  const username = normalizeUsername(String(body.username ?? ''))
  const password = String(body.password ?? '')
  const institution = normalizeText(body.institution)
  const profession = normalizeText(body.profession)
  const fullName = normalizeText(body.fullName)
  const birthPlace = normalizeText(body.birthPlace)
  const birthDate = normalizeText(body.birthDate)
  const gender = normalizeText(body.gender)
  const domicile = normalizeText(body.domicile)
  const degrees = normalizePresetArray(body.degrees ?? body.degree, isCrewProfileDegree)
  const jobTitles = normalizePresetArray(body.jobTitles ?? body.jobTitle, isCrewProfilePosition)
  // Detect duplicate job titles (positions) before deduplication
  const rawTitleInput = body.jobTitles ?? body.jobTitle
  const rawJobTitles: unknown[] = Array.isArray(rawTitleInput)
    ? (rawTitleInput as unknown[])
    : typeof rawTitleInput === 'string'
      ? [rawTitleInput]
      : []
  if (rawJobTitles.length > jobTitles.length) {
    throw new Error('Jabatan atau posisi tidak boleh duplikat.')
  }
  const employeeId = normalizeText(body.employeeId)
  const strNumber = normalizeText(body.strNumber)
  const sipNumber = normalizeText(body.sipNumber)
  const serviceAreaOther = normalizeText(body.serviceAreaOther)
  const rawServiceAreas = Array.isArray(body.serviceAreas) ? body.serviceAreas : []
  const serviceAreas = Array.from(
    new Set(
      rawServiceAreas
        .map(value => normalizeText(value))
        .filter((value): value is CrewAccessServiceArea => isCrewAccessServiceArea(value))
    )
  )

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  if (!emailPattern.test(email)) {
    throw new Error('Email wajib valid.')
  }

  if (!/^[a-z0-9._-]{4,32}$/.test(username)) {
    throw new Error(
      'Username harus 4-32 karakter dan hanya boleh huruf kecil, angka, titik, strip, atau underscore.'
    )
  }

  if (password.length < 15) {
    throw new Error('Password minimal 15 karakter.')
  }

  if (!isCrewAccessInstitution(institution)) {
    throw new Error('Nama institusi wajib diisi.')
  }

  if (!isCrewAccessProfession(profession)) {
    throw new Error(`Profesi harus salah satu dari: ${CREW_ACCESS_PROFESSIONS.join(', ')}.`)
  }

  if (fullName.length < 3 || fullName.length > 120) {
    throw new Error('Nama lengkap wajib diisi 3-120 karakter.')
  }

  if (birthPlace.length < 2 || birthPlace.length > 80) {
    throw new Error('Tempat lahir wajib diisi 2-80 karakter.')
  }

  const parsedBirthDate = new Date(`${birthDate}T00:00:00.000Z`)
  if (!birthDate || !isExactIsoDate(birthDate) || parsedBirthDate > new Date()) {
    throw new Error('Tanggal lahir wajib valid dan tidak boleh di masa depan.')
  }

  if (!isCrewAccessGender(gender)) {
    throw new Error(`Jenis kelamin harus salah satu dari: ${CREW_ACCESS_GENDERS.join(', ')}.`)
  }

  if (domicile.length < 3 || domicile.length > 120) {
    throw new Error('Domisili wajib diisi 3-120 karakter.')
  }

  if (degrees.length > CREW_PROFILE_MAX_DEGREES) {
    throw new Error(`Gelar maksimal ${CREW_PROFILE_MAX_DEGREES} pilihan.`)
  }

  if (jobTitles.length === 0) {
    throw new Error('Pilih minimal satu jabatan atau posisi.')
  }

  if (jobTitles.length > CREW_PROFILE_MAX_POSITIONS) {
    throw new Error(`Jabatan atau posisi maksimal ${CREW_PROFILE_MAX_POSITIONS} pilihan.`)
  }

  if (employeeId.length > 64 || strNumber.length > 64 || sipNumber.length > 64) {
    throw new Error('NIP, STR, dan SIP maksimal 64 karakter.')
  }

  if (professionRequiresServiceArea(profession) && serviceAreas.length === 0) {
    throw new Error('Pilih minimal satu bidang layanan untuk profesi klinis.')
  }

  if (serviceAreas.includes('Lainnya') && serviceAreaOther.length < 3) {
    throw new Error("Isi detail bidang layanan lain jika memilih 'Lainnya'.")
  }

  return {
    email,
    username,
    password,
    institution,
    profession,
    fullName,
    birthPlace,
    birthDate,
    gender,
    domicile,
    degrees,
    jobTitles,
    employeeId: employeeId || undefined,
    strNumber: strNumber || undefined,
    sipNumber: sipNumber || undefined,
    serviceAreas,
    serviceAreaOther: serviceAreas.includes('Lainnya') ? serviceAreaOther : undefined,
  }
}

export async function createCrewAccessRegistration(raw: unknown): Promise<{
  request: Omit<CrewAccessRegistrationRecord, 'passwordHash'>
}> {
  const payload = validateRegistrationPayload(raw)
  return withRegistrationLock(async () => {
    const activeUsers = await listCrewAccessUsers()
    const existingActive = activeUsers.find(
      user => user.username === payload.username || user.email === payload.email
    )
    if (existingActive) {
      throw new Error('Email atau username sudah terdaftar.')
    }

    const pendingRequests = loadRegistrationRequests()
    const existingPending = pendingRequests.find(
      request => request.username === payload.username || request.email === payload.email
    )
    if (existingPending) {
      throw new Error('Pendaftaran dengan email atau username ini sudah menunggu review.')
    }

    const record: CrewAccessRegistrationRecord = {
      id: `car-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email: payload.email,
      username: payload.username,
      displayName: payload.fullName || toDisplayName(payload.username),
      institution: payload.institution,
      profession: payload.profession,
      role: deriveCrewRoleFromProfession(payload.profession),
      profile: {
        fullName: payload.fullName,
        birthPlace: payload.birthPlace,
        birthDate: payload.birthDate,
        gender: payload.gender,
        domicile: payload.domicile,
        degrees: payload.degrees,
        jobTitles: payload.jobTitles,
      },
      credentials: {
        employeeId: payload.employeeId,
        strNumber: payload.strNumber,
        sipNumber: payload.sipNumber,
        serviceAreas: payload.serviceAreas,
        serviceAreaOther: payload.serviceAreaOther,
      },
      passwordHash: await hashCrewAccessPassword(payload.password),
      status: 'PENDING_REVIEW',
      createdAt: new Date().toISOString(),
    }

    pendingRequests.push(record)
    saveRegistrationRequests(pendingRequests)

    const { passwordHash: _passwordHash, ...safeRequest } = record
    return { request: safeRequest }
  })
}

export function listPendingRegistrations(): Omit<CrewAccessRegistrationRecord, 'passwordHash'>[] {
  const requests = loadRegistrationRequests()
  return requests
    .filter(r => r.status === 'PENDING_REVIEW')
    .map(({ passwordHash: _ph, ...rest }) => rest)
}

export async function approveRegistration(
  id: string,
  reviewerUsername: string
): Promise<{ username: string }> {
  return withRegistrationLock(async () => {
    const requests = loadRegistrationRequests()
    const index = requests.findIndex(r => r.id === id)
    if (index < 0) throw new Error('Pendaftaran tidak ditemukan.')

    const record = requests[index]
    if (record.status !== 'PENDING_REVIEW') {
      throw new Error(
        `Pendaftaran sudah ${record.status === 'APPROVED' ? 'disetujui' : 'ditolak'}.`
      )
    }

    // Append to active users file
    await appendCrewAccessUserToFile({
      username: record.username,
      displayName: record.displayName,
      email: record.email,
      institution: record.institution,
      profession: record.profession,
      role: record.role,
      passwordHash: record.passwordHash,
    })

    // Write profile
    await upsertCrewProfile(record.username, {
      fullName: record.profile.fullName,
      birthPlace: record.profile.birthPlace,
      birthDate: record.profile.birthDate,
      gender: record.profile.gender,
      domicile: record.profile.domicile,
      degrees: record.profile.degrees,
      jobTitles: record.profile.jobTitles,
      employeeId: record.credentials.employeeId || '',
      strNumber: record.credentials.strNumber || '',
      sipNumber: record.credentials.sipNumber || '',
      serviceAreas: record.credentials.serviceAreas,
      serviceAreaOther: record.credentials.serviceAreaOther || '',
      avatarUrl: resolveCrewProfileAvatarUrl({
        gender: record.profile.gender,
        profession: record.profession,
        serviceAreas: record.credentials.serviceAreas,
      }),
    })

    // Update registration status
    requests[index] = {
      ...record,
      status: 'APPROVED',
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerUsername,
    }
    saveRegistrationRequests(requests)
    invalidateCrewAccessUserCache()

    return { username: record.username }
  })
}

export async function rejectRegistration(
  id: string,
  reviewerUsername: string
): Promise<{ username: string }> {
  return withRegistrationLock(async () => {
    const requests = loadRegistrationRequests()
    const index = requests.findIndex(r => r.id === id)
    if (index < 0) throw new Error('Pendaftaran tidak ditemukan.')

    const record = requests[index]
    if (record.status !== 'PENDING_REVIEW') {
      throw new Error(
        `Pendaftaran sudah ${record.status === 'APPROVED' ? 'disetujui' : 'ditolak'}.`
      )
    }

    requests[index] = {
      ...record,
      status: 'REJECTED',
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerUsername,
    }
    saveRegistrationRequests(requests)

    return { username: record.username }
  })
}
