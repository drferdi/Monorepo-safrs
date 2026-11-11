# Testing Guide — MedBoard

Comprehensive testing practices, suites, execution patterns, and coverage metrics for MedBoard.

---

## Running Tests

```bash
# Run all test suites
pnpm test

# Run CDSS engine test suite only
pnpm run test:cdss

# Run authentication hardening test suite
pnpm run test:auth-hardening

# Run CDSS protected routes test suite
pnpm run test:cdss:protected

# Full capsule validation (contract test)
pnpm run test:capsule

# TypeScript type check
pnpm run lint
```

---

## Test Runner Architecture

MedBoard uses the **Node.js built-in test runner** (`node:test`) powered by `tsx`, eliminating overhead and maintaining native ESM/TypeScript compatibility without Vitest or Jest dependencies.

### Suite 1: Authentication Hardening (`auth-hardening`)
**File:** `scripts/test-auth-hardening.ts`
**Verifies:**
- HMAC session cookie signing and cryptographic verification
- Session expiration and idle timeout enforcement
- Rejection of unauthorized requests (HTTP 401 Unauthorized)
- Cross-Origin Resource Sharing (CORS) enforcement across endpoints

### Suite 2: CDSS Clinical Safety Net (`safety-net`)
**File:** `scripts/test-cdss.ts`
**Verifies:**
- Iskandar Diagnosis Engine V2 across diverse symptom combinations
- Vital signs red flag trigger bounds (SpO2 < 90%, SBP ≥ 180 mmHg, etc.)
- Deterministic fallback behaviors when LLM reasoning APIs are degraded or unreachable
- Clinical plausibility and calibration of confidence scores

### Suite 3: Intelligence & Telemedicine Suite
**Runner:** `tsx --test [files...]`

| Test File | Focus Area |
|---|---|
| `useEncounterQueue.test.ts` | React hook for managing active patient encounter queues |
| `useOperationalMetrics.test.ts` | React hook calculating clinical dashboard operational metrics |
| `trajectory-analyzer.test.ts` | Longitudinal vitals trend analysis across patient visits |
| `visit-history.test.ts` | Historical EMR encounter retrieval and formatting |
| `ai-insights.test.ts` | Automated clinical insight generation and badge states |
| `observability.test.ts` | Telemetry pipelines (Langfuse/Sentry logging & redaction) |
| `intelligence/server.test.ts` | Backend intelligence engine logic and aggregation |
| `socket-payload.test.ts` | Socket.IO clinical event validation schemas |
| `consult-to-bridge.test.ts` | Telemedicine consultation payload mapping to EMR bridge |
| `consult-accepted.test.ts` | Consultation lifecycle and doctor acceptance flow |
| `consult-api-validation.test.ts` | Validation schemas for telemedicine API payloads |
| `intelligence/routes.test.ts` | Next.js API route handlers for intelligence endpoints |
| `observability-handler.test.ts` | Telemetry endpoint handlers |
| `acknowledge-handler.test.ts` | Clinical alert acknowledgment handlers |
| `AIDisclosureBadge.test.tsx` | UI badge ensuring AI transparency disclosure |
| `AIInsightsPanel.test.tsx` | Reactive clinical insights panel component |
| `ClinicalSafetyAlertBanner.test.tsx` | High-priority vital signs and triage warning banner |
| `IntelligenceDashboardScaffold.test.tsx` | Scaffold layout for the intelligence view |
| `IntelligenceSocketProvider.test.tsx` | Socket.IO context provider and reconnection logic |
| `OperationalSummaryPanel.test.tsx` | Shift and clinic aggregate summary components |
| `loading.test.tsx` | Async suspense loading states |
| `error.test.tsx` | Component error boundaries and fallback displays |

---

## Test Patterns & Conventions

Tests utilize native assertions from `node:assert/strict` and test definitions from `node:test`:

```typescript
import assert from "node:assert/strict"
import test from "node:test"

test("acknowledge route returns 401 when session is missing", async () => {
  const handler = createAcknowledgePostHandler({
    getSession: () => null, // Simulate unauthenticated caller
    getIp: () => null,
    recordInteraction: async () => { throw new Error("should not be called") },
    writeSecurityAuditLog: async () => undefined,
  })

  const response = await handler(
    new Request("http://localhost/api/dashboard/intelligence/alerts/acknowledge", {
      method: "POST",
      body: JSON.stringify({ encounterId: "enc-001" })
    })
  )

  assert.equal(response.status, 401)
})
```

```typescript
// Clinical trajectory analysis test pattern
test("trajectory marks hypotension moving toward normal as improving", () => {
  const analysis = analyzeTrajectory([
    createVisit("enc-1", "2026-03-10T08:00:00.000Z", { sbp: 82, dbp: 48, hr: 110 }),
    createVisit("enc-2", "2026-03-12T08:00:00.000Z", { sbp: 110, dbp: 70, hr: 80 }),
  ])
  assert.equal(analysis.trend, "improving")
})
```

---

## Test Environment Variables

```env
NODE_ENV=test
CDSS_VERBOSE_TEST_ERRORS=1   # Enables verbose logging for CDSS tests
```

---

## Acceptance Gates (SAFRS Standards)

| Metric | Target | Status |
|---|---|---|
| Test suite pass rate | 100% (0 failures) | Enforced on every build |
| CDSS red flag coverage | 100% threshold cases | Validated in `test:cdss` |
| Auth security test cases | 100% pass | Validated in `test:auth-hardening` |
| TypeScript strictness | 0 lint/tsc errors | Enforced via `tsc --noEmit` |

---

## Capsule Execution (SAFRS Protocol)

From the capsule root directory:

- `pnpm run test:capsule`: executes the main test suite alongside `test:cdss:engine`, `test:news2`, and `test:symphony:safety-gates`.
- `pnpm run lint`: executes strict TypeScript verification.

### Operational Notes
- `auth-hardening` tests gracefully skip when `DATABASE_URL` is unset (`SKIP_AUTH_HARDENING=1`), allowing local unit checks without live databases. Full security verification requires PostgreSQL with migrations applied.
- All test artifacts generated during execution (`runtime/test-*.txt`, `runtime/symphony-safety-gates.md`) are git-ignored and tracked as local state.
- Suites covering server-only modules run with the `--conditions react-server` flag.

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
