<!-- Drferdi's vision, brought to life. -->

# ADR-001: Static SPA with No Backend

**Date:** 2025-12-01
**Status:** Accepted
**Deciders:** dr. Ferdi Iskandar, Sentra Healthcare Solutions

---

## Context

The Puskesmas Balowerti website serves an informational purpose: communicating
clinic services, doctor schedules, BPJS patient flow, and contact information
to the general public. No user authentication, data storage, or real-time
computation is required.

## Decision

Build as a **purely static single-page application** (SPA) using React 19 + Vite,
deployed as a static file bundle on Railway.

All appointment reservations are handled via WhatsApp deep links (`wa.me`).
Google Reviews are pre-fetched via a build-time Node.js script and stored
as static JSON (`public/data/google-reviews.json`).

## Rationale

- **Zero operational overhead:** No server process to maintain, patch, or scale.
- **Minimal attack surface:** No database, no authentication endpoints, no PHI processed server-side.
- **Low cost:** Static file hosting on Railway is effectively free at this traffic level.
- **High availability:** Static files can be served from CDN edges with 100% uptime SLA.
- **Fast iteration:** Developers can change content in source files and redeploy in under 2 minutes.

## Consequences

**Positive:**
- Extremely simple infrastructure — no backend team required.
- No server-side security vulnerabilities to manage.
- Excellent performance (no server round-trips for page content).

**Negative:**
- Content updates (doctor schedules, new services) require a code change + redeploy.
- WhatsApp-based appointments lack server-side validation, analytics, or delivery confirmation.
- Google Reviews are not real-time; manual sync required.

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| Next.js with SSR | Operational complexity and cost not justified for informational site |
| WordPress | Heavy CMS overhead; security maintenance burden |
| Headless CMS (Contentful) | Added cost and integration complexity for simple static content |
