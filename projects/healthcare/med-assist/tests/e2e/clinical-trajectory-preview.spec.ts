import fs from 'fs';
import os from 'os';
import path from 'path';
import { chromium, expect, test, type BrowserContext, type Page } from '@playwright/test';

const OUTPUT_CANDIDATES = [
  path.resolve(__dirname, '../../.output/chrome-mv3'),
  path.resolve(__dirname, '../../.output/chrome-mv3-dev'),
];

const EXTENSION_PATH =
  OUTPUT_CANDIDATES.find((candidate) => fs.existsSync(candidate)) || OUTPUT_CANDIDATES[0];

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

const FORBIDDEN_PATTERNS = [
  /\bdeath\b/i,
  /\bcritical trajectory\b/i,
  /\bDRIFTING\b/i,
  /\bineffective\b/i,
  /\bacute peak\b/i,
];

async function launchExtensionContext(): Promise<BrowserContext> {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentra-clinical-preview-'));
  return await chromium.launchPersistentContext(userDataDir, {
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
  const immediateWorker = context.serviceWorkers()[0];
  if (immediateWorker) {
    return new URL(immediateWorker.url()).host;
  }

  try {
    const worker = await context.waitForEvent('serviceworker', { timeout: 15_000 });
    return new URL(worker.url()).host;
  } catch {
    // Fall through to polling for browsers that register the worker slightly earlier/later.
  }

  const deadline = Date.now() + 15_000;

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
  pageName: string,
  search: string,
  viewport: { width: number; height: number }
): Promise<{ page: Page; pageErrors: string[]; consoleErrors: string[] }> {
  const page = await context.newPage();
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await page.setViewportSize(viewport);
  await page.goto(`chrome-extension://${extensionId}/${pageName}${search}`);
  await page.waitForLoadState('domcontentloaded');

  await expect
    .poll(async () => {
      return page.locator('#root').evaluate((element) => element.childElementCount);
    })
    .toBeGreaterThan(0);

  await expect(page.getByTestId('clinical-trajectory-preview-header')).toBeVisible();

  return { page, pageErrors, consoleErrors };
}

async function expectSafeClinicalTrajectoryPage(
  page: Page,
  pageErrors: string[],
  consoleErrors: string[]
): Promise<void> {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  const bodyText = await page.locator('body').innerText();

  expect(hasOverflow).toBe(false);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(bodyText))).toEqual([]);
}

test.describe.serial('ClinicalTrajectory preview harness', () => {
  test.describe.configure({ timeout: 120_000 });

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

  test('desktop: V2 remains active even when legacy query flags are OFF', async () => {
    const extensionId = await getExtensionId(context);
    const { page, pageErrors, consoleErrors } = await openExtensionPage(
      context,
      extensionId,
      'clinical-trajectory-preview.html',
      '?case=stable&hybrid=0&visualization=0&v2=0',
      { width: 1440, height: 1800 }
    );

    await expect(page.getByText('Clinical Trajectory Preview Harness')).toBeVisible();
    await expect(page.getByTestId('clinical-trajectory-v2')).toBeVisible();
    await expect(page.getByTestId('compact-trajectory-mini-chart')).toBeVisible();
    await expect(page.getByTestId('trajectory-visualization-panel')).toHaveCount(0);

    await expectSafeClinicalTrajectoryPage(page, pageErrors, consoleErrors);
  });

  test('desktop + mobile: V2 flag ON renders physician-safe V2 layout and handles partial data', async () => {
    const extensionId = await getExtensionId(context);

    const desktop = await openExtensionPage(
      context,
      extensionId,
      'clinical-trajectory-preview.html',
      '?case=worsening&hybrid=1&visualization=0&v2=1',
      { width: 1440, height: 1800 }
    );

    await expect(desktop.page.getByTestId('clinical-trajectory-v2')).toBeVisible();
    const desktopHeader = desktop.page.getByTestId('clinical-trajectory-v2-header');
    await expect(desktopHeader).toContainText('First Glance Clinical Status');
    await expect(desktopHeader).toContainText('Pola kondisi');
    await expect(desktopHeader).toContainText('Prioritas review');
    await expect(desktopHeader).toContainText('Perhatian utama');
    await expect(desktopHeader).toContainText('Makna klinis');
    const desktopSafetyNotes = desktop.page.getByTestId('clinical-safety-notes');
    await expect(desktop.page.getByText('Trajectory Coverage Strip')).toBeVisible();
    await expect(
      desktop.page.getByTestId('compact-trajectory-evidence-strip')
    ).toBeVisible();
    await expect(desktop.page.getByRole('tab', { name: 'Trajectory' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(desktop.page.getByRole('tab', { name: 'Vital' })).toBeVisible();
    await expect(desktop.page.getByRole('tab', { name: 'Driver' })).toBeVisible();
    await expect(desktop.page.getByRole('tab', { name: 'Mortality' })).toBeVisible();
    await expect(desktop.page.getByRole('tab', { name: 'Critical Time' })).toBeVisible();
    await expect(desktop.page.getByTestId('compact-trajectory-mini-chart')).toBeVisible();
    await expect(desktop.page.getByText('Grafik trajectory compact')).toBeVisible();
    await expect(desktopSafetyNotes.getByText('Perhatian klinis', { exact: true })).toBeVisible();
    await expect(desktop.page.getByText('Data terbatas')).toHaveCount(0);
    await expect(desktop.page.getByText('Kualitas data')).toHaveCount(0);
    await expect(desktop.page.getByText('Driver Klinis Utama')).toHaveCount(0);
    await expect(desktop.page.getByText('Catatan Keselamatan')).toBeVisible();
    await expect(desktop.page.getByText('Trajectory Evidence Map')).toBeVisible();
    await expect(
      desktop.page.getByRole('button', { name: 'Buka review trajectory lengkap' })
    ).toBeVisible();
    await expect(desktop.page.getByTestId('trajectory-visualization-panel')).toHaveCount(0);
    await expect(desktop.page.getByText('Trajectory Antar Kunjungan')).toHaveCount(0);
    await expect(desktop.page.getByText('Tren Vital Prioritas')).toHaveCount(0);
    await expect(desktop.page.getByText('Faktor Pendorong Trajectory')).toHaveCount(0);
    await expect(desktop.page.getByText('Baseline Personal vs Kondisi Saat Ini')).toHaveCount(0);
    await desktop.page.getByRole('tab', { name: 'Vital' }).click();
    await expect(desktop.page.getByRole('tab', { name: 'Vital' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(desktop.page.getByText('Tren Vital Prioritas')).toBeVisible();
    await expect(desktop.page.getByText('Data yang perlu diperiksa')).toHaveCount(0);
    await desktop.page.getByRole('tab', { name: 'Driver' }).click();
    await expect(desktop.page.getByRole('tab', { name: 'Driver' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(desktop.page.getByText('Faktor Pendorong Trajectory')).toBeVisible();
    await desktop.page.getByRole('tab', { name: 'Mortality' }).click();
    await expect(desktop.page.getByText('Mortality proxy')).toBeVisible();
    await desktop.page.getByRole('tab', { name: 'Critical Time' }).click();
    await expect(desktop.page.getByText('Time to critical')).toBeVisible();
    await expectSafeClinicalTrajectoryPage(
      desktop.page,
      desktop.pageErrors,
      desktop.consoleErrors
    );

    const mobile = await openExtensionPage(
      context,
      extensionId,
      'clinical-trajectory-preview.html',
      '?case=partial&hybrid=1&visualization=0&v2=1',
      { width: 390, height: 844 }
    );

    await expect(mobile.page.getByTestId('clinical-trajectory-v2')).toBeVisible();
    const mobileHeader = mobile.page.getByTestId('clinical-trajectory-v2-header');
    await expect(mobileHeader).toContainText('Makna klinis');
    await expect(mobileHeader).not.toContainText('Kualitas data');
    await expect(mobile.page.getByText('Data terbatas')).toHaveCount(0);
    await expect(mobile.page.getByTestId('compact-trajectory-evidence-strip')).toBeVisible();
    await expect(mobile.page.getByTestId('compact-trajectory-mini-chart')).toBeVisible();
    await expect(mobile.page.getByText('Grafik trajectory compact')).toBeVisible();
    await expect(mobile.page.getByRole('tab', { name: 'Trajectory' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(mobile.page.getByRole('tab', { name: 'Baseline' })).toHaveCount(0);
    await expect(mobile.page.getByText(/baseline personal belum cukup/i)).toHaveCount(0);
    await expect(mobile.page.getByTestId('trajectory-visualization-panel')).toHaveCount(0);
    await expect(mobile.page.getByText('Trajectory Antar Kunjungan')).toHaveCount(0);
    await expect(mobile.page.getByText('Tren Vital Prioritas')).toHaveCount(0);
    await expect(mobile.page.getByText('0 bpm')).toHaveCount(0);
    await expect(mobile.page.getByText('0 °C')).toHaveCount(0);
    await expectSafeClinicalTrajectoryPage(
      mobile.page,
      mobile.pageErrors,
      mobile.consoleErrors
    );
  });
});
