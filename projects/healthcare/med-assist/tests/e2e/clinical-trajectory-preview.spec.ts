import path from 'path';

import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import {
  getExtensionId,
  launchExtensionContext,
  resolveExtensionPath,
} from './chrome-extension-launch';

const OUTPUT_CANDIDATES = [
  path.resolve(__dirname, '../../.output/chrome-mv3'),
  path.resolve(__dirname, '../../.output/chrome-mv3-dev'),
];

const EXTENSION_PATH = resolveExtensionPath(OUTPUT_CANDIDATES);

const FORBIDDEN_PATTERNS = [
  /\bdeath\b/i,
  /\bcritical trajectory\b/i,
  /\bDRIFTING\b/i,
  /\bineffective\b/i,
  /\bacute peak\b/i,
];

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
    context = await launchExtensionContext({ extensionPath: EXTENSION_PATH });
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
    // V2 authority keeps the compact legacy mini-chart unmounted even when ?v2=0.
    await expect(page.getByTestId('compact-trajectory-mini-chart')).toHaveCount(0);
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
    await expect(desktop.page.getByTestId('clinical-reasoning-workbench')).toBeVisible();
    await expect(desktop.page.getByTestId('clinical-trajectory-v2-header')).toContainText(
      /Trajectory suggests/i
    );
    await expect(desktop.page.getByTestId('clinical-trajectory-status-strip')).toBeVisible();
    await expect(desktop.page.getByRole('button', { name: 'Review details' })).toBeVisible();
    await expect(desktop.page.getByTestId('compact-trajectory-mini-chart')).toHaveCount(0);
    await expect(desktop.page.getByText('First Glance Clinical Status')).toHaveCount(0);
    await expect(desktop.page.getByText('Catatan Keselamatan')).toHaveCount(0);
    await expect(desktop.page.getByTestId('trajectory-visualization-panel')).toHaveCount(0);
    await expectSafeClinicalTrajectoryPage(desktop.page, desktop.pageErrors, desktop.consoleErrors);

    const mobile = await openExtensionPage(
      context,
      extensionId,
      'clinical-trajectory-preview.html',
      '?case=partial&hybrid=1&visualization=0&v2=1',
      { width: 390, height: 844 }
    );

    await expect(mobile.page.getByTestId('clinical-trajectory-v2')).toBeVisible();
    await expect(mobile.page.getByTestId('clinical-trajectory-v2-header')).toBeVisible();
    await expect(mobile.page.getByText('First Glance Clinical Status')).toHaveCount(0);
    await expect(mobile.page.getByTestId('compact-trajectory-mini-chart')).toHaveCount(0);
    await expect(mobile.page.getByTestId('trajectory-visualization-panel')).toHaveCount(0);
    await expectSafeClinicalTrajectoryPage(mobile.page, mobile.pageErrors, mobile.consoleErrors);
  });
});
