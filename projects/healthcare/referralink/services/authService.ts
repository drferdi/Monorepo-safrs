import type { SandboxRegisterResponse, SandboxVerifyResponse } from '../api/_types/sandbox-auth'

export type ApiResponse<T = unknown> = {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

export type SandboxSessionProjection = {
  authenticated: boolean
  accessMode: 'sandbox' | null
  expiresAt: string | null
}

const ANONYMOUS_SESSION: SandboxSessionProjection = {
  authenticated: false,
  accessMode: null,
  expiresAt: null,
}

async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const rawBody = await response.text()
  const contentType = response.headers.get('content-type')

  if (contentType && contentType.includes('application/json')) {
    try {
      return JSON.parse(rawBody)
    } catch {
      return {
        success: false,
        error: {
          code: 'INVALID_RESPONSE',
          message: 'Server returned invalid JSON',
        },
      }
    }
  }

  return {
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: `Server error (${response.status})`,
    },
  }
}

export async function registerSandboxEmail(
  email: string
): Promise<ApiResponse<SandboxRegisterResponse>> {
  try {
    const response = await fetch('/api/auth/sandbox-register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    return parseApiResponse<SandboxRegisterResponse>(response)
  } catch (error: unknown) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error occurred',
      },
    }
  }
}

export async function verifySandboxEmail(
  email: string,
  code: string,
  challengeToken: string
): Promise<ApiResponse<SandboxVerifyResponse>> {
  try {
    const response = await fetch('/api/auth/sandbox-verify', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, challengeToken }),
    })

    return parseApiResponse<SandboxVerifyResponse>(response)
  } catch (error: unknown) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error occurred',
      },
    }
  }
}

export async function getSandboxSession(): Promise<SandboxSessionProjection> {
  try {
    const response = await fetch('/api/auth/sandbox-session', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    const payload = (await response
      .json()
      .catch(() => ANONYMOUS_SESSION)) as Partial<SandboxSessionProjection>
    if (
      !response.ok ||
      payload.authenticated !== true ||
      payload.accessMode !== 'sandbox' ||
      typeof payload.expiresAt !== 'string'
    ) {
      return ANONYMOUS_SESSION
    }
    return {
      authenticated: true,
      accessMode: 'sandbox',
      expiresAt: payload.expiresAt,
    }
  } catch {
    return ANONYMOUS_SESSION
  }
}

export async function deleteSandboxSession(): Promise<void> {
  const response = await fetch('/api/auth/sandbox-session', {
    method: 'DELETE',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('Gagal mengakhiri sesi sandbox.')
}
