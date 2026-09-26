import fs from 'fs';
import path from 'path';

import { chromium, expect, test, type BrowserContext, type Page } from '@playwright/test';

import { startMockCrewServer, type MockCrewServer } from '../mock-crew-server';

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
const LOCAL_BROWSER_CANDIDATES = [
  'C:\\Users\\drfer\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const localBrowserExecutable = LOCAL_BROWSER_CANDIDATES.find((candidate) =>
  fs.existsSync(candidate)
);

async function launchExtensionContext(): Promise<BrowserContext> {
  return chromium.launchPersistentContext('', {
    ...(localBrowserExecutable ? { executablePath: localBrowserExecutable } : {}),
    headless: false,
    args: [
      `--load-extension=${EXTENSION_PATH}`,
      `--disable-extensions-except=${EXTENSION_PATH}`,
      '--no-first-run',
    ],
  });
}

async function getExtensionId(context: BrowserContext): Promise<string> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const worker = context.serviceWorkers()[0];
    if (worker) {
      return new URL(worker.url()).host;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Extension service worker did not appear within 15 seconds.');
}

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
    context = await launchExtensionContext();
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

    await page.getByRole('button', { name: /Logout System/i }).click();
    await expect(page.getByPlaceholder('USERNAME')).toBeVisible();
    await expect(page.getByPlaceholder('PASSWORD')).toBeVisible();
  });

  test('sidepanel launches into the V2 clinical workbench with local Crew bridge config', async () => {
    const extensionId = await getExtensionId(context);
    const page = await openExtensionPage(context, extensionId, 'sidepanel.html');

    await setAuthConfig(page, {
      baseUrl: server.baseUrl,
      automationToken: 'local-automation-token',
    });

    await expect(page.getByRole('button', { name: 'INFEREN' })).toBeVisible();
    await expect(page.getByText('GEJALA / KELUHAN')).toBeVisible();
    await expect(page.getByTestId('clinical-reasoning-workbench')).toBeVisible();
    await expect(page.getByText('First Glance Clinical Status')).toBeVisible();
    await expect(page.locator('#sidepanel-tabpanel-ttv')).toHaveCount(0);
    await expect(page.getByText('Data dokter online belum tersedia.')).toHaveCount(0);
    await expect(page.getByText('ERROR DIAGNOSTICS')).toHaveCount(0);
    await expect(page.locator('pre')).toHaveCount(0);
  });
});
