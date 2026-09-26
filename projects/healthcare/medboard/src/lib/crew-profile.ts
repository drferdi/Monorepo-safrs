import type {
  CrewAccessGender,
  CrewAccessProfession,
  CrewAccessServiceArea,
} from '@/lib/crew-access'

export const CREW_PROFILE_BLOOD_TYPES = ['A', 'B', 'AB', 'O'] as const

export type CrewProfileBloodType = (typeof CREW_PROFILE_BLOOD_TYPES)[number]

export const CREW_PROFILE_DEGREES = [
  'dr.',
  'drg.',
  'Sp.A',
  'Sp.OG',
  'Sp.PD',
  'S.Ked.',
  'S.Kep.',
  'Ners',
  'S.ST.',
  'A.Md.Keb.',
  'S.Farm.',
  'Apt.',
  'S.Gz.',
  'S.KM.',
  'A.Md.AK',
  'S.Tr.Kes.',
  'M.Kes.',
  'SH',
  'MKN',
  'CLM',
  'CMDC',
] as const

export type CrewProfileDegree = (typeof CREW_PROFILE_DEGREES)[number]

export const CREW_PROFILE_SENTRA_ROLES = [
  'Chief Executive Officer',
  'Lead Clinical Algorithm Strategist & Medical Auditor',
  'Senior Medical Auditor & Clinical Algorithm Specialist',
  'Chief of Diagnostic Audit',
  'Head of Quality Assurance & Control',
  'Clinical & Patient Liaison Officer',
  'Corporate Liaison Officer',
  'Infrastructure Officer',
  'Head of IT Infrastructure',
] as const

export const CREW_PROFILE_STRUCTURAL_POSITIONS = [
  'Dokter Penanggung Jawab',
  'Kepala Puskesmas',
  'Kepala Subbagian Tata Usaha',
  'Dokter/Dokter Gigi',
  'Perawat/Perawat Gigi',
  'Bidan',
  'Apoteker',
  'Asisten Apoteker',
  'Sanitarian',
  'Nutrisionis',
  'Pranata Laboratorium Kesehatan',
  'Perekam Medis',
  'Analis Tata Usaha',
  'Keuangan',
  'Perencana',
  'Pengelola Data dan Informasi',
  'Kepegawaian',
  'Pengemudi',
  'Petugas Keamanan',
  'Pramu Kebersihan/Bhakti',
  'PJ Jaringan Pelayanan (Pustu, Pusling, Poskesdes)',
  'PJ UKM (Usaha Kesehatan Masyarakat) dan UKP (Usaha Kesehatan Perseorangan)',
] as const

export const CREW_PROFILE_POSITIONS = [
  ...CREW_PROFILE_SENTRA_ROLES,
  ...CREW_PROFILE_STRUCTURAL_POSITIONS,
] as const

export type CrewProfilePosition = (typeof CREW_PROFILE_POSITIONS)[number]

const CREW_PROFILE_DEGREE_ALIASES: Record<string, CrewProfileDegree> = {
  MK: 'MKN',
}

const CREW_PROFILE_POSITION_ALIASES: Record<string, CrewProfilePosition> = {
  'Chief Executive Developer': 'Chief Executive Officer',
}

export const CREW_PROFILE_MAX_DEGREES = 5
export const CREW_PROFILE_MAX_POSITIONS = 3

export interface CrewProfileData {
  fullName: string
  birthPlace: string
  birthDate: string
  gender: CrewAccessGender | ''
  domicile: string
  bloodType: CrewProfileBloodType | ''
  degrees: CrewProfileDegree[]
  jobTitles: CrewProfilePosition[]
  employeeId: string
  strNumber: string
  sipNumber: string
  serviceAreas: CrewAccessServiceArea[]
  serviceAreaOther: string
  institutionAdditional: string
  avatarUrl: string
  whatsappNumber: string
  githubUrl: string
  linkedinUrl: string
  gravatarUrl: string
  blogUrl: string
  instagramUrl: string
  tiktokUrl: string
  youtubeUrl: string
}

export function createEmptyCrewProfile(): CrewProfileData {
  return {
    fullName: '',
    birthPlace: '',
    birthDate: '',
    gender: '',
    domicile: '',
    bloodType: '',
    degrees: [],
    jobTitles: [],
    employeeId: '',
    strNumber: '',
    sipNumber: '',
    serviceAreas: [],
    serviceAreaOther: '',
    institutionAdditional: '',
    avatarUrl: '',
    whatsappNumber: '',
    githubUrl: '',
    linkedinUrl: '',
    gravatarUrl: '',
    blogUrl: '',
    instagramUrl: '',
    tiktokUrl: '',
    youtubeUrl: '',
  }
}

const SENTRA_ROLE_TITLES: Record<string, string> = {
  CEO: 'Chief Executive Officer',
  CHIEF_EXECUTIVE_OFFICER: 'Chief Executive Officer',
  ADMINISTRATOR: 'Administrator Sentra',
}

export const CREW_PROFILE_ADMIN_RANK_POSITIONS = [
  'Lead Clinical Algorithm Strategist & Medical Auditor',
  'Senior Medical Auditor & Clinical Algorithm Specialist',
  'Chief of Diagnostic Audit',
  'Head of Quality Assurance & Control',
  'Clinical & Patient Liaison Officer',
  'Corporate Liaison Officer',
] as const satisfies readonly CrewProfilePosition[]

const ADMIN_RANK_POSITIONS = new Set<string>(CREW_PROFILE_ADMIN_RANK_POSITIONS)

export function getCrewSentraLeadershipTitle(role?: string): string {
  if (!role) return ''
  return SENTRA_ROLE_TITLES[role] || ''
}

export function resolveCrewSentraTitles(jobTitles: readonly string[], role?: string): string[] {
  const normalized = jobTitles
    .map(value => normalizeCrewProfilePosition(value) || value.trim())
    .filter(Boolean)
  const leadershipTitle = getCrewSentraLeadershipTitle(role)

  if (!leadershipTitle) {
    return Array.from(new Set(normalized))
  }

  return Array.from(
    new Set([leadershipTitle, ...normalized.filter(value => value !== leadershipTitle)])
  )
}

export function resolveCrewSentraTitle(jobTitles: readonly string[], role?: string): string {
  return resolveCrewSentraTitles(jobTitles, role)[0] || 'Belum diatur'
}

export function resolveCrewRankBadgeSrc(
  role: string | undefined,
  jobTitles: readonly string[] = []
): string | null {
  if (role === 'CEO' || role === 'CHIEF_EXECUTIVE_OFFICER') return '/ceo.png'
  if (role === 'ADMINISTRATOR') return '/admin.png'
  if (jobTitles.some(jobTitle => ADMIN_RANK_POSITIONS.has(jobTitle))) return '/admin.png'
  return null
}

export function isCrewProfileBloodType(value: string): value is CrewProfileBloodType {
  return (CREW_PROFILE_BLOOD_TYPES as readonly string[]).includes(value)
}

export function isCrewProfileDegree(value: string): value is CrewProfileDegree {
  return (CREW_PROFILE_DEGREES as readonly string[]).includes(value)
}

export function normalizeCrewProfileDegree(value: string): CrewProfileDegree | '' {
  const normalized = value.trim()
  if (!normalized) return ''
  if (isCrewProfileDegree(normalized)) return normalized
  return CREW_PROFILE_DEGREE_ALIASES[normalized] || ''
}

export function isCrewProfilePosition(value: string): value is CrewProfilePosition {
  return (CREW_PROFILE_POSITIONS as readonly string[]).includes(value)
}

export function normalizeCrewProfilePosition(value: string): CrewProfilePosition | '' {
  const normalized = value.trim()
  if (!normalized) return ''
  if (isCrewProfilePosition(normalized)) return normalized
  return CREW_PROFILE_POSITION_ALIASES[normalized] || ''
}

interface ResolveCrewProfileAvatarArgs {
  gender?: CrewAccessGender | ''
  profession?: CrewAccessProfession | string
  serviceAreas?: CrewAccessServiceArea[]
}

export function resolveCrewProfileAvatarUrl({
  gender = '',
  profession = '',
  serviceAreas = [],
}: ResolveCrewProfileAvatarArgs): string {
  const hasMaternalService = serviceAreas.some(
    area => area === 'KIA' || area === 'USG' || area === 'PONED'
  )
  const defaultClinicalAvatar =
    gender === 'Perempuan' ? '/avatar/doctor-w.png' : '/avatar/doctor-m.png'
  const dentistAvatar = '/avatar/denstist-w.webp'

  switch (profession) {
    case 'Dokter Gigi':
      if (gender === 'Perempuan') return dentistAvatar
      if (gender === 'Laki-laki') return '/avatar/doctor-m.png'
      return defaultClinicalAvatar
    case 'Bidan':
      return '/avatar/doctor-w.png'
    case 'Apoteker':
      return gender === 'Perempuan' ? '/avatar/pharmacy-w.png' : '/avatar/pharmacy-m.png'
    case 'Perawat':
    case 'Triage Officer':
      return gender === 'Perempuan' ? '/avatar/nurse-w.png' : '/avatar/nurse-m.png'
    case 'Dokter':
      if (gender === 'Perempuan' && hasMaternalService) {
        return '/avatar/doctor-w.png'
      }
      return gender === 'Perempuan' ? '/avatar/doctor-w.png' : '/avatar/doctor-m.png'
    default:
      return defaultClinicalAvatar
  }
}
