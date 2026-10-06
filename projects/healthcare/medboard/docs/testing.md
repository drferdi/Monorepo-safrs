# Testing Guide — MedBoard

---

## Menjalankan Tests

```bash
# Semua test suites (dari root monorepo)
pnpm run test

# CDSS engine saja
pnpm run test:cdss

# Auth hardening saja
pnpm run test:auth-hardening

# CDSS protected route (Node module test)
pnpm run test:cdss:protected

# TypeScript check
pnpm run lint
```

---

## Test Suites

App menggunakan **Node.js built-in test runner** (`node:test`) via `tsx`, bukan Vitest/Jest.

### Suite 1: `auth-hardening`
**File:** `scripts/test-auth-hardening.ts`
**Menguji:**
- HMAC cookie signing/verification
- Session expiry enforcement
- Unauthorized request rejection (401)
- CORS enforcement

### Suite 2: `safety-net` (CDSS)
**File:** `scripts/test-cdss.ts`
**Menguji:**
- IDE-V2 engine dengan berbagai kombinasi gejala
- Vital signs red flag detection (SpO2 < 90%, sistolik ≥ 180, dll)
- Fallback behavior jika LLM API tidak tersedia
- Confidence scoring plausibility

### Suite 3: `intelligence-route` (22 test files)
**Runner:** `tsx --test [files...]`

| Test File | Menguji |
|-----------|---------|
| `useEncounterQueue.test.ts` | Hook untuk antrian encounter pasien |
| `useOperationalMetrics.test.ts` | Hook untuk metrics operasional |
| `trajectory-analyzer.test.ts` | Analisis trend vital signs antar kunjungan |
| `visit-history.test.ts` | Riwayat kunjungan EMR |
| `ai-insights.test.ts` | AI insights generation |
| `observability.test.ts` | Langfuse/Sentry observability pipeline |
| `intelligence/server.test.ts` | Intelligence server-side logic |
| `socket-payload.test.ts` | Socket.IO payload validation |
| `consult-to-bridge.test.ts` | Transfer konsultasi ke EMR bridge |
| `consult-accepted.test.ts` | Flow penerimaan konsultasi |
| `consult-api-validation.test.ts` | Validasi API telemedicine |
| `intelligence/routes.test.ts` | Route handler intelligence dashboard |
| `observability-handler.test.ts` | Observability route handler |
| `acknowledge-handler.test.ts` | Alert acknowledge handler |
| `AIDisclosureBadge.test.tsx` | AI disclosure badge component |
| `AIInsightsPanel.test.tsx` | AI insights panel component |
| `ClinicalSafetyAlertBanner.test.tsx` | Clinical safety alert component |
| `IntelligenceDashboardScaffold.test.tsx` | Dashboard scaffold |
| `IntelligenceSocketProvider.test.tsx` | Socket provider component |
| `OperationalSummaryPanel.test.tsx` | Operational summary component |
| `loading.test.tsx` | Loading state component |
| `error.test.tsx` | Error state component |

---

## Contoh Test Pattern

Tests menggunakan `node:assert/strict` + `node:test`:

```typescript
import assert from "node:assert/strict"
import test from "node:test"

test("acknowledge route returns 401 when session is missing", async () => {
  const handler = createAcknowledgePostHandler({
    getSession: () => null,        // simulasi: tidak ada session
    getIp: () => null,
    recordInteraction: async () => { throw new Error("should not be called") },
    writeSecurityAuditLog: async () => undefined,
  })

  const response = await handler(
    new Request("http://localhost/api/dashboard/intelligence/alerts/acknowledge", {
      method: "POST",
      body: JSON.stringify({ encounterId: "enc-001", ... })
    })
  )

  assert.equal(response.status, 401)
})
```

```typescript
// Clinical trajectory test
test("trajectory reads hypotension moving toward normal as improving", () => {
  const analysis = analyzeTrajectory([
    createVisit("enc-1", "2026-03-10T08:00:00.000Z", { sbp: 82, dbp: 48, hr: 110 }),
    createVisit("enc-2", "2026-03-12T08:00:00.000Z", { sbp: 110, dbp: 70, hr: 80 }),
  ])
  assert.equal(analysis.trend, "improving")
})
```

---

## Env Variables untuk Testing

```env
NODE_ENV=test
CDSS_VERBOSE_TEST_ERRORS=1   # Aktifkan verbose CDSS error logging saat test
```

---

## Coverage Target (Gate 4)

| Metric | Target | Status |
|--------|--------|--------|
| Test suite pass rate | 100% | Aktif dijalankan |
| CDSS red flag coverage | 100% threshold cases | Dalam `test:cdss` |
| Auth security cases | 100% | Dalam `test:auth-hardening` |
| Unit coverage % | ≥ 80% | TestSprite pending (missing-inputs #8) |

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>

## Capsule commands (SAFRS)

The monorepo `--filter` commands above are legacy. From this capsule root:

- `node scripts/pnpm.mjs run test:capsule` is the contract `test`: the main suite plus
  `test:cdss:engine`, `test:news2`, and `test:symphony:safety-gates`.
- `node scripts/pnpm.mjs run lint` is the TypeScript check.

## Known gaps

- `auth-hardening` is skipped when `DATABASE_URL` is unset (`scripts/test-suite.ts` sets
  `SKIP_AUTH_HARDENING=1`), so a green `test:capsule` without a database runs no auth-hardening
  assertion. Running it needs a disposable PostgreSQL with migrations applied.
- The safety-net gaps recorded at migration (21/25, exit code ignored) were fixed on 2026-09-27:
  `scripts/test-cdss.ts` reports 27/27 and any failure sets exit code 1.
- The reports a test run writes (`runtime/test-*.txt`, `runtime/symphony-safety-gates.md`) are
  git-ignored and listed as mutable state in `project.contract.json`; read them locally after a run.
- The `assist-acceptance` suite runs with `--conditions react-server`, because the modules it
  tests import `server-only`.
