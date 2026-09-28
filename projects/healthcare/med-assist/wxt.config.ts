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
      'identity',
      'scripting',
      'alarms',
      'offscreen',
      'nativeMessaging',
    ],
    host_permissions: [
      'https://*.googleapis.com/*',
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
    oauth2: {
      client_id: '822368940562-qis7fdf5ivccgeov04o75rtrf7ghc7u4.apps.googleusercontent.com',
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    },
    web_accessible_resources: [
      {
        resources: ['icon/*', 'assets/*', 'assets/sounds/*', 'data/*'],
        matches: ['<all_urls>'],
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
  }),
});
