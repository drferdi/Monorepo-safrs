import { expect, test } from '@playwright/test'

import {
  installSyntheticDiagnosisFixture,
  installSyntheticSessionFixture,
} from './syntheticApiFixtures'

type AuditRecord = {
  failureCode: string | null
  [key: string]: unknown
}

async function readLogbook(page: Parameters<typeof installSyntheticSessionFixture>[0]) {
  return page.evaluate(
    () =>
      new Promise<AuditRecord[]>((resolve, reject) => {
        const request = indexedDB.open('medlink-workspace-v1')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction('logbook', 'readonly')
          const records = transaction.objectStore('logbook').getAll()
          records.onerror = () => reject(records.error)
          records.onsuccess = () => resolve(records.result as AuditRecord[])
        }
      })
  )
}

async function seedLegacyWorkspace(page: Parameters<typeof installSyntheticSessionFixture>[0]) {
  await page.goto('/images/logosentra.png')
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const deletion = indexedDB.deleteDatabase('medlink-workspace-v1')
        deletion.onerror = () => reject(deletion.error)
        deletion.onsuccess = () => {
          const opening = indexedDB.open('medlink-workspace-v1', 2)
          opening.onerror = () => reject(opening.error)
          opening.onupgradeneeded = () => {
            opening.result.createObjectStore('logbook', { keyPath: 'id' })
            opening.result.createObjectStore('credentials', { keyPath: 'id' })
          }
          opening.onsuccess = () => {
            const database = opening.result
            const transaction = database.transaction(['logbook', 'credentials'], 'readwrite')
            transaction.objectStore('logbook').put({
              id: 'legacy-raw-record',
              schemaVersion: 1,
              rawNarrative: 'synthetic legacy narrative that must be purged',
              providerPayload: { synthetic: true },
            })
            transaction.objectStore('credentials').put({
              id: 'credential-seed',
              label: 'Synthetic metadata seed',
              provider: 'Synthetic provider',
              username: 'synthetic-user',
              url: 'https://example.invalid',
              kind: 'account',
              notes: 'Synthetic metadata only',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
              secretState: 'desktop-required',
            })
            transaction.onerror = () => reject(transaction.error)
            transaction.oncomplete = () => {
              database.close()
              resolve()
            }
          }
        }
      })
  )
}

async function readWorkspaceSnapshot(page: Parameters<typeof installSyntheticSessionFixture>[0]) {
  return page.evaluate(
    () =>
      new Promise<{ version: number; credentials: Array<Record<string, unknown>> }>(
        (resolve, reject) => {
          const request = indexedDB.open('medlink-workspace-v1')
          request.onerror = () => reject(request.error)
          request.onsuccess = () => {
            const database = request.result
            const records = database
              .transaction('credentials', 'readonly')
              .objectStore('credentials')
              .getAll()
            records.onerror = () => reject(records.error)
            records.onsuccess = () =>
              resolve({ version: database.version, credentials: records.result })
          }
        }
      )
  )
}

async function openAuthenticatedWorkspace(
  page: Parameters<typeof installSyntheticSessionFixture>[0],
  hash = 'medlink'
) {
  await installSyntheticSessionFixture(page)
  await installSyntheticDiagnosisFixture(page)
  await page.goto(`/#${hash}`)
  await expect(page.getByLabel('MEDLINK navigation')).toBeVisible()
}

test('loads the authenticated MEDLINK workspace from a synthetic same-origin session', async ({
  page,
}, testInfo) => {
  await installSyntheticSessionFixture(page)
  await page.goto('/#medlink')

  if (testInfo.project.name === 'mobile-chromium') {
    await expect(page.getByRole('button', { name: 'Buka menu navigasi' })).toBeVisible()
  } else {
    await expect(page.getByRole('navigation', { name: 'Ruang kerja MEDLINK' })).toBeVisible()
  }
  await expect(page.getByRole('heading', { level: 1, name: 'MedLink' })).toBeVisible()
})

test('completes synthetic email-code authentication without a live provider', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Authentication flow runs once.')
  await installSyntheticSessionFixture(page, { authenticated: false })
  await page.goto('/#medlink')
  await page.getByRole('button', { name: 'Skip intro' }).click()

  await page.getByLabel('ID Korporat / Email Kerja').fill('clinician@example.invalid')
  await page.getByRole('button', { name: 'Masuk dengan aman' }).click()
  await expect(page.getByLabel('Kode Verifikasi')).toBeEditable()
  await page.getByLabel('Kode Verifikasi').fill('123456')
  await page.getByRole('button', { name: 'Verifikasi dan masuk' }).click()

  await expect(page.getByLabel('MEDLINK navigation')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'MedLink' })).toBeVisible()
})

test('renders a provider-independent successful diagnosis fixture', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Diagnosis matrix runs once on desktop.')
  await installSyntheticSessionFixture(page)
  await installSyntheticDiagnosisFixture(page)
  await page.goto('/#medlink')

  await page.getByLabel('Ketik nama penyakit atau gejala').fill('[fixture:success] synthetic only')
  await page.getByRole('button', { name: 'Cari', exact: true }).click()

  await expect(page.getByRole('heading', { level: 2, name: 'Referral analysis' })).toBeVisible()
  await expect.poll(async () => (await readLogbook(page)).length).toBe(1)
  const record = (await readLogbook(page))[0]
  expect(Object.keys(record).sort()).toEqual(
    [
      'createdAt',
      'durationMs',
      'failureCode',
      'humanReviewRequired',
      'id',
      'referralCount',
      'resultSchemaVersion',
      'schemaVersion',
      'status',
      'urgency',
    ].sort()
  )
})

const diagnosisErrorCases = [
  {
    scenario: 'unauthorized',
    message: '[Tindakan] Masuk kembali untuk melanjutkan',
    failureCode: 'unknown',
  },
  {
    scenario: 'forbidden',
    message: '[Tindakan] Muat ulang dari origin MEDLINK resmi',
    failureCode: 'unknown',
  },
  {
    scenario: 'rate-limit',
    message: '[Tindakan] Tunggu sejenak lalu coba lagi',
    failureCode: 'rate-limited',
  },
  {
    scenario: 'unavailable',
    message: '[Tindakan] Coba lagi beberapa saat',
    failureCode: 'service-unavailable',
  },
  {
    scenario: 'timeout',
    message: '[Tindakan] Tinjau input lalu coba lagi',
    failureCode: 'timeout',
  },
  {
    scenario: 'malformed-output',
    message: '[Tindakan] Coba lagi analisis',
    failureCode: 'invalid-output',
  },
  {
    scenario: 'network',
    message: '[Tindakan] Periksa koneksi lalu coba lagi',
    failureCode: 'network',
  },
] as const

for (const diagnosisCase of diagnosisErrorCases) {
  test(`renders the ${diagnosisCase.scenario} diagnosis fixture`, async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop-chromium',
      'Diagnosis matrix runs once on desktop.'
    )
    await installSyntheticSessionFixture(page)
    await installSyntheticDiagnosisFixture(page)
    await page.goto('/#medlink')

    await page
      .getByLabel('Ketik nama penyakit atau gejala')
      .fill(`[fixture:${diagnosisCase.scenario}] synthetic only`)
    await page.getByRole('button', { name: 'Cari', exact: true }).click()

    const notification = page.getByRole('status').filter({ hasText: diagnosisCase.message })
    await expect(notification).toContainText('Analisis tidak tersedia')
    await expect(notification).toContainText(diagnosisCase.message)
    await expect
      .poll(async () => (await readLogbook(page)).at(-1)?.failureCode)
      .toBe(diagnosisCase.failureCode)
  })
}

test('navigates every authenticated workspace route on desktop', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop route matrix runs once.')
  await openAuthenticatedWorkspace(page)

  const routes = [
    ['SentraBoard', 'sentraboard'],
    ['MedLink', 'medlink'],
    ['Logbook', 'logbook'],
    ['Credential', 'credential'],
    ['Sentrapedia', 'sentrapedia'],
    ['Notifikasi', 'notifications'],
    ['Pengaturan', 'settings'],
  ] as const

  for (const [label, hash] of routes) {
    const link = page.getByRole('link', { name: label, exact: true }).first()
    await link.click()
    await expect(page).toHaveURL(new RegExp(`#${hash}$`))
    await expect(link).toHaveAttribute('aria-current', 'page')
    await expect(page.locator('main#main-content')).toBeVisible()
  }
})

test('keeps the authenticated workspace on the approved dark theme', async ({ page }) => {
  await installSyntheticSessionFixture(page)
  await installSyntheticDiagnosisFixture(page)
  await page.goto('/#settings')
  await expect(page.getByLabel('MEDLINK navigation')).toBeVisible()

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveClass(/cds--g100/)
  await expect(page.getByRole('button', { name: /Gunakan tema/ })).toHaveCount(0)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('exposes all mobile destinations and returns focus after Escape', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile navigation runs once.')
  await openAuthenticatedWorkspace(page)

  const menuButton = page.getByRole('button', { name: 'Buka menu navigasi' })
  const navigation = page.getByRole('navigation', { name: 'Ruang kerja MEDLINK' })
  await expect(navigation).toBeHidden()
  await menuButton.focus()
  await page.keyboard.press('Enter')
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true')
  await expect(navigation).toBeVisible()
  await expect(page.getByRole('link', { name: 'Pengaturan', exact: true })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(navigation).toBeHidden()
  await expect(menuButton).toBeFocused()

  const routes = [
    ['SentraBoard', 'sentraboard'],
    ['MedLink', 'medlink'],
    ['Logbook', 'logbook'],
    ['Credential', 'credential'],
    ['Sentrapedia', 'sentrapedia'],
    ['Notifikasi', 'notifications'],
    ['Pengaturan', 'settings'],
  ] as const
  for (const [label, hash] of routes) {
    await menuButton.click()
    await expect(navigation).toBeVisible()
    await page.getByRole('link', { name: label, exact: true }).first().click()
    await expect(page).toHaveURL(new RegExp(`#${hash}$`))
    await expect(page.locator('main#main-content')).toBeVisible()
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false')
  }

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1)
})

test('reflows at the 200 percent desktop zoom equivalent', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Zoom reflow runs once.')
  await page.setViewportSize({ width: 720, height: 500 })
  await openAuthenticatedWorkspace(page)

  const menuButton = page.getByRole('button', { name: 'Buka menu navigasi' })
  await expect(menuButton).toBeVisible()
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1)
})

test('purges schema-v1 Logbook data while preserving Credential metadata', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Migration acceptance runs once.')
  await seedLegacyWorkspace(page)
  await openAuthenticatedWorkspace(page)

  await expect.poll(async () => (await readWorkspaceSnapshot(page)).version).toBe(3)
  await expect.poll(async () => (await readLogbook(page)).length).toBe(0)

  await page.getByRole('link', { name: 'Logbook', exact: true }).click()
  await expect(
    page.getByText('Riwayat lama dihapus saat kebijakan retensi tanpa narasi diterapkan.')
  ).toBeVisible()

  await page.getByRole('link', { name: 'Credential', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Synthetic metadata seed' })).toBeVisible()
  const snapshot = await readWorkspaceSnapshot(page)
  expect(snapshot.credentials).toHaveLength(1)
  expect(JSON.stringify(snapshot.credentials[0])).not.toMatch(/password|token|secretValue/i)
})

test('persists only Credential metadata across browser reloads', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Credential persistence runs once.')
  await openAuthenticatedWorkspace(page, 'credential')

  await page.getByLabel('Label').fill('Synthetic browser metadata')
  await page.getByLabel('Penyedia').fill('Synthetic provider')
  await page.getByLabel('Nama pengguna').fill('synthetic-user')
  await page.getByLabel('HTTPS URL').fill('https://example.invalid')
  await page.getByLabel('Jenis', { exact: true }).selectOption('account')
  await page.getByLabel('Catatan').fill('Synthetic metadata only')
  await page.getByRole('button', { name: 'Tambah metadata' }).click()
  await expect(page.getByRole('heading', { name: 'Synthetic browser metadata' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Synthetic browser metadata' })).toBeVisible()
  const snapshot = await readWorkspaceSnapshot(page)
  expect(snapshot.credentials).toHaveLength(1)
  expect(Object.keys(snapshot.credentials[0]).sort()).toEqual(
    [
      'createdAt',
      'id',
      'kind',
      'label',
      'notes',
      'provider',
      'secretState',
      'updatedAt',
      'url',
      'username',
    ].sort()
  )
})

test('uses an announced memory fallback when IndexedDB is unavailable', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Storage fallback runs once.')
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined })
  })
  await openAuthenticatedWorkspace(page, 'credential')

  await expect(
    page.getByRole('status').filter({ hasText: 'Penyimpanan metadata persisten tidak tersedia' })
  ).toBeVisible()
})

test('requires confirmation before deleting individual or all Logbook records', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Destructive actions run once.')
  await openAuthenticatedWorkspace(page)

  const query = page.getByLabel('Ketik nama penyakit atau gejala')
  for (const index of [1, 2]) {
    await query.fill(`[fixture:success] synthetic deletion fixture ${index}`)
    await page.getByRole('button', { name: 'Cari', exact: true }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Referral analysis' })).toBeVisible()
    await page.getByRole('button', { name: 'Bersihkan ruang kerja' }).click()
  }
  await expect.poll(async () => (await readLogbook(page)).length).toBe(2)

  await page.getByRole('link', { name: 'Logbook', exact: true }).click()
  const deleteButtons = page.getByRole('button', { name: 'Hapus catatan operasional' })
  await expect(deleteButtons).toHaveCount(2)
  await deleteButtons.first().click()
  const deleteDialog = page.getByRole('dialog', { name: 'Hapus catatan ini?' })
  await expect(deleteDialog).toBeVisible()
  await deleteDialog.getByRole('button', { name: 'Batal' }).click()
  await expect(deleteDialog).toBeHidden()
  await expect(deleteButtons).toHaveCount(2)

  await deleteButtons.first().click()
  await deleteDialog.getByRole('button', { name: 'Hapus catatan' }).click()
  await expect(deleteButtons).toHaveCount(1)

  await page.getByRole('button', { name: 'Hapus semua catatan' }).click()
  const clearDialog = page.getByRole('dialog', { name: 'Hapus semua catatan?' })
  await expect(clearDialog).toBeVisible()
  await clearDialog.getByRole('button', { name: 'Batal' }).click()
  await expect(deleteButtons).toHaveCount(1)

  await page.getByRole('button', { name: 'Hapus semua catatan' }).click()
  await clearDialog.getByRole('button', { name: 'Hapus catatan' }).click()
  await expect(page.getByText('Belum ada analisis yang dicatat.')).toBeVisible()
})
