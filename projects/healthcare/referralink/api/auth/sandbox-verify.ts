import type { VercelRequest, VercelResponse } from '@vercel/node'

import { processSandboxVerify } from '../_services/sandboxAuthService.js'
import {
  type FetchLike,
  type RedisCommander,
  type RedisEnvironment,
  UpstashRedis,
} from '../_services/upstashRedis.js'
import type { SandboxVerifyInput } from '../_types/sandbox-auth.js'
import { evaluateOriginPolicy } from '../_utils/originPolicy.js'
import { createSandboxSession } from '../_utils/sandboxSession.js'

type VerifyHandlerDependencies = {
  env?: RedisEnvironment
  fetch?: FetchLike
  redis?: RedisCommander
  now?: () => number
  randomBytes?: (size: number) => Buffer
  processVerify?: typeof processSandboxVerify
  createSession?: typeof createSandboxSession
}

export function createSandboxVerifyHandler(overrides: VerifyHandlerDependencies = {}) {
  return async function sandboxVerifyHandler(req: VercelRequest, res: VercelResponse) {
    const env = overrides.env ?? process.env
    const origin = evaluateOriginPolicy(req.headers, env)
    if (!origin.allowed) {
      return res.status(origin.reason === 'not_configured' ? 503 : 403).json({
        success: false,
        error: {
          code:
            origin.reason === 'not_configured'
              ? 'ORIGIN_POLICY_NOT_CONFIGURED'
              : 'ORIGIN_FORBIDDEN',
          message:
            origin.reason === 'not_configured'
              ? 'Kebijakan origin MEDLINK belum dikonfigurasi.'
              : 'Origin permintaan tidak diizinkan.',
        },
      })
    }

    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Only POST requests are allowed',
        },
      })
    }

    try {
      const input = req.body as SandboxVerifyInput
      const clientIp =
        (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown'

      const result = await (overrides.processVerify ?? processSandboxVerify)({
        email: input?.email,
        code: input?.code,
        challengeToken: input?.challengeToken,
        clientIp,
      })

      if (result.status === 200 && result.body.success && result.body.data) {
        try {
          const redis =
            overrides.redis ?? new UpstashRedis({ env, fetch: overrides.fetch ?? globalThis.fetch })
          const session = await (overrides.createSession ?? createSandboxSession)(
            { email: result.body.data.email },
            { redis, env, now: overrides.now, randomBytes: overrides.randomBytes }
          )
          res.setHeader('Set-Cookie', session.cookie)
        } catch {
          return res.status(503).json({
            success: false,
            error: {
              code: 'AUTH_STORE_UNAVAILABLE',
              message: 'Penyimpanan sesi sandbox sedang tidak tersedia.',
            },
          })
        }
      }

      return res.status(result.status).json(result.body)
    } catch {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SANDBOX_VERIFY_FAILED',
          message: 'Gagal memverifikasi akses sandbox. Silakan coba lagi.',
        },
      })
    }
  }
}

export default createSandboxVerifyHandler()
