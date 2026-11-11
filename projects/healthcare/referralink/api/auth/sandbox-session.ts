import type { VercelRequest, VercelResponse } from '@vercel/node'

import {
  type FetchLike,
  type RedisCommander,
  type RedisEnvironment,
  UpstashRedis,
} from '../_services/upstashRedis.js'
import { evaluateOriginPolicy } from '../_utils/originPolicy.js'
import { clearSandboxSessionCookie, verifySandboxSession } from '../_utils/sandboxSession.js'

type SessionHandlerDependencies = {
  env?: RedisEnvironment
  fetch?: FetchLike
  redis?: RedisCommander
  now?: () => number
}

const loggedOutProjection = {
  authenticated: false,
  accessMode: null,
  expiresAt: null,
} as const

function cookieHeader(req: VercelRequest): string | undefined {
  const value = req.headers.cookie
  return Array.isArray(value) ? value[0] : value
}

export function createSandboxSessionHandler(overrides: SessionHandlerDependencies = {}) {
  return async function sandboxSessionHandler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Cache-Control', 'no-store')
    const env = overrides.env ?? process.env
    const origin = evaluateOriginPolicy(req.headers, env)
    if (!origin.allowed) {
      return res.status(origin.reason === 'not_configured' ? 503 : 403).json(loggedOutProjection)
    }

    if (req.method !== 'GET' && req.method !== 'DELETE') {
      return res.status(405).json(loggedOutProjection)
    }

    let redis: RedisCommander
    try {
      redis =
        overrides.redis ?? new UpstashRedis({ env, fetch: overrides.fetch ?? globalThis.fetch })
    } catch {
      return res.status(503).json(loggedOutProjection)
    }

    const verified = await verifySandboxSession(cookieHeader(req), {
      redis,
      env,
      now: overrides.now,
    })
    if (!verified.valid) {
      return res
        .status(
          verified.reason === 'store_unavailable'
            ? 503
            : verified.reason === 'wrong_scope'
              ? 403
              : 401
        )
        .json(loggedOutProjection)
    }

    if (req.method === 'GET') {
      return res.status(200).json({
        authenticated: true,
        accessMode: 'sandbox',
        expiresAt: new Date(verified.claims.exp * 1000).toISOString(),
      })
    }

    try {
      const revoked = await redis.command<unknown>([
        'DEL',
        `medlink:auth:session:${verified.claims.jti}`,
      ])
      if (revoked !== 0 && revoked !== 1) throw new Error('invalid Redis result')
    } catch {
      return res.status(503).json(loggedOutProjection)
    }

    res.setHeader('Set-Cookie', clearSandboxSessionCookie())
    return res.status(200).json(loggedOutProjection)
  }
}

export default createSandboxSessionHandler()
