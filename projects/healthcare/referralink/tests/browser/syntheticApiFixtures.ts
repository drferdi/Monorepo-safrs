import type { Page } from '@playwright/test'

export async function installSyntheticSessionFixture(
  page: Page,
  options: { authenticated?: boolean } = {}
) {
  let authenticated = options.authenticated ?? true

  await page.route('**/api/auth/sandbox-session', async (route) => {
    const method = route.request().method()

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authenticated,
          accessMode: authenticated ? 'sandbox' : null,
          expiresAt: authenticated ? '2099-01-01T00:00:00.000Z' : null,
        }),
      })
      return
    }

    if (method === 'DELETE') {
      authenticated = false
      await route.fulfill({ status: 204, body: '' })
      return
    }

    await route.fallback()
  })

  await page.route('**/api/auth/sandbox-register', async (route) => {
    const body = route.request().postDataJSON() as { email?: string }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          email: body.email,
          challengeToken: 'synthetic-opaque-browser-challenge',
          expiresAt: '2099-01-01T00:00:00.000Z',
          deliveryMode: 'email',
        },
      }),
    })
  })

  await page.route('**/api/auth/sandbox-verify', async (route) => {
    const body = route.request().postDataJSON() as { code?: string; email?: string }
    const verified = body.code === '123456'
    authenticated = verified
    await route.fulfill({
      status: verified ? 200 : 401,
      contentType: 'application/json',
      body: JSON.stringify(
        verified
          ? {
              success: true,
              data: {
                email: body.email,
                accessMode: 'sandbox',
                verifiedAt: '2026-01-01T00:00:00.000Z',
              },
            }
          : {
              success: false,
              error: { code: 'INVALID_CODE', message: 'Synthetic code rejected.' },
            }
      ),
    })
  })
}

export async function installSyntheticDiagnosisFixture(page: Page) {
  await page.route('**/api/diagnosis', async (route) => {
    const requestBody = route.request().postDataJSON() as { query?: string }
    const scenario = requestBody.query?.match(/\[fixture:([^\]]+)\]/)?.[1] ?? 'success'

    if (scenario === 'network') {
      await route.abort('connectionfailed')
      return
    }

    const errors: Record<string, { status: number; code: string }> = {
      unauthorized: { status: 401, code: 'SANDBOX_SESSION_REQUIRED' },
      forbidden: { status: 403, code: 'SANDBOX_SCOPE_FORBIDDEN' },
      'rate-limit': { status: 429, code: 'DIAGNOSIS_RATE_LIMITED' },
      unavailable: { status: 503, code: 'DIAGNOSIS_UNAVAILABLE' },
      timeout: { status: 504, code: 'DIAGNOSIS_TIMEOUT' },
    }
    const error = errors[scenario]
    if (error) {
      await route.fulfill({
        status: error.status,
        contentType: 'application/json',
        headers: error.status === 429 ? { 'Retry-After': '60' } : undefined,
        body: JSON.stringify({
          success: false,
          error: { code: error.code, message: 'Synthetic browser fixture.' },
        }),
      })
      return
    }

    if (scenario === 'malformed-output') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { schema_version: 1 },
          metadata: { model: 'synthetic-browser-fixture', latencyMs: 4, timestamp: 0 },
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          schema_version: 2,
          code: 'I20.0',
          description: 'Synthetic diagnosis fixture',
          category: 'Synthetic cardiovascular fixture',
          urgency: 'urgent',
          triage_score: 7,
          clinical_notes: 'Synthetic fixture only; clinician review remains required.',
          evidence: {
            clinical_reasoning: 'Synthetic reasoning for browser acceptance only.',
            red_flags: ['Synthetic red flag'],
            differential_diagnosis: ['Synthetic differential'],
          },
          proposed_referrals: [
            {
              code: 'I20.0',
              description: 'Synthetic referral fixture',
              kompetensi: '3B',
              destination_service: 'Synthetic specialist service',
              facility_level: 'Synthetic referral facility',
              referral_reason: 'Synthetic acceptance reason',
              required_capability: 'Synthetic capability',
              urgency: 'urgent',
              clinical_reasoning: 'Synthetic referral reasoning.',
            },
          ],
        },
        metadata: {
          model: 'synthetic-browser-fixture',
          latencyMs: 12,
          timestamp: 4_102_444_800_000,
          schemaVersion: 2,
        },
      }),
    })
  })
}
