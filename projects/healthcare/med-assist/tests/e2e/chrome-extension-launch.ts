// Designed and constructed by Drferdi.
/**
 * Shared Playwright launch helpers for MV3 extension e2e.
 *
 * Branded Google Chrome 137+ ignores `--load-extension`, and this machine has Google Chrome
 * rather than Playwright's bundled Chromium. The unpacked build is loaded through the DevTools
 * protocol instead (`Extensions.loadUnpacked`, allowed by `--enable-unsafe-extension-debugging`);
 * Playwright's default `--disable-extensions` is dropped so the loaded extension can run.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { chromium, type BrowserContext } from '@playwright/test';

export const DEFAULT_EXTENSION_PATH = path.resolve(__dirname, '../../.output/chrome-mv3-dev');

export function resolveExtensionPath(candidates: string[] = [DEFAULT_EXTENSION_PATH]): string {
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(
      `Extension build not found. Tried: ${candidates.join(', ')}. Run \`pnpm run build\` first.`
    );
  }
  return found;
}

export type LaunchExtensionOptions = {
  extensionPath?: string;
  userDataDir?: string;
  extraArgs?: string[];
};

export async function launchExtensionContext(
  options: LaunchExtensionOptions = {}
): Promise<BrowserContext> {
  const extensionPath = options.extensionPath ?? resolveExtensionPath();
  const userDataDir =
    options.userDataDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'med-assist-e2e-'));

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chrome',
    headless: false,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      '--enable-unsafe-extension-debugging',
      '--no-first-run',
      '--no-default-browser-check',
      ...(options.extraArgs ?? []),
    ],
  });
  const browser = context.browser();
  if (!browser) {
    throw new Error('Chrome launched without a browser handle; cannot load the extension.');
  }
  const session = await browser.newBrowserCDPSession();
  await session.send('Extensions.loadUnpacked', { path: extensionPath });
  return context;
}

export async function getExtensionId(
  context: BrowserContext,
  timeoutMs = 30_000
): Promise<string> {
  const existing = context.serviceWorkers()[0];
  if (existing) {
    return new URL(existing.url()).host;
  }

  try {
    const worker = await context.waitForEvent('serviceworker', { timeout: timeoutMs });
    return new URL(worker.url()).host;
  } catch {
    throw new Error(`Extension service worker did not appear within ${timeoutMs} ms.`);
  }
}
