import fs from 'fs';
import path from 'path';

import { defineConfig } from '@playwright/test';

const EXTENSION_PATH = path.resolve(__dirname, '.output/chrome-mv3-dev');
const AUTH_FILE = path.resolve(__dirname, 'tests/e2e/auth.json');

const storageState = fs.existsSync(AUTH_FILE) ? AUTH_FILE : undefined;

/**
 * Extension e2e must use Playwright Chromium (`channel: 'chromium'`).
 * Branded Chrome 137+ ignores `--load-extension`. Specs call
 * `launchExtensionContext()` from `tests/e2e/chrome-extension-launch.ts`.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  reporter: 'list',
  use: {
    headless: false,
    viewport: { width: 1280, height: 800 },
    storageState,
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'med-assist-e2e',
      use: {
        browserName: 'chromium',
        launchOptions: {
          channel: 'chromium',
          headless: false,
          args: [
            `--load-extension=${EXTENSION_PATH}`,
            `--disable-extensions-except=${EXTENSION_PATH}`,
            '--no-first-run',
          ],
        },
      },
    },
  ],
});
