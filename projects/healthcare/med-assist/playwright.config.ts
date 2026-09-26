import fs from 'fs';
import path from 'path';

import { defineConfig } from '@playwright/test';

const EXTENSION_PATH = path.resolve(__dirname, '.output/chrome-mv3-dev');
const _TEST_PROFILE = path.resolve(__dirname, 'tests/e2e/.test-profile');
const AUTH_FILE = path.resolve(__dirname, 'tests/e2e/auth.json');
const LOCAL_BROWSER_CANDIDATES = [
  'C:\\Users\\drfer\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

const storageState = fs.existsSync(AUTH_FILE) ? AUTH_FILE : undefined;
const localBrowserExecutable = LOCAL_BROWSER_CANDIDATES.find((candidate) =>
  fs.existsSync(candidate)
);

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
          ...(localBrowserExecutable ? { executablePath: localBrowserExecutable } : {}),
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
