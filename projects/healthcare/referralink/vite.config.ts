import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'path'

import type { VercelRequest, VercelResponse } from '@vercel/node'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

import { selectDiagnosisRuntimeEnvironment } from './api/_services/diagnosisRuntimeEnv.js'
import { processSandboxRegister, processSandboxVerify } from './api/_services/sandboxAuthService.js'
import diagnosisHandler from './api/diagnosis.js'

const DIAGNOSIS_ENV_KEYS = new Set(['OPENAI_API_KEY', 'OPENAI_BASE_URL', 'OPENAI_MODEL'])

async function readJsonBody(req: NodeJS.ReadableStream) {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

async function invokeServerlessHandler(req: IncomingMessage, res: ServerResponse, body: unknown) {
  const request = req as VercelRequest
  request.body = body

  const response = res as VercelResponse
  response.status = (statusCode: number) => {
    res.statusCode = statusCode
    return response
  }
  response.json = (payload: unknown) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json')
    }
    res.end(JSON.stringify(payload))
    return response
  }

  await diagnosisHandler(request, response)
}

export default defineConfig(({ command, mode }) => {
  const inheritedEnv = { ...process.env }
  const env = loadEnv(mode, '.', '')
  for (const [key, value] of Object.entries(env)) {
    if (!DIAGNOSIS_ENV_KEYS.has(key)) process.env[key] = value
  }
  Object.assign(process.env, selectDiagnosisRuntimeEnvironment(command, inheritedEnv, env))

  return {
    server: {
      port: 3007,
      strictPort: true,
      host: '127.0.0.1',
    },
    plugins: [
      react(),
      {
        name: 'medlink-dev-auth-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.method === 'POST' && req.url === '/api/auth/sandbox-register') {
              try {
                const body = (await readJsonBody(req)) as { email?: string }
                const result = await processSandboxRegister({
                  email: body.email,
                  clientIp: req.socket.remoteAddress || 'unknown',
                })
                json(res, result.status, result.body)
                return
              } catch {
                json(res, 500, {
                  success: false,
                  error: {
                    code: 'SANDBOX_REGISTER_FAILED',
                    message: 'Gagal menyiapkan verifikasi sandbox. Silakan coba lagi.',
                  },
                })
                return
              }
            }

            if (req.method === 'POST' && req.url === '/api/auth/sandbox-verify') {
              try {
                const body = (await readJsonBody(req)) as {
                  email?: string
                  code?: string
                  challengeToken?: string
                }
                const result = processSandboxVerify({
                  email: body.email,
                  code: body.code,
                  challengeToken: body.challengeToken,
                  clientIp: req.socket.remoteAddress || 'unknown',
                })
                json(res, result.status, result.body)
                return
              } catch {
                json(res, 500, {
                  success: false,
                  error: {
                    code: 'SANDBOX_VERIFY_FAILED',
                    message: 'Gagal memverifikasi akses sandbox. Silakan coba lagi.',
                  },
                })
                return
              }
            }

            if (req.method === 'POST' && req.url === '/api/diagnosis') {
              try {
                const body = await readJsonBody(req)
                await invokeServerlessHandler(req, res, body)
                return
              } catch {
                json(res, 500, {
                  success: false,
                  error: {
                    code: 'DIAGNOSIS_HANDLER_FAILED',
                    message: 'Gagal memproses diagnosis di runtime lokal.',
                  },
                })
                return
              }
            }

            next()
          })
        },
      },
    ],
    define: {},
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          silenceDeprecations: ['global-builtin', 'import', 'if-function'],
          quietDeps: true,
        },
      },
    },
    optimizeDeps: {
      exclude: ['api'],
    },
  }
})
