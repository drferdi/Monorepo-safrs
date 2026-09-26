import 'server-only'

import { NextResponse } from 'next/server'

const DEFAULT_ALLOWED_ORIGINS = [
  'https://puskesmasbalowerti.com',
  'https://www.puskesmasbalowerti.com',
  'https://crew.puskesmasbalowerti.com',
  'https://primary-healthcare-production.up.railway.app',
]

const DEFAULT_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Crew-Access-Token',
  'X-Correlation-Id',
]

const DEV_ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost:\d+$/i,
  /^http:\/\/192\.168\.\d+\.\d+:\d+$/i,
]

function parseEnvList(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function getAllowedOrigins(): Set<string> {
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...parseEnvList('CORS_ALLOWED_ORIGINS')])
}

function getAllowedExtensionOrigins(): Set<string> {
  return new Set(
    parseEnvList('CORS_ALLOWED_EXTENSION_IDS').map(
      (extensionId) => `chrome-extension://${extensionId}`
    )
  )
}

function isAllowedOrigin(origin: string): boolean {
  if (getAllowedOrigins().has(origin)) return true
  if (getAllowedExtensionOrigins().has(origin)) return true

  if (process.env.NODE_ENV !== 'production') {
    return DEV_ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))
  }

  return false
}

function getOrigin(request: Request): string | null {
  const origin = request.headers.get('origin')?.trim()
  if (!origin) return null
  return isAllowedOrigin(origin) ? origin : null
}

function buildAllowedHeaders(request: Request): string {
  const allowed = new Set([...DEFAULT_ALLOWED_HEADERS, ...parseEnvList('CORS_ALLOWED_HEADERS')])
  const allowedLookup = new Set(Array.from(allowed).map((header) => header.toLowerCase()))
  const requestedHeaders = request.headers.get('access-control-request-headers')
  const invalidRequested: string[] = []

  if (requestedHeaders) {
    for (const header of requestedHeaders.split(',')) {
      const normalized = header.trim()
      if (!normalized) continue
      if (allowedLookup.has(normalized.toLowerCase())) {
        allowed.add(normalized)
      } else {
        invalidRequested.push(normalized)
      }
    }
  }

  return invalidRequested.length > 0 ? '' : Array.from(allowed).join(', ')
}

function buildCorsHeaderMap(
  request: Request,
  methods: readonly string[]
): Record<string, string> | null {
  const origin = getOrigin(request)
  if (!origin) return null

  const allowedHeaders = buildAllowedHeaders(request)
  if (!allowedHeaders) return null

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': methods.join(', '),
    'Access-Control-Allow-Headers': allowedHeaders,
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin, Access-Control-Request-Headers',
  }
}

export function withCors(
  request: Request,
  response: NextResponse,
  methods: readonly string[]
): NextResponse {
  const headers = buildCorsHeaderMap(request, methods)
  if (!headers) {
    return response
  }

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value)
  }

  return response
}

export function jsonWithCors(
  request: Request,
  methods: readonly string[],
  body: unknown,
  init?: ResponseInit
): NextResponse {
  return withCors(request, NextResponse.json(body, init), methods)
}

export function handleCorsPreflight(request: Request, methods: readonly string[]): NextResponse {
  const headers = buildCorsHeaderMap(request, methods)
  if (!headers) {
    return new NextResponse(null, {
      status: 403,
      headers: { Vary: 'Origin' },
    })
  }

  return new NextResponse(null, {
    status: 204,
    headers,
  })
}
