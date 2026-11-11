/**
 * @abyss/types — API Types
 * ─────────────────────────
 * Shared API request/response shapes for Sentra services.
 */

// ─── API RESPONSE ENVELOPE ────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: ApiMeta
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  validationErrors?: ValidationError[]
}

export interface ValidationError {
  field: string
  message: string
  rule: string
}

export interface ApiMeta {
  requestId: string
  timestamp: string
  version: string
  latencyMs?: number
}

// ─── HTTP ─────────────────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiEndpoint {
  method: HttpMethod
  path: string
  description: string
  requiresAuth: boolean
  requiredPermissions?: string[]
}

// ─── WEBHOOK ──────────────────────────────────────────────────────

export interface WebhookPayload<T = unknown> {
  event: string
  timestamp: string
  data: T
  source: string
  signature: string
}

// ─── SEARCH ───────────────────────────────────────────────────────

export interface SearchRequest {
  query: string
  filters?: Record<string, unknown>
  page?: number
  limit?: number
}

export interface SearchResponse<T> {
  results: T[]
  query: string
  total: number
  page: number
  limit: number
  facets?: Record<string, Array<{ value: string; count: number }>>
}

// ─── REALTIME ─────────────────────────────────────────────────────

export interface RealtimeEvent<T = unknown> {
  type: string
  channel: string
  data: T
  timestamp: string
  userId?: string
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'
