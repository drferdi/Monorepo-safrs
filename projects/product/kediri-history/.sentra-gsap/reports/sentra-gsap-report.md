# Sentra-GSAP Quality Gate

**Standard:** 1.0.0
**Generated:** 2026-08-27T23:04:36.568Z
**Overall:** FAIL

| Gate | Required | Status | Detail |
|---|---:|---|---|
| GSAP Architecture | Yes | PASS | 0 error(s), 1 warning(s) |
| Typecheck | Yes | PASS | pnpm run typecheck → exit 0 (1755ms) |
| Lint | Yes | FAIL | pnpm run lint → exit 1 (1337ms) |
| Test | Yes | PASS | pnpm run test → exit 0 (1972ms) |
| Build | Yes | PASS | pnpm run build → exit 0 (18456ms) |
| Browser QA | Yes | NOT-RUN | No app URL configured. Set browser.url, SENTRA_GSAP_URL, or --url. |
| Visual Quality Review | Yes | FAIL | Visual review verdict is FAIL. |

## Findings

- **WARN · layout-property-animation** — `apps/web/e2e/smoke.spec.ts`: Layout-property animation detected; prefer transforms when the same visual result is possible.

> SENTRA-GSAP FAIL — implementation must not be represented as production-ready under this standard.
