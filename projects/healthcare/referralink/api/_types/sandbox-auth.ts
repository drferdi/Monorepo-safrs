export interface SandboxRegisterInput {
  email: string
}

export interface SandboxVerifyInput {
  email: string
  code: string
  challengeToken: string
}

export interface SandboxRegisterResponse {
  email: string
  challengeToken: string
  expiresAt: string
  deliveryMode: 'email'
}

export interface SandboxVerifyResponse {
  email: string
  accessMode: 'sandbox'
  verifiedAt: string
}

export interface SandboxSessionClaims {
  version: 'v1'
  sub: string
  scope: 'sandbox'
  iat: number
  exp: number
  aud: 'medlink'
  jti: string
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: {
    timestamp: string
  }
}
