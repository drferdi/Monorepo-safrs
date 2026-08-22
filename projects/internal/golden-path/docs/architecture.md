# Architecture

## Objective and boundaries

The single deployment is the Next.js application in `apps/web`. It mounts the package-owned Hono application below `/api` and renders the readiness desk server-first. `DemoForm` is the smallest client leaf; it receives no non-serializable server values.

## Flow

`@safrs/database` supplies local PostgreSQL access, `@safrs/api` validates and exposes Hono routes, and the Next.js application presents readiness and submits through the typed client.

## Runtime and non-goals

The app uses the Node.js runtime, App Router, Tailwind CSS 4, and shared `@safrs/ui`. It intentionally excludes product branding, deployment configuration, authentication, Edge runtime, and optional capability packs.

## Sensitive surfaces

The API adapter, shared API contract, dependencies, and database route are R2 surfaces. Follow root [AGENTS.md](../../../AGENTS.md), [SECURITY.md](../../../SECURITY.md), and [SAFRS_SPEC.md](../../../SAFRS_SPEC.md).
