# SAFRS Golden Path

## Objective

Meja kesiapan ini membantu Chief melihat hubungan Database → API bertipe → Web → Siap, lalu menyimpan satu contoh untuk membuktikan alur.

## Owner and boundary

Chief owns the product outcome. This project owns only `projects/internal/golden-path/**`; reusable interfaces remain in declared `@safrs/*` packages.

## Non-goals

This is not product branding, a production deployment, an authentication system, or a place for production credentials or data.

## Commands

From repository root:

- `pnpm --filter @safrs/web test`
- `pnpm --filter @safrs/web typecheck`
- `pnpm --filter @safrs/web build`

## Dependencies and safety

The web app runs on Node.js and uses local PostgreSQL only through `@safrs/database`. Browser API calls remain same-origin at runtime. `DATABASE_URL` is server-only. Canonical safety and risk rules live in the root [AGENTS.md](../../AGENTS.md), [SAFRS_SPEC.md](../../SAFRS_SPEC.md), and [SECURITY.md](../../SECURITY.md).
