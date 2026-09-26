# Privacy Policy — Sentra AI (sentra-main)

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_

---

## Scope

This document describes the data practices for the `sentra-main` marketing site
at `sentrahai.com`. It covers what data is collected, how it is used, and what
third-party services the site interacts with.

For the user-facing privacy policy published at `/privacy`, see
`app/privacy/page.tsx`.

---

## Data Collection

### What this site collects

**Nothing** — `sentra-main` does not collect, store, or transmit personal data.

There are no:

- User accounts or authentication
- Forms that submit data to a server
- Analytics SDKs (Google Analytics, Mixpanel, etc.)
- Session tracking or fingerprinting
- Cookies set by the application

The only cookies that may exist are those created by the browser itself (e.g.
session storage, prefetch hints from Next.js).

### Server-side request logs

Railway (the hosting platform) may log standard HTTP request metadata (IP
address, user-agent, path, timestamp) as part of its infrastructure operation.
These logs are governed by
[Railway's Privacy Policy](https://railway.app/legal/privacy).

---

## No PHI Policy

This site does not process, display, or accept Protected Health Information
(PHI) of any kind.

- `SentraSim`, `ClinicalTrajectory`, and `ClinicalPrognosis` use entirely
  synthetic demo data — no real patient records
- No forms accept patient data
- `public/llms.txt` contains only company information, no patient data

---

## Third-Party Services

### Google Fonts

Fonts (Plus Jakarta Sans, Inter, Caveat) are loaded via `next/font/google`.
Next.js downloads these fonts at build time and self-hosts them — the browser
does not make requests to `fonts.googleapis.com` or `fonts.gstatic.com` at
runtime.

### External Images

Images may be loaded from:

- `framerusercontent.com` — product/showcase images
- `images.unsplash.com` — illustration images

These requests go from the user's browser to the respective CDN. Standard CDN
request logs (IP, user-agent) may be retained by those services.

### Google Search Console

`app/google22238cc24e0d1002.html` is a domain verification file (served as a
static route). It does not collect user data — it only confirms to Google that
Sentra controls this domain.

### Railway

The site is hosted on Railway. Railway processes request metadata as described
above. See [Railway's Privacy Policy](https://railway.app/legal/privacy).

---

## User-Facing Privacy Policy

The full privacy policy published for users of Sentra's products is at
`/privacy` (`app/privacy/page.tsx`). That document was last updated March 2026
and covers data practices for Sentra's clinical products, not just this
marketing site.

---

## Contact

Privacy questions: drferdiiskandar@melinda.co.id

---

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_
