// Three access levels (Chief 2026-10-07): CEO, Administrator, User. The level is read from the
// stored role; the role itself keeps the clinical profession that CDSS gating depends on.

export type AccessLevel = 'CEO' | 'ADMINISTRATOR' | 'USER'
export type AdminUserAction = 'edit' | 'deactivate' | 'reactivate' | 'reset-password' | 'delete'

const CEO_ROLES = new Set(['CEO', 'CEO_SENTRA', 'CHIEF_EXECUTIVE_OFFICER'])
const CLINICAL_ROLES = ['DOKTER', 'DOKTER_GIGI', 'PERAWAT', 'BIDAN', 'APOTEKER', 'TRIAGE_OFFICER'] as const
const LEVEL_ROLES = ['CEO', 'CEO_SENTRA', 'ADMINISTRATOR'] as const

export function accessLevelFor(role: string | null | undefined): AccessLevel {
  const normalized = (role ?? '').trim().toUpperCase()
  if (CEO_ROLES.has(normalized)) return 'CEO'
  if (normalized === 'ADMINISTRATOR') return 'ADMINISTRATOR'
  return 'USER'
}

export function accessLevelLabel(level: AccessLevel): string {
  if (level === 'CEO') return 'CEO'
  if (level === 'ADMINISTRATOR') return 'Administrator'
  return 'User'
}

// Only the CEO changes levels, touches CEO or Administrator accounts, or deletes accounts.
export function canActOnUser(args: {
  actorRole: string
  targetRole: string | null | undefined
  action: AdminUserAction
  nextRole?: string | undefined
}): boolean {
  const actor = accessLevelFor(args.actorRole)
  if (actor === 'CEO') return true
  if (actor !== 'ADMINISTRATOR' || args.action === 'delete') return false
  if (accessLevelFor(args.targetRole) !== 'USER') return false
  return args.nextRole === undefined || accessLevelFor(args.nextRole) === 'USER'
}

export function assignableRoles(viewerRole: string | null | undefined): readonly string[] {
  return accessLevelFor(viewerRole) === 'CEO' ? [...LEVEL_ROLES, ...CLINICAL_ROLES] : CLINICAL_ROLES
}
