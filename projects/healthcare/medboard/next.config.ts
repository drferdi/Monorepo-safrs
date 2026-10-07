// Designed and constructed by Drferdi.
import type { NextConfig } from 'next'

const isProduction = process.env.NODE_ENV === 'production'

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  [
    "connect-src 'self'",
    'https://puskesmasbalowerti.com',
    'https://www.puskesmasbalowerti.com',
    'https://medboard.sentrahai.com',
    // OpenFreeMap: style, vector tiles, glyphs and sprites for the Sentra Network map (Chief 2026-10-07).
    'https://tiles.openfreemap.org',
    'ws:',
    'wss:',
    ...(isProduction ? [] : ['http://localhost:*', 'ws://localhost:*']),
  ].join(' '),
  // MapLibre starts its tile worker from a blob URL.
  "worker-src 'self' blob:",
].join('; ')

const nextConfig: NextConfig = {
  // Trace and bundle from this capsule, not from the lockfile of an enclosing repository.
  outputFileTracingRoot: __dirname,
  turbopack: { root: __dirname },
  reactStrictMode: false,
  // No @sentra/* here: the safety-gate detectors are vendored at
  // src/lib/cdss/symphony and @sentra/sandi was never a dependency of this app.
  transpilePackages: ['socket.io-client', 'engine.io-client', '@socket.io/component-emitter'],
  serverExternalPackages: ['playwright', 'playwright-core', 'xlsx'],
  outputFileTracingExcludes: {
    '**/*': [
      '**/runtime/**',
      '**/database/**',
      '**/.claude/**',
      '**/node_modules/**/*.map',
      '**/node_modules/playwright/**',
      '**/node_modules/playwright-core/**',
      '**/node_modules/@next/swc-*/**',
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy.replace(/\s{2,}/g, ' ') },
        ],
      },
    ]
  },
}

export default nextConfig
