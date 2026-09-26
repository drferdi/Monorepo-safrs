/** Seed/fallback institutions — dynamic list lives in runtime/crew-access-institutions.json */
export const CREW_ACCESS_INSTITUTIONS_SEED = [
  'Puskesmas Balowerti Kota Kediri',
  'RSIA Melinda DHAI',
] as const

/** @deprecated Use CREW_ACCESS_INSTITUTIONS_SEED — kept for backward compat */
export const CREW_ACCESS_INSTITUTIONS = CREW_ACCESS_INSTITUTIONS_SEED

export type CrewAccessInstitution = string

export const CREW_ACCESS_PROFESSIONS = [
  'Dokter',
  'Dokter Gigi',
  'Perawat',
  'Bidan',
  'Apoteker',
  'Triage Officer',
] as const

export type CrewAccessProfession = (typeof CREW_ACCESS_PROFESSIONS)[number]

export const CREW_ACCESS_GENDERS = ['Laki-laki', 'Perempuan'] as const

export type CrewAccessGender = (typeof CREW_ACCESS_GENDERS)[number]

export const CREW_ACCESS_SERVICE_AREAS = [
  'KIA',
  'USG',
  'IGD',
  'PONED',
  'VCT HIV',
  'JIWA',
  'Lainnya',
] as const

export type CrewAccessServiceArea = (typeof CREW_ACCESS_SERVICE_AREAS)[number]

export function isCrewAccessInstitution(value: string): value is CrewAccessInstitution {
  return typeof value === 'string' && value.trim().length > 0
}

export function isCrewAccessProfession(value: string): value is CrewAccessProfession {
  return (CREW_ACCESS_PROFESSIONS as readonly string[]).includes(value)
}

export function isDoctorProfession(value: string | null | undefined): boolean {
  return value === 'Dokter' || value === 'Dokter Gigi'
}

export function isCrewAccessGender(value: string): value is CrewAccessGender {
  return (CREW_ACCESS_GENDERS as readonly string[]).includes(value)
}

export function isCrewAccessServiceArea(value: string): value is CrewAccessServiceArea {
  return (CREW_ACCESS_SERVICE_AREAS as readonly string[]).includes(value)
}

export function deriveCrewRoleFromProfession(profession: CrewAccessProfession): string {
  switch (profession) {
    case 'Dokter':
      return 'DOKTER'
    case 'Dokter Gigi':
      return 'DOKTER_GIGI'
    case 'Perawat':
      return 'PERAWAT'
    case 'Bidan':
      return 'BIDAN'
    case 'Apoteker':
      return 'APOTEKER'
    case 'Triage Officer':
      return 'TRIAGE_OFFICER'
    default:
      return 'PERAWAT'
  }
}

export function professionRequiresServiceArea(_profession: CrewAccessProfession): boolean {
  return true
}

export function getCrewProfessionLogo(profession: CrewAccessProfession | string): string | null {
  switch (profession) {
    case 'Dokter':
      return '/profesi/IDI.png'
    case 'Dokter Gigi':
      return '/profesi/pdgi.png'
    case 'Bidan':
      return '/profesi/ibi.png'
    case 'Perawat':
      return '/profesi/ppni.jpg'
    case 'Apoteker':
      return '/profesi/iai.jpg'
    case 'Triage Officer':
      return null
    default:
      return null
  }
}

export interface CrewAccessUser {
  username: string
  displayName: string
  email?: string
  institution?: CrewAccessInstitution
  profession?: CrewAccessProfession
  role?: string
}

export interface CrewAccessSession {
  username: string
  displayName: string
  email: string
  institution: CrewAccessInstitution
  profession: CrewAccessProfession
  role: string
  issuedAt: number
  expiresAt: number
}

export const CREW_ACCESS_SESSION_KEY = 'puskesmas:crew-access:v1'
export const CREW_ACCESS_COOKIE_NAME = 'puskesmas_crew_session'
export const CREW_ACCESS_SESSION_TTL_SECONDS = 60 * 60 * 12
