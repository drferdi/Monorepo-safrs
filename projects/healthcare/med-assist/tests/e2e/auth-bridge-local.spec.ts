import path from 'path';

import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { startMockCrewServer, type MockCrewServer } from '../mock-crew-server';
import {
  getExtensionId,
  launchExtensionContext,
} from './chrome-extension-launch';

type ChromeRuntimeApi = {
  runtime: {
    getManifest(): {
      manifest_version: number;
    };
  };
  storage: {
    local: {
      set(items: Record<string, unknown>, callback: () => void): void;
      get(
        keys: string | string[] | Record<string, unknown> | null,
        callback: (items: Record<string, unknown>) => void
      ): void;
      clear(callback: () => void): void;
    };
    session: {
      get(
        keys: string | string[] | Record<string, unknown> | null,
        callback: (items: Record<string, unknown>) => void
      ): void;
      clear(callback: () => void): void;
    };
  };
};

const EXTENSION_PATH = path.resolve(__dirname, '../../.output/chrome-mv3-dev');

async function openExtensionPage(
  context: BrowserContext,
  extensionId: string,
  pageName: 'login.html' | 'sidepanel.html'
): Promise<Page> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const page = await context.newPage();
    try {
      await page.goto(`chrome-extension://${extensionId}/${pageName}`);
      await page.waitForLoadState('domcontentloaded');
      await expect
        .poll(async () => {
          return page.locator('#root').evaluate((element) => element.childElementCount);
        })
        .toBeGreaterThan(0);
      return page;
    } catch (error) {
      lastError = error;
      await page.close().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to open extension page.');
}

async function clearExtensionStorage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const chromeApi = (window as unknown as { chrome: ChromeRuntimeApi }).chrome;
    await new Promise<void>((resolve) => chromeApi.storage.local.clear(resolve));
    await new Promise<void>((resolve) => chromeApi.storage.session.clear(resolve));
  });
}

async function setAuthConfig(
  page: Page,
  config: { baseUrl: string; automationToken: string }
): Promise<void> {
  await page.evaluate(async (value) => {
    const chromeApi = (window as unknown as { chrome: ChromeRuntimeApi }).chrome;
    await new Promise<void>((resolve) =>
      chromeApi.storage.local.set({ 'sentra:auth-config': value }, resolve)
    );
  }, config);
}

test.describe.serial('Sentra Assist auth + bridge local mock', () => {
  test.describe.configure({ timeout: 90_000 });
  let context: BrowserContext;
  let server: MockCrewServer;

  test.beforeAll(async () => {
    context = await launchExtensionContext({ extensionPath: EXTENSION_PATH });
    server = await startMockCrewServer();
  });

  test.afterAll(async () => {
    await context?.close();
    await server?.close();
  });

  test.beforeEach(async () => {
    const extensionId = await getExtensionId(context);
    const page = await openExtensionPage(context, extensionId, 'login.html');
    await clearExtensionStorage(page);
    await page.close();
    server.clearRequests();
  });

  test.afterEach(async () => {
    await context.unrouteAll({ behavior: 'ignoreErrors' });
    const pages = context.pages();
    for (const page of pages) {
      if (page.url() === 'about:blank') continue;
      await page.close().catch(() => undefined);
    }
  });

  test('login.html completes login and logout against local Crew auth server', async () => {
    const extensionId = await getExtensionId(context);
    const page = await openExtensionPage(context, extensionId, 'login.html');

    await setAuthConfig(page, { baseUrl: server.baseUrl, automationToken: '' });

    await page.getByPlaceholder('USERNAME').fill('drferdi');
    await page.getByPlaceholder('PASSWORD').fill('secret-crew');
    await page.getByPlaceholder('PASSWORD').press('Enter');

    await expect(page.getByText('dr. Ferdi Iskandar • Puskesmas Balowerti')).toBeVisible();
    expect(server.requests.some((request) => request.path === '/api/auth/login')).toBe(true);

    // ACARS presence: the heartbeat carries the session cookie (logout's offline call: unit test).
    const presenceWithCookie = (method: string) =>
      server.requests.some(
        (request) =>
          request.path === '/api/presence' &&
          request.method === method &&
          String(request.headers.cookie ?? '').includes('crew_session=active')
      );
    await expect.poll(() => presenceWithCookie('POST')).toBe(true);

    await page.getByRole('button', { name: /Logout System/i }).click();
    await expect(page.getByPlaceholder('USERNAME')).toBeVisible();
    await expect(page.getByPlaceholder('PASSWORD')).toBeVisible();
  });

  test('sidepanel launches into the V2 clinical workbench after local Crew login', async () => {
    const extensionId = await getExtensionId(context);
    const loginPage = await openExtensionPage(context, extensionId, 'login.html');

    await setAuthConfig(loginPage, {
      baseUrl: server.baseUrl,
      automationToken: 'local-automation-token',
    });
    await loginPage.getByPlaceholder('USERNAME').fill('drferdi');
    await loginPage.getByPlaceholder('PASSWORD').fill('secret-crew');
    await loginPage.getByPlaceholder('PASSWORD').press('Enter');
    await expect(loginPage.getByText('dr. Ferdi Iskandar • Puskesmas Balowerti')).toBeVisible();
    await loginPage.close();

    const page = await openExtensionPage(context, extensionId, 'sidepanel.html');
    await expect(page.getByRole('button', { name: /Masuk ke ASSIST/i })).toBeVisible();
    await page.getByRole('button', { name: /Masuk ke ASSIST/i }).click();

    // Current sidepanel authority mounts the clinical console (START tab),
    // not the legacy INFEREN tab label from ApprovedSentraAssistPanel.
    await expect(page.getByRole('tab', { name: /^START$/i })).toBeVisible();
    await expect(page.getByText(/Gejala\s*\/\s*Keluhan/i)).toBeVisible();
    await expect(page.getByText(/Vital Signs/i)).toBeVisible();
    await expect(page.getByRole('tabpanel', { name: /^START$/i })).toBeVisible();
    await expect(page.getByText('ERROR DIAGNOSTICS')).toHaveCount(0);
    await expect(page.locator('pre')).toHaveCount(0);
  });
});
