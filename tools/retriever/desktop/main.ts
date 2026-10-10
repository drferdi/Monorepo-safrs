import { app, BrowserWindow, ipcMain, screen, shell } from 'electron';
import path from 'node:path';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { PROFILES } from '../src/engine/profiles';
import { buildHttrackArgs, resolveHttrackBinary } from '../src/engine/httrack';
import { convertHtmlFolderToMarkdown } from '../src/engine/markdown';
import { startPreviewServer, stopPreviewServer } from '../src/engine/server';
import type { ScrapeOptions } from '../src/types';

let mainWindow: BrowserWindow | null = null;
let activeProcess: ChildProcessWithoutNullStreams | null = null;

const isSmokeMode =
  process.env.SENTRA_DESKTOP_SMOKE === '1' ||
  process.argv.includes('--smoke') ||
  app.commandLine.hasSwitch('smoke');

const isWindows = process.platform === 'win32';

app.commandLine.appendSwitch('disable-features', 'DirectCompositionVideoOverlays');
app.commandLine.appendSwitch('log-level', '3');

// Sized exactly to Sentra Prompt (80 cols × 20 rows of JetBrains Mono 11px)
const DEFAULT_WIDTH = 556;
const DEFAULT_HEIGHT = 367;

function getInitialPosition() {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenW } = primaryDisplay.workAreaSize;
    return {
      x: Math.max(20, screenW - DEFAULT_WIDTH - 20),
      y: 20
    };
  } catch {
    return { x: 100, y: 100 };
  }
}

function createWindow() {
  const pos = getInitialPosition();

  mainWindow = new BrowserWindow({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    minWidth: DEFAULT_WIDTH,
    minHeight: DEFAULT_HEIGHT,
    x: pos.x,
    y: pos.y,
    resizable: true,
    frame: false,
    transparent: !isWindows,
    backgroundColor: isWindows ? '#16191d' : '#00000000',
    roundedCorners: true,
    show: !isSmokeMode,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.webContents.on('console-message', (_e, level, msg, line, src) => {
    console.log(`[renderer:${level}] ${msg} (${src}:${line})`);
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (isSmokeMode) {
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        app.exit(0);
      }, 300);
    });
  }
}

// Window control handlers - unconditional immediate destroy & exit
ipcMain.on('window:close', () => {
  stopPreviewServer().catch(() => {});
  if (activeProcess) {
    try {
      activeProcess.kill('SIGTERM');
    } catch {}
  }
  if (mainWindow) {
    mainWindow.destroy();
  }
  app.quit();
});

ipcMain.on('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window:zoom', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('window:get-pos', () => {
  return mainWindow ? mainWindow.getPosition() : [0, 0];
});

ipcMain.on('window:set-pos', (_event, payload: any, maybeY?: any) => {
  if (!mainWindow) return;
  let x = 0;
  let y = 0;
  if (typeof payload === 'number' && typeof maybeY === 'number') {
    x = payload;
    y = maybeY;
  } else if (payload && typeof payload.x === 'number') {
    x = payload.x;
    y = payload.y;
  }
  mainWindow.setPosition(Math.round(x), Math.round(y));
});

// System handlers
ipcMain.handle('system:open-folder', async (_event, targetPath: string) => {
  const resolved = path.resolve(targetPath);
  await shell.openPath(resolved);
  return { ok: true, path: resolved };
});

ipcMain.handle('system:open-url', async (_event, targetUrl: string) => {
  await shell.openExternal(targetUrl);
  return { ok: true };
});

ipcMain.handle('harvester:preview', async (_event, targetPath?: string) => {
  try {
    const target = targetPath || './data/scrapes';
    const serverInstance = await startPreviewServer(target);
    await shell.openExternal(serverInstance.url);
    return { ok: true, url: serverInstance.url, rootDir: serverInstance.rootDir };
  } catch (err: any) {
    return { ok: false, message: err.message };
  }
});

// Harvester handlers
ipcMain.handle('harvester:profiles', async () => {
  return PROFILES;
});

ipcMain.handle('harvester:stop', async () => {
  if (activeProcess) {
    try {
      activeProcess.kill('SIGTERM');
    } catch {}
    activeProcess = null;
    return { ok: true, message: 'Harvester process cancelled' };
  }
  return { ok: false, message: 'No active scraper running' };
});

ipcMain.handle('harvester:start', async (_event, payload: ScrapeOptions) => {
  if (activeProcess) {
    return { ok: false, message: 'A scrape job is already active. Stop it first or wait for completion.' };
  }

  const binary = resolveHttrackBinary();
  if (!binary) {
    return { ok: false, message: 'HTTrack binary not found at C:\\Program Files\\WinHTTrack\\httrack.exe' };
  }

  const profile = PROFILES[payload.profile] || PROFILES['tech-docs'];
  const outputDir = path.resolve(
    payload.outputDir || `./data/scrapes/${new URL(payload.url).hostname.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  );
  const options: ScrapeOptions = {
    ...payload,
    outputDir,
    depth: payload.depth || profile.depth
  };

  const args = buildHttrackArgs(options);

  const sendLog = (type: 'info' | 'file' | 'stats' | 'ok' | 'err' | 'head', message: string) => {
    mainWindow?.webContents.send('harvester:log', {
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    });
  };

  sendLog('head', `═ Launching Retriever: ${options.url} ═`);
  sendLog('info', `Profile: ${profile.name} (Depth: ${options.depth})`);
  sendLog('info', `Destination: ${outputDir}`);

  return new Promise((resolve) => {
    const startTime = Date.now();
    let fileCount = 0;

    activeProcess = spawn(binary, args, {
      shell: false,
      windowsHide: true
    });

    activeProcess.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8');
      const lines = text.split(/\r?\n/).filter(Boolean);

      for (const line of lines) {
        if (line.includes('Transferring') || line.includes('File: ') || line.includes('-->')) {
          fileCount++;
          sendLog('file', line.trim());
        } else if (line.includes('bytes') || line.includes('KiB') || line.includes('MiB') || line.includes('sec')) {
          sendLog('stats', line.trim());
        } else if (line.trim().length > 0) {
          sendLog('info', line.trim());
        }
      }
    });

    activeProcess.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8').trim();
      if (text) sendLog('info', text);
    });

    activeProcess.on('close', async (code) => {
      activeProcess = null;
      const duration = Math.round((Date.now() - startTime) / 1000);

      if (code === 0) {
        sendLog('ok', `Scraping completed successfully! (${fileCount} files, ${duration}s)`);
      } else {
        sendLog('err', `Process finished with exit code: ${code}`);
      }

      // Convert downloaded HTML to Markdown corpus
      sendLog('info', 'Generating AI Markdown Corpus...');
      try {
        const mdOut = path.join(outputDir, 'markdown_corpus');
        const mdResult = await convertHtmlFolderToMarkdown(outputDir, mdOut);
        sendLog('ok', `AI Markdown Corpus created: ${mdResult.convertedCount} docs (${mdResult.totalWords} words)`);
      } catch (err: any) {
        sendLog('err', `Markdown warning: ${err.message}`);
      }

      sendLog('head', `═ Complete Offline Mirror Ready at ${outputDir} ═`);

      resolve({
        ok: code === 0,
        filesScraped: fileCount,
        duration,
        outputDir
      });
    });

    activeProcess.on('error', (err) => {
      activeProcess = null;
      sendLog('err', `Engine execution failed: ${err.message}`);
      resolve({ ok: false, message: err.message });
    });
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
