/* eslint-disable @typescript-eslint/no-require-imports, no-undef, no-console, no-empty */
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const EXTENSION_PATH = path.resolve(__dirname, '../../.output/chrome-mv3-dev');
const LOCAL_BROWSER_CANDIDATES = [
  'C:/Users/drfer/AppData/Local/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];

const executablePath = LOCAL_BROWSER_CANDIDATES.find((candidate) => fs.existsSync(candidate));

async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function startMockServer() {
  const http = require('http');
  const requests = [];

  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const bodyText = Buffer.concat(chunks).toString('utf8');
    let jsonBody = null;
    try {
      jsonBody = bodyText ? JSON.parse(bodyText) : null;
    } catch {}

    requests.push({
      path: req.url,
      method: req.method,
      headers: req.headers,
      jsonBody,
    });

    const send = (status, payload) => {
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      });
      res.end(JSON.stringify(payload));
    };

    if (req.method === 'OPTIONS') return send(200, { ok: true });

    if (req.url === '/api/auth/login' && req.method === 'POST') {
      return send(200, {
        ok: true,
        user: {
          username: 'drferdi',
          displayName: 'dr. Ferdi Iskandar',
          role: 'doctor',
          institution: 'Puskesmas Balowerti',
          profession: 'Dokter',
        },
        expiresAt: Date.now() + 60 * 60 * 1000,
      });
    }

    if (req.url === '/api/auth/logout' && req.method === 'POST') {
      return send(200, { ok: true });
    }

    if (req.url === '/api/auth/session' && req.method === 'GET') {
      return send(200, {
        ok: true,
        user: {
          username: 'drferdi',
          displayName: 'dr. Ferdi Iskandar',
          role: 'doctor',
          institution: 'Puskesmas Balowerti',
          profession: 'Dokter',
        },
        expiresAt: Date.now() + 60 * 60 * 1000,
      });
    }

    return send(404, { ok: false, error: 'not found' });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  return {
    server,
    requests,
    baseUrl: `http://localhost:${port}`,
    async close() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

async function getExtensionId(context) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const worker = context.serviceWorkers()[0];
    if (worker) {
      return new URL(worker.url()).host;
    }
    await delay(300);
  }
  throw new Error('Extension service worker did not appear within 15 seconds.');
}

async function openExtensionPage(context, extensionId, pageName) {
  let lastError;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const page = await context.newPage();
    try {
      await page.goto(`chrome-extension://${extensionId}/${pageName}`);
      await page.waitForLoadState('domcontentloaded');
      await page.locator('#root').waitFor({ state: 'attached', timeout: 10_000 });
      return page;
    } catch (error) {
      lastError = error;
      await page.close().catch(() => undefined);
      await delay(500);
    }
  }

  throw lastError || new Error('Failed to open extension page.');
}

async function clearExtensionStorage(page) {
  await page.evaluate(async () => {
    const chromeApi = window.chrome;
    await new Promise((resolve) => chromeApi.storage.local.clear(resolve));
    await new Promise((resolve) => chromeApi.storage.session.clear(resolve));
  });
}

async function setAuthConfig(page, config) {
  await page.evaluate(async (value) => {
    const chromeApi = window.chrome;
    await new Promise((resolve) =>
      chromeApi.storage.local.set({ 'sentra:auth-config': value }, resolve)
    );
  }, config);
}

async function waitForDashboard(page) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const hasLogout = await page
      .getByRole('button', { name: /Logout System/i })
      .isVisible()
      .catch(() => false);
    if (hasLogout) {
      return;
    }
    await delay(250);
  }
  throw new Error('Dashboard did not appear before timeout.');
}

async function waitForLoginForm(page) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const loginVisible = await page
      .getByPlaceholder('USERNAME')
      .isVisible()
      .catch(() => false);
    if (loginVisible) {
      return;
    }
    await delay(250);
  }
  throw new Error('Login form did not reappear before timeout.');
}

async function main() {
  const mock = await startMockServer();
  const context = await chromium.launchPersistentContext('', {
    ...(executablePath ? { executablePath } : {}),
    headless: false,
    args: [
      `--load-extension=${EXTENSION_PATH}`,
      `--disable-extensions-except=${EXTENSION_PATH}`,
      '--no-first-run',
    ],
  });

  try {
    const extensionId = await getExtensionId(context);

    const bootstrapPage = await openExtensionPage(context, extensionId, 'login.html');
    await clearExtensionStorage(bootstrapPage);
    await bootstrapPage.close();

    const loginPage = await openExtensionPage(context, extensionId, 'login.html');
    await setAuthConfig(loginPage, { baseUrl: mock.baseUrl, automationToken: '' });
    await loginPage.getByPlaceholder('USERNAME').fill('drferdi');
    await loginPage.getByPlaceholder('PASSWORD').fill('secret-crew');
    await loginPage.getByPlaceholder('PASSWORD').press('Enter');
    await waitForDashboard(loginPage);
    await loginPage.close();

    const reopenedPage = await openExtensionPage(context, extensionId, 'login.html');
    await waitForDashboard(reopenedPage);

    const snapshot = await reopenedPage.evaluate(async () => {
      const chromeApi = window.chrome;
      const local = await new Promise((resolve) => chromeApi.storage.local.get(null, resolve));
      const session = await new Promise((resolve) => chromeApi.storage.session.get(null, resolve));
      return {
        local,
        session,
        text: document.body.innerText,
      };
    });

    await reopenedPage.getByRole('button', { name: /Logout System/i }).click();
    await waitForLoginForm(reopenedPage);

    console.log(
      JSON.stringify(
        {
          ok: true,
          extensionId,
          loginRequestSeen: mock.requests.some((request) => request.path === '/api/auth/login'),
          persistedUsername:
            snapshot.local?.['sentra:persisted-session']?.user?.username ||
            snapshot.session?.['sentra:active-session']?.user?.username ||
            null,
          reopenedText: snapshot.text,
        },
        null,
        2
      )
    );
  } finally {
    await context.close().catch(() => undefined);
    await mock.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
