/**
 * @abyss/types — Common Types
 * ────────────────────────────
 * Shared utility types, pagination, and common patterns
 * used across all Sentra applications.
 */

// ─── PAGINATION ───────────────────────────────────────────────────

export interface PaginatedRequest {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// ─── RESULT PATTERN ───────────────────────────────────────────────

export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E }

export interface AppError {
  code: string
  message: string
  details?: Record<string, unknown>
  timestamp: string
}

// ─── AUTH ──────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  facilityId?: string
  permissions: Permission[]
  isActive: boolean
  lastLoginAt?: string
}

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'doctor'
  | 'nurse'
  | 'pharmacist'
  | 'lab_tech'
  | 'receptionist'
  | 'viewer'

export type Permission =
  | 'patient:read'
  | 'patient:write'
  | 'patient:delete'
  | 'encounter:read'
  | 'encounter:write'
  | 'encounter:complete'
  | 'diagnosis:read'
  | 'diagnosis:write'
  | 'prescription:read'
  | 'prescription:write'
  | 'referral:read'
  | 'referral:write'
  | 'referral:approve'
  | 'cdss:use'
  | 'cdss:override'
  | 'audrey:use'
  | 'report:read'
  | 'report:export'
  | 'admin:users'
  | 'admin:facility'
  | 'admin:settings'

export interface Session {
  userId: string
  token: string
  expiresAt: string
  refreshToken?: string
}

// ─── AUDIT TRAIL ──────────────────────────────────────────────────

export interface AuditEntry {
  id: string
  userId: string
  action: string
  resource: string
  resourceId: string
  details?: Record<string, unknown>
  ipAddress?: string
  timestamp: string
}

// ─── NOTIFICATION ─────────────────────────────────────────────────

export interface Notification {
  id: string
  userId: string
  type: 'info' | 'warning' | 'alert' | 'action_required'
  title: string
  message: string
  link?: string
  isRead: boolean
  createdAt: string
}

// ─── HELPERS ──────────────────────────────────────────────────────

export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
export type WithTimestamps<T> = T & {
  createdAt: string
  updatedAt: string
}
export type WithId<T> = T & { id: string }
