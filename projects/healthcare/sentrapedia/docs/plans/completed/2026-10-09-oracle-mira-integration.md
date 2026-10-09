# Oracle/MIRA implementation plan

Spec approved by Chief's 2026-10-09 integrate-both instruction; tightly coupled solo execution. No installs or paid verification. Existing independently installed extraction used for gates. Review solo per Chief.

- [x] 1. Add tests/oracle-mira.test.ts first. lib/oracle.ts owns JSON lookup/provenance; locally vendor MIRA v1 schemas/types/validator in lib/mira/, record SOURCE.md and hashes. Tests query/codes/categories/schema/PII/format/persistence.
- [x] 2. lib/mira/gateway.ts owns server transport and validation. app/api/mira/route.ts exposes health and step. Tests with injected fetch/config cover missing token, origin, malformed bodies/results, PII, timeout, busy/cancel, unavailable sanitization and valid responses. No live POST. .env.example and capsule.json declare optional service/config.
- [x] 3. components/knowledge-dialog.tsx and mira-case-form.tsx render catalog/search/provenance and complete form/result. lib/mira/presentation.ts makes source-preserving draft. Integrate sidebar/composer/Command Center/workspace draft-save; keep styling and local storage v1. CSS scoped.
- [x] 4. Typecheck → changed TS eslint → targeted tests → build → dry-run in extraction. Hash all source/config/assets/Oracle; original Oracle hashes unchanged. Browser catalog/health/failure states/mobile/keyboard, mock HTTP integration separately with no model calls. Solo security/clinical/source review; CONTEXT/HANDOFF/ledger evidence; move completed.

Commands: npx --no-install tsc --noEmit; npx --no-install eslint <changed TS> --fix; npm test -- tests/oracle-mira.test.ts tests/workflow.test.ts tests/workspace.test.ts tests/studio.test.ts; npm run build; npm run deploy:dry-run.

Ruling: reuse existing approved MIRA service/protocol with server-only new token configuration, never read another capsule's secrets or import its runtime source. Request current provider unchanged, no live model verification. Scope requires explicit structured synthetic case; no inferred Patient fields. Lack of configuration is a visible state, not fake successful analysis. Production clinical readiness is outside local integration acceptance.

Completion: 64 tests and all gates passed in the preinstalled independent extraction; 57 files match. Desktop/mobile and mock-only save/reload/review verified. Real inference unverified; needs authorized server token. See docs/verification/2026-10-09-oracle-mira-integration.md.
