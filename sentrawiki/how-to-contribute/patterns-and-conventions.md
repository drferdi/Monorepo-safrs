# Patterns and conventions

## Coding style

- **TypeScript strict** across all packages. The shared tsconfig base lives in `packages/config/tsconfig/base.json`.
- **Biome** handles formatting and linting with the `recommended` preset. Double quotes, semicolons, trailing commas, 2-space indent.
- **Named exports** only. No default exports except for Next.js pages and React Email templates.
- Functions and components are small and single-purpose.
- Comments explain why, not what.
- The automation control plane uses **zero runtime dependencies** in `tools/automation/`: Node built-ins only.

## Error handling

The API uses a correlation-ID error envelope defined in `packages/api/src/error.ts`. Every response (success or error) carries an `x-correlation-id` header. Errors follow the `apiErrorSchema` from `@safrs/schemas`:

```typescript
{
  code: string,
  message: string,
  correlationId: string,
  fieldErrors?: Record<string, string[]>
}
```

The automation control plane uses a **fail-closed** pattern: any input the policy cannot fully resolve is rejected, never guessed at. Every gate, contract validator, and lease verifier returns explicit `PASS` or `FAIL` verdicts with error lists.

## Schema-first contracts

Two contract systems coexist:

1. **Zod schemas** in `@safrs/schemas` are the single source of truth for API contracts. The Hono API uses `@hono/zod-validator` and the typed RPC client provides compile-time drift detection.

2. **JSON Schema 2020-12** documents in `.safrs/schemas/` define the automation control plane contracts: task, run, operation, lease, approval, evidence, and platform attestation. These are validated by a dependency-free validator in `tools/automation/src/contracts.mjs` and mirrored by Python checkers in `tools/safrs/`.

## Canonical JSON

The automation control plane uses a deterministic JSON serialization: UTF-8, lexicographically sorted keys, preserved array order, no insignificant whitespace, safe integers only. Content-addressed SHA-256 digests computed over canonical JSON provide byte-identical hashes across Node and Python, Windows and Linux. This parity is governance-tested by `test/canonical-json.test.mjs` and `tools/safrs/check_task_contract.py`.

## Monotonic risk

Risk is computed as `effective_risk = max(declared, path, operation, data, capability, actual_diff)`. Every dimension, including R0, must carry a non-empty reason. Agents may raise risk, never lower it. Implemented in `tools/automation/src/risk.mjs`.

## Design token enforcement

Raw colour or radius values are forbidden outside `packages/token/src/tokens.css`. The governance gate at `scripts/check-tokens.mjs` scans all source files for hex values and bare `border-radius` declarations, and recomputes WCAG 2.2 AA contrast ratios.

## Testing patterns

- **Unit tests**: Vitest, co-located with source (e.g., `app.test.ts` next to `app.ts`).
- **Automation tests**: Node `--test` runner, 12 test files in `tools/automation/test/` covering canonical JSON, scopes, risk, contracts, guard, gates, leases, approvals, evidence, publisher, and adapter parity.
- **Contract tests**: Cross-package contracts in `tests/contracts/`.
- **Integration tests**: Database integration in `tests/integration/`.
- **E2E tests**: Playwright browser smoke with visual regression baselines via Git LFS.
- **Governance tests**: Python tests in `tests/architecture/`, `tests/governance/` (including `test_automation_contracts.py` and `test_automation_approvals.py`), and `tests/repository/`.
- **Property-based tests**: `fast-check` with deterministic seed in `@safrs/schemas`.

## Database safety

- The reset guard (`packages/database/src/reset-guard.ts`) rejects any database URL that is not `postgresql://` on `127.0.0.1:54329` with a name ending in `_local` or `_test`.
- `DATABASE_URL` is never exposed to the browser.
- Seed data is a single safe demo record with a fixed UUID.

## Language conventions

- All repository documentation is in English, kept as concise as possible.
- Agent chat diagnostics are in Bahasa Indonesia.
- Code, commands, and identifiers are in English.
- Error messages in the API are in Bahasa Indonesia (user-facing).

## Verification integrity

Changes to verification controls (`.safrs/**`, `AGENTS.md`, CI workflows, governance scripts, `tools/automation/**`, security tests) are minimum R2, even if the textual change appears small. Disallowed behavior includes deleting assertions, widening ignores, skipping tests, lowering thresholds, or disabling gates to make a task pass.
