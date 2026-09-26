import type { VercelRequest, VercelResponse } from '@vercel/node'

import { processSandboxRegister } from '../_services/sandboxAuthService.js'
import type { RedisEnvironment } from '../_services/upstashRedis.js'
import type { SandboxRegisterInput } from '../_types/sandbox-auth.js'
import { evaluateOriginPolicy } from '../_utils/originPolicy.js'

type RegisterHandlerDependencies = {
  env?: RedisEnvironment
  processRegister?: typeof processSandboxRegister
}

export function createSandboxRegisterHandler(overrides: RegisterHandlerDependencies = {}) {
  return async function sandboxRegisterHandler(req: VercelRequest, res: VercelResponse) {
    const origin = evaluateOriginPolicy(req.headers, overrides.env ?? process.env)
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
      const input = req.body as SandboxRegisterInput
      const clientIp =
        (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown'
      const result = await (overrides.processRegister ?? processSandboxRegister)({
        email: input?.email,
        clientIp,
      })

      return res.status(result.status).json(result.body)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to prepare sandbox verification email.'
      const code =
        message.includes('not configured') || message.includes('Sandbox email provider')
          ? 'EMAIL_PROVIDER_NOT_CONFIGURED'
          : 'SANDBOX_REGISTER_FAILED'

      return res.status(code === 'EMAIL_PROVIDER_NOT_CONFIGURED' ? 503 : 500).json({
        success: false,
        error: {
          code,
          message:
            code === 'EMAIL_PROVIDER_NOT_CONFIGURED'
              ? 'Email sandbox belum dikonfigurasi di server.'
              : 'Gagal menyiapkan verifikasi sandbox. Silakan coba lagi.',
        },
      })
    }
  }
}

export default createSandboxRegisterHandler()
