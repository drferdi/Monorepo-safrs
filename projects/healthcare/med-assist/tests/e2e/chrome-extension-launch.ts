// Designed and constructed by Drferdi.
/**
 * Shared Playwright launch helpers for MV3 extension e2e.
 *
 * Branded Google Chrome 137+ ignores `--load-extension`. Use Playwright's
 * bundled Chromium (`channel: 'chromium'`) so unpacked extensions load.
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

  return chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
      '--no-default-browser-check',
      ...(options.extraArgs ?? []),
    ],
  });
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
