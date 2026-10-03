import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import {
  getExtensionId,
  launchExtensionContext,
} from './chrome-extension-launch';

type ChromeRuntimeApi = {
  runtime: {
    getManifest(): {
      manifest_version: number;
      name: string;
      version: string;
      background?: { service_worker?: string };
      side_panel?: { default_path?: string };
      permissions?: string[];
      host_permissions?: string[];
      oauth2?: { client_id?: string; scopes?: string[] };
      web_accessible_resources?: Array<{ resources: string[]; matches: string[] }>;
    };
    lastError?: { message?: string };
    sendMessage(payload: Record<string, unknown>, callback: (response: unknown) => void): void;
  };
};

async function openExtensionPage(
  context: BrowserContext,
  extensionId: string,
  pageName: 'login.html' | 'sidepanel.html'
): Promise<{ page: Page; pageErrors: string[] }> {
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(`chrome-extension://${extensionId}/${pageName}`);
  await page.waitForLoadState('domcontentloaded');

  await expect
    .poll(async () => {
      return page.locator('#root').evaluate((element) => element.childElementCount);
    })
    .toBeGreaterThan(0);

  await expect(page.getByText('CRITICAL RUNTIME ERROR')).toHaveCount(0);
  return { page, pageErrors };
}

async function sendRuntimeMessage<TResponse>(
  page: Page,
  payload: Record<string, unknown>
): Promise<{ response: TResponse; lastError: string | null }> {
  return await page.evaluate(async (message) => {
    const chromeApi = (window as unknown as { chrome: ChromeRuntimeApi }).chrome;
    return await new Promise<{ response: TResponse; lastError: string | null }>((resolve) => {
      chromeApi.runtime.sendMessage(message, (response: unknown) => {
        resolve({
          response: response as TResponse,
          lastError: chromeApi.runtime.lastError?.message ?? null,
        });
      });
    });
  }, payload);
}

function unwrapMessagingResponse<T>(response: unknown): T {
  if (
    typeof response === 'object' &&
    response !== null &&
    'res' in (response as Record<string, unknown>)
  ) {
    return (response as { res: T }).res;
  }
  return response as T;
}

test.describe.serial('Sentra Assist extension smoke', () => {
  let context: BrowserContext;

  // Playwright beforeAll requires object-destructuring for fixture position.
  // eslint-disable-next-line no-empty-pattern
  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(120_000);
    context = await launchExtensionContext();
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  test('boots service worker and exposes expected manifest contract', async () => {
    const extensionId = await getExtensionId(context);
    const { page, pageErrors } = await openExtensionPage(context, extensionId, 'login.html');

    const manifest = await page.evaluate(() => {
      const chromeApi = (window as unknown as { chrome: ChromeRuntimeApi }).chrome;
      return chromeApi.runtime.getManifest();
    });

    expect(pageErrors).toEqual([]);
    expect(extensionId).toBeTruthy();
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('Asisten Medis');
    expect(manifest.version).toBe('2.1.0');
    expect(manifest.background?.service_worker).toBe('background.js');
    expect(manifest.side_panel?.default_path).toBe('sidepanel.html');
    expect(manifest.permissions).toEqual(
      expect.arrayContaining(['activeTab', 'storage', 'sidePanel', 'scripting'])
    );
    // No code uses the Google identity, OAuth or googleapis grants (removed 2026-10-03).
    expect(manifest.permissions).not.toContain('identity');
    expect(manifest.host_permissions).toEqual(
      expect.arrayContaining(['https://crew.puskesmasbalowerti.com/*', '*://*.epuskesmas.id/*'])
    );
    expect(manifest.host_permissions).not.toContain('https://*.googleapis.com/*');
    expect(manifest.oauth2).toBeUndefined();
    expect(manifest.web_accessible_resources?.map((entry) => entry.matches)).toEqual([
      ['*://*.epuskesmas.id/*'],
    ]);
  });

  test('mounts sidepanel runtime without crashing', async () => {
    const extensionId = await getExtensionId(context);
    const { pageErrors } = await openExtensionPage(context, extensionId, 'sidepanel.html');

    expect(pageErrors).toEqual([]);
  });

  test('shows console login gate on sidepanel when session is missing', async () => {
    const extensionId = await getExtensionId(context);
    const { page, pageErrors } = await openExtensionPage(context, extensionId, 'sidepanel.html');

    await expect(page.getByText(/ASISTEN MEDIS/i)).toBeVisible();
    await expect(page.getByPlaceholder('USERNAME')).toBeVisible();
    await expect(page.getByPlaceholder('PASSWORD')).toBeVisible();
    await expect(page.getByTestId('clinical-reasoning-workbench')).toHaveCount(0);
    await expect(page.locator('#sidepanel-tabpanel-ttv')).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test('fails scrape routes safely when no ePuskesmas tab is active', async () => {
    const extensionId = await getExtensionId(context);
    const { page, pageErrors } = await openExtensionPage(context, extensionId, 'sidepanel.html');

    const scanMedicalHistory = await sendRuntimeMessage<unknown>(page, {
      type: 'scanMedicalHistory',
      timestamp: Date.now(),
    });
    const scanClinicalContext = await sendRuntimeMessage<unknown>(page, {
      type: 'scanClinicalContext',
      timestamp: Date.now(),
    });

    const medicalHistoryPayload = unwrapMessagingResponse<{
      success: boolean;
      error?: string;
      history?: unknown[];
    }>(scanMedicalHistory.response);

    const clinicalContextPayload = unwrapMessagingResponse<{
      success: boolean;
      error?: string;
      context?: unknown;
    }>(scanClinicalContext.response);

    expect(pageErrors).toEqual([]);
    expect(scanMedicalHistory.lastError).toBeNull();
    expect(scanClinicalContext.lastError).toBeNull();
    expect(medicalHistoryPayload).toMatchObject({
      success: false,
      error: expect.any(String),
    });
    expect(clinicalContextPayload).toMatchObject({
      success: false,
      error: expect.any(String),
    });
  });

  test('fails visit-history and tenaga-medis routes safely when no ePuskesmas tab is active', async () => {
    const extensionId = await getExtensionId(context);
    const { page, pageErrors } = await openExtensionPage(context, extensionId, 'sidepanel.html');

    const scanVisitHistory = await sendRuntimeMessage<unknown>(page, {
      type: 'scanVisitHistory',
      timestamp: Date.now(),
    });
    const resolveTenagaMedis = await sendRuntimeMessage<unknown>(page, {
      type: 'resolveTenagaMedis',
      timestamp: Date.now(),
    });

    const visitHistoryPayload = unwrapMessagingResponse<{
      success: boolean;
      error?: string;
      diagnostics?: string[];
      visits?: unknown[];
    }>(scanVisitHistory.response);

    const tenagaMedisPayload = unwrapMessagingResponse<{
      success: boolean;
      error?: string;
      tenagaMedis?: unknown;
    }>(resolveTenagaMedis.response);

    expect(pageErrors).toEqual([]);
    expect(scanVisitHistory.lastError).toBeNull();
    expect(resolveTenagaMedis.lastError).toBeNull();
    expect(visitHistoryPayload).toMatchObject({
      success: false,
      error: expect.any(String),
    });
    expect(Array.isArray(visitHistoryPayload.diagnostics)).toBe(true);
    expect(tenagaMedisPayload).toMatchObject({
      success: false,
      error: expect.any(String),
    });
  });

  test('fails transferRME safely when no ePuskesmas tab is active', async () => {
    const extensionId = await getExtensionId(context);
    const { page, pageErrors } = await openExtensionPage(context, extensionId, 'sidepanel.html');

    const transferResponse = await sendRuntimeMessage<unknown>(page, {
      type: 'transferRME',
      timestamp: Date.now(),
      data: {
        anamnesa: {
          keluhan_utama: 'Demam',
          keluhan_tambahan: '',
          lama_sakit: { thn: 0, bln: 0, hr: 1 },
          riwayat_penyakit: null,
          alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
        },
      },
    });

    const transferPayload = unwrapMessagingResponse<{
      state: string;
      reasonCodes: string[];
      steps?: Record<string, { state: string; reasonCode?: string }>;
    }>(transferResponse.response);

    expect(pageErrors).toEqual([]);
    expect(transferResponse.lastError).toBeNull();
    expect(transferPayload.state).toBe('failed');
    expect(transferPayload.reasonCodes.length).toBeGreaterThan(0);
  });
});
