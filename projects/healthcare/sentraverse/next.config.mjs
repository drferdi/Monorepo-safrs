// Architected and built by Drferdi.
// sentra-main: public marketing website for sentrahai.com
// /dashboard/* is proxied to sentra-dashboard (dedicated clinical app) via rewrites.

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    useLightningcss: false,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'framerusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn-images-1.medium.com',
        pathname: '/**',
      },
    ],
  },

  // Proxy /dashboard/* to the dedicated sentra-dashboard service.
  // SENTRA_DASHBOARD_URL must be set in Railway env (e.g. https://sentra-dashboard.up.railway.app).
  // Note: WebSocket upgrades (Socket.IO) are NOT handled by Next.js rewrites.
  // For production, configure a Railway/Nginx-level reverse proxy for /dashboard/socket.io path.
  async rewrites() {
    const dashboardUrl = process.env.SENTRA_DASHBOARD_URL
    const assistverseUrl =
      process.env.SENTRA_ASSISTVERSE_URL || 'https://site-assist-seven.vercel.app'
    const rewrites = [
      {
        // Proxy the public Assistverse deployment under the official sentrahai.com subpath.
        source: '/asisten-medis',
        destination: `${assistverseUrl}/asisten-medis`,
      },
      {
        source: '/asisten-medis/:path*',
        destination: `${assistverseUrl}/asisten-medis/:path*`,
      },
    ]
    if (!dashboardUrl) {
      // In local dev, skip proxy — run sentra-dashboard separately on a different port.
      return rewrites
    }
    return [
      ...rewrites,
      {
        // Forward exactly /dashboard to the dashboard app.
        source: '/dashboard',
        destination: `${dashboardUrl}/dashboard`,
      },
      {
        // Forward /dashboard/:path* to the dashboard app preserving the /dashboard prefix.
        // sentra-dashboard routes are under app/dashboard/* so the full path must be forwarded.
        source: '/dashboard/:path*',
        destination: `${dashboardUrl}/dashboard/:path*`,
      },
    ]
  },

  // Security headers — OWASP baseline
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://framerusercontent.com https://images.unsplash.com https://cdn-images-1.medium.com",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
