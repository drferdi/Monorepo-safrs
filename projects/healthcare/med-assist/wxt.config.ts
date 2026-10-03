// Designed and constructed by Drferdi.
import { defineConfig } from 'wxt';

export default defineConfig({
  outDir: '.output',
  outDirTemplate: 'chrome-mv3-dev',
  entrypointsDir: 'entrypoints',
  manifest: {
    name: 'Asisten Medis',
    version_name: 'Prototype 0.7',
    description:
      'Pendamping klinis terintegrasi ePuskesmas. Otomatisasi dokumentasi, triase cepat, dan panduan diagnosis untuk nakes Indonesia.',
    version: '2.1.0',
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      96: 'icon/96.png',
      128: 'icon/128.png',
    },
    permissions: [
      'activeTab',
      'storage',
      'sidePanel',
      'scripting',
      'alarms',
      'offscreen',
      'nativeMessaging',
    ],
    host_permissions: [
      'http://localhost:*/*',
      'http://127.0.0.1:*/*',
      // Required so the extension can act as a WebAuthn client with rpID
      // crew.puskesmasbalowerti.com for passkey login (lib/api/auth-client.ts).
      'https://crew.puskesmasbalowerti.com/*',
      // ePuskesmas RME surfaces (content scripts + tabs.query URL visibility).
      '*://*.epuskesmas.id/*',
    ],
    action: {
      default_title: 'Asisten Medis',
      // Jangan set default_popup: klik ikon harus membuka side panel (sidepanel.html),
      // bukan popup login — itu bundle terpisah sehingga "bypass login" di sidepanel tidak terlihat.
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
        48: 'icon/48.png',
        128: 'icon/128.png',
      },
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; font-src 'self' data:;",
    },
    web_accessible_resources: [
      {
        resources: ['icon/*', 'assets/*', 'assets/sounds/*', 'data/*'],
        // Only the ePuskesmas pages the content scripts run on; any other site could otherwise
        // detect the extension and read the facility's drug stock list.
        matches: ['*://*.epuskesmas.id/*'],
      },
    ],
  },
  modules: ['@wxt-dev/module-react'],
  webExt: {
    disabled: true, // Disable auto-open browser
  },
  vite: () => ({
    build: {
      chunkSizeWarningLimit: 2000,
    },
    envPrefix: ['VITE_', 'SENTRA_'],
    define:
      process.env.NODE_ENV === 'production' && !process.env.SENTRA_DIAGNOSIS_ENGINE
        ? { 'import.meta.env.SENTRA_DIAGNOSIS_ENGINE': JSON.stringify('mira') }
        : {},
  }),
});
