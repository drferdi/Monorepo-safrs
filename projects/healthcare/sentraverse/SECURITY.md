# Security Policy — Sentra AI (sentra-main)

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report privately to:

| Channel | Details |
|---------|---------|
| Email | drferdiiskandar@melinda.co.id |
| Subject line | `[SECURITY] sentra-main — <brief description>` |

Include in your report:
- A clear description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (optional)

You will receive an acknowledgement within 48 hours. We follow responsible disclosure — we ask for a 90-day window to investigate and remediate before public disclosure.

---

## Security Architecture

### 1. OWASP HTTP Security Headers

All routes receive the following headers, configured in `next.config.mjs`:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Block clickjacking via iframes |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter for older browsers |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer header leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable sensitive browser APIs |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS for 2 years |
| `Content-Security-Policy` | See below | Restrict resource origins |

**CSP directives in full:**
```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval'
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src 'self' https://fonts.gstatic.com
img-src 'self' data: blob: https://framerusercontent.com https://images.unsplash.com
connect-src 'self'
frame-ancestors 'none'
```

> `unsafe-inline` and `unsafe-eval` are required by Next.js and Framer Motion at this time. A nonce-based CSP is on the roadmap.

### 2. Remote Image Allowlist

`next/image` only serves images from explicitly allowlisted domains in `next.config.mjs`:

```js
remotePatterns: [
  { protocol: 'https', hostname: 'framerusercontent.com', pathname: '/**' },
  { protocol: 'https', hostname: 'images.unsplash.com',   pathname: '/**' },
]
```

Any external image domain not on this list will be rejected at build time.

### 3. Static Site — Minimal Attack Surface

`sentra-main` has no:
- Server-side database connections
- User authentication or session management
- API routes that accept external POST/PUT/DELETE requests
- PHI (Protected Health Information) processing of any kind

All pages are statically rendered. The only server-side logic is Next.js's built-in header injection.

### 4. No PHI Policy

This site does not collect, process, or store any patient data.
- No forms submit data to a backend
- No analytics SDK that could capture user input
- `public/llms.txt` contains only non-sensitive company information

### 5. Dependency Security

Dependencies are managed via `npm`. Run a dependency audit before each release:

```bash
npm audit
npm audit fix
```

Known risk noted in CONTRIBUTING.md: `xlsx >= 0.18.5` open version range is a medium-priority supply-chain consideration inherited from workspace dependencies.

---

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x (current) | ✅ Yes |
| < 1.0 | ❌ No |

---

## Known Limitations

- `unsafe-inline` in CSP is required by the current Framer Motion version. Tracking upstream fix.
- `unsafe-eval` is required by Next.js development mode. Production builds do not include this directive in standard Next.js behavior — verify with `npm run build && npm run start`.

---

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_
