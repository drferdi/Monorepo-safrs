import { randomBytes as nodeRandomBytes } from 'node:crypto'

import type {
  ApiResponse,
  SandboxRegisterResponse,
  SandboxVerifyResponse,
} from '../_types/sandbox-auth.js'
import { checkRateLimit, sanitizeInput, validateEmail } from '../_utils/auth.js'
import {
  consumeSandboxChallenge,
  createSandboxChallenge,
  createSandboxVerificationCode,
  SandboxAuthConfigurationError,
  SandboxAuthStoreError,
} from '../_utils/sandboxAuth.js'

import { sendSandboxVerificationEmail } from './sandboxEmail.js'
import {
  type FetchLike,
  type RedisEnvironment,
  UpstashRedis,
  UpstashRedisCommandError,
  UpstashRedisConfigurationError,
  UpstashRedisUnavailableError,
} from './upstashRedis.js'

type Failure = {
  status: FailureStatus
  body: ApiResponse
}

type FailureStatus = 400 | 410 | 429 | 500 | 503

type RegisterSuccess = {
  status: 200
  body: ApiResponse<SandboxRegisterResponse>
}

type VerifySuccess = {
  status: 200
  body: ApiResponse<SandboxVerifyResponse>
}

type SandboxAuthServiceDependencies = {
  env?: RedisEnvironment
  fetch?: FetchLike
  now?: () => number
  randomBytes?: (size: number) => Buffer
  sendVerificationEmail?: typeof sendSandboxVerificationEmail
}

function buildFailure(status: FailureStatus, code: string, message: string): Failure {
  return {
    status,
    body: {
      success: false,
      error: { code, message },
    },
  }
}

function nowMeta(now: () => number) {
  return { timestamp: new Date(now()).toISOString() }
}

function resolveDependencies(input: SandboxAuthServiceDependencies) {
  const env = input.env ?? process.env
  const fetchImpl = input.fetch ?? globalThis.fetch
  const now = input.now ?? Date.now
  const randomBytes = input.randomBytes ?? nodeRandomBytes
  return {
    env,
    now,
    randomBytes,
    redis: new UpstashRedis({ env, fetch: fetchImpl }),
    sendVerificationEmail: input.sendVerificationEmail ?? sendSandboxVerificationEmail,
  }
}

function authStoreFailure(error: unknown): Failure | undefined {
  if (
    error instanceof UpstashRedisConfigurationError ||
    error instanceof SandboxAuthConfigurationError
  ) {
    return buildFailure(
      503,
      'SANDBOX_AUTH_NOT_CONFIGURED',
      'Sandbox auth belum dikonfigurasi di server.'
    )
  }
  if (
    error instanceof UpstashRedisUnavailableError ||
    error instanceof UpstashRedisCommandError ||
    error instanceof SandboxAuthStoreError
  ) {
    return buildFailure(
      503,
      'AUTH_STORE_UNAVAILABLE',
      'Penyimpanan auth sandbox sedang tidak tersedia.'
    )
  }
  return undefined
}

export async function processSandboxRegister(
  input: { email?: string; clientIp?: string },
  dependencyOverrides: SandboxAuthServiceDependencies = {}
): Promise<RegisterSuccess | Failure> {
  const email = input.email?.toLowerCase().trim()
  if (!email || !validateEmail(email)) {
    return buildFailure(400, 'INVALID_EMAIL', 'Masukkan alamat email yang valid.')
  }

  const clientIp = input.clientIp || 'unknown'
  if (!checkRateLimit(`sandbox-register:${clientIp}`, 5, 15 * 60 * 1000)) {
    return buildFailure(
      429,
      'RATE_LIMIT_EXCEEDED',
      'Terlalu banyak permintaan verifikasi. Coba lagi dalam 15 menit.'
    )
  }

  const safeEmail = sanitizeInput(email)
  try {
    const dependencies = resolveDependencies(dependencyOverrides)
    const code = createSandboxVerificationCode(dependencies.randomBytes)
    const { challengeToken, expiresAt } = await createSandboxChallenge(
      { email: safeEmail, code },
      dependencies
    )

    await dependencies.sendVerificationEmail({ email: safeEmail, code, expiresAt })
    return {
      status: 200,
      body: {
        success: true,
        data: {
          email: safeEmail,
          challengeToken,
          expiresAt,
          deliveryMode: 'email',
        },
        meta: nowMeta(dependencies.now),
      },
    }
  } catch (error) {
    const storeFailure = authStoreFailure(error)
    if (storeFailure) return storeFailure

    const message = error instanceof Error ? error.message : ''
    if (message.includes('not configured') || message.includes('Sandbox email provider')) {
      return buildFailure(
        503,
        'EMAIL_PROVIDER_NOT_CONFIGURED',
        'Email sandbox belum dikonfigurasi di server.'
      )
    }
    return buildFailure(
      500,
      'SANDBOX_REGISTER_FAILED',
      'Gagal menyiapkan verifikasi sandbox. Silakan coba lagi.'
    )
  }
}

export async function processSandboxVerify(
  input: { email?: string; code?: string; challengeToken?: string; clientIp?: string },
  dependencyOverrides: SandboxAuthServiceDependencies = {}
): Promise<VerifySuccess | Failure> {
  const email = input.email?.toLowerCase().trim()
  const code = input.code?.replace(/\D/g, '')
  const challengeToken = input.challengeToken?.trim()

  if (!email || !validateEmail(email)) {
    return buildFailure(400, 'INVALID_EMAIL', 'Alamat email tidak valid.')
  }
  if (!code || code.length !== 6 || !challengeToken) {
    return buildFailure(
      400,
      'INVALID_VERIFICATION_INPUT',
      'Kode verifikasi dan challenge token wajib diisi.'
    )
  }

  const clientIp = input.clientIp || 'unknown'
  if (!checkRateLimit(`sandbox-verify:${clientIp}:${email}`, 8, 15 * 60 * 1000)) {
    return buildFailure(
      429,
      'RATE_LIMIT_EXCEEDED',
      'Terlalu banyak percobaan verifikasi. Coba lagi dalam 15 menit.'
    )
  }

  try {
    const dependencies = resolveDependencies(dependencyOverrides)
    const verificationResult = await consumeSandboxChallenge(
      { email: sanitizeInput(email), code, challengeToken },
      dependencies
    )

    if (!verificationResult.valid) {
      const errorMap = {
        expired: {
          status: 410,
          message: 'Kode verifikasi sandbox sudah kedaluwarsa. Minta kode baru.',
        },
        mismatch: {
          status: 400,
          message: 'Kode verifikasi tidak cocok dengan email yang didaftarkan.',
        },
        invalid: { status: 400, message: 'Challenge verifikasi sandbox tidak valid.' },
      } as const
      const mapped = errorMap[verificationResult.reason]
      return buildFailure(
        mapped.status,
        `SANDBOX_${verificationResult.reason.toUpperCase()}`,
        mapped.message
      )
    }

    return {
      status: 200,
      body: {
        success: true,
        data: {
          email,
          accessMode: 'sandbox',
          verifiedAt: verificationResult.verifiedAt,
        },
        meta: nowMeta(dependencies.now),
      },
    }
  } catch (error) {
    const storeFailure = authStoreFailure(error)
    if (storeFailure) return storeFailure
    return buildFailure(
      500,
      'SANDBOX_VERIFY_FAILED',
      'Gagal memverifikasi akses sandbox. Silakan coba lagi.'
    )
  }
}
