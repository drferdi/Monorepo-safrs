"use strict";

const { app, BrowserWindow, dialog, Menu, ipcMain, shell } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const net = require("net");
const fs = require("fs");

// ── Constants ──────────────────────────────────────────────────────────────
const IS_DEV   = !app.isPackaged;
const PYTHON_PORT = 5001;
const API_PORT    = 3001;

// ── Resource paths ─────────────────────────────────────────────────────────
// Dev:  run from project root via `electron electron-app/`
// Prod: resources are unpacked next to the executable via extraResources
function res(...parts) {
  if (IS_DEV) return path.join(__dirname, "..", ...parts);
  return path.join(process.resourcesPath, ...parts);
}

const PYTHON_SCRIPT = IS_DEV
  ? res("sidelab-engine", "api.py")
  : res("engine", "api.py");

const API_ENTRY = IS_DEV
  ? res("artifacts", "api-server", "dist", "index.mjs")
  : res("api", "index.mjs");

const STATIC_DIR = IS_DEV
  ? res("artifacts", "stride-dashboard", "dist", "public")
  : res("ui");

// ── Child processes ────────────────────────────────────────────────────────
let pythonProc = null;
let apiProc    = null;

function spawnPython() {
  const exe = process.platform === "win32" ? "python" : "python3";
  pythonProc = spawn(exe, [PYTHON_SCRIPT], {
    env: {
      ...process.env,
      PORT: String(PYTHON_PORT),
      PYTHONUNBUFFERED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  pythonProc.stdout.on("data", (d) => process.stdout.write(`[Engine] ${d}`));
  pythonProc.stderr.on("data", (d) => process.stderr.write(`[Engine] ${d}`));
  pythonProc.on("exit", (code) => console.log(`[Engine] exited (${code})`));
}

function spawnApi() {
  apiProc = spawn("node", [API_ENTRY], {
    env: {
      ...process.env,
      PORT: String(API_PORT),
      NODE_ENV: "production",
      CDSS_ENGINE_URL: `http://127.0.0.1:${PYTHON_PORT}`,
      STATIC_DIR,
      LOG_LEVEL: "warn",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  apiProc.stdout.on("data", (d) => process.stdout.write(`[API] ${d}`));
  apiProc.stderr.on("data", (d) => process.stderr.write(`[API] ${d}`));
  apiProc.on("exit", (code) => console.log(`[API] exited (${code})`));
}

// Poll a TCP port until it accepts a connection (or timeout)
function waitForPort(port, timeoutMs = 40000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    function attempt() {
      const sock = new net.Socket();
      sock.setTimeout(800);
      sock
        .on("connect", () => { sock.destroy(); resolve(); })
        .on("error", retry)
        .on("timeout", retry);
      sock.connect(port, "127.0.0.1");
      function retry() {
        sock.destroy();
        if (Date.now() > deadline) {
          reject(new Error(`Port ${port} not ready after ${timeoutMs} ms`));
        } else {
          setTimeout(attempt, 600);
        }
      }
    }
    attempt();
  });
}

function killBackends() {
  if (pythonProc) { try { pythonProc.kill(); } catch (_) {} pythonProc = null; }
  if (apiProc)    { try { apiProc.kill();    } catch (_) {} apiProc    = null; }
}

// ── Window ─────────────────────────────────────────────────────────────────
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:     1440,
    height:    900,
    minWidth:  1100,
    minHeight: 720,
    title:     "CDSS FKTP — Sidelab",
    backgroundColor: "#131311",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // Allow loading from localhost (needed for SSE streaming)
      webSecurity: true,
    },
  });

  // Remove default menu in production
  if (!IS_DEV) Menu.setApplicationMenu(null);

  mainWindow.loadURL(`http://127.0.0.1:${API_PORT}`);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (IS_DEV) mainWindow.webContents.openDevTools({ mode: "detach" });
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

// ── Splash window ──────────────────────────────────────────────────────────
let splashWindow = null;

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 220,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    backgroundColor: "#131311",
    webPreferences: { contextIsolation: true },
  });
  splashWindow.loadURL(
    "data:text/html," +
    encodeURIComponent(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/>
<style>
  * { margin:0;padding:0;box-sizing:border-box }
  body {
    background:#131311;border-radius:20px;overflow:hidden;
    display:flex;flex-direction:column;align-items:center;
    justify-content:center;height:100vh;color:#e0e0de;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  }
  .logo { font-size:28px;font-weight:700;letter-spacing:-0.5px;color:#fff;margin-bottom:8px }
  .sub  { font-size:13px;color:#555;margin-bottom:32px }
  .bar  { width:240px;height:3px;background:#222;border-radius:2px;overflow:hidden }
  .fill { height:100%;background:linear-gradient(90deg,#3a7a3a,#5ea65e);
          animation:load 2s ease-in-out infinite;border-radius:2px }
  @keyframes load { 0%{width:0%} 60%{width:80%} 100%{width:100%} }
  .hint { margin-top:14px;font-size:11px;color:#333 }
</style>
</head>
<body>
  <div class="logo">Sidelab CDSS</div>
  <div class="sub">FKTP Edition — dr Ferdi Iskandar</div>
  <div class="bar"><div class="fill"></div></div>
  <div class="hint">Memulai engine klinis…</div>
</body>
</html>`)
  );
}

function closeSplash() {
  if (splashWindow) { splashWindow.close(); splashWindow = null; }
}

// ── IPC handlers (desktop file save) ───────────────────────────────────────
ipcMain.handle("cdss:save-session", async (_event, content) => {
  try {
    const docsPath = app.getPath("documents");
    const sessionDir = path.join(docsPath, "Sidelab");
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = path.join(sessionDir, `sidelab_${ts}.txt`);
    fs.writeFileSync(filename, String(content), "utf-8");
    return { success: true, path: filename };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("cdss:open-sessions", async () => {
  const docsPath = app.getPath("documents");
  const sessionDir = path.join(docsPath, "Sidelab");
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
  shell.openPath(sessionDir);
});

// ── App lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  createSplash();

  try {
    spawnPython();
    spawnApi();

    console.log("Waiting for CDSS engine and API server…");
    await Promise.all([
      waitForPort(PYTHON_PORT),
      waitForPort(API_PORT),
    ]);
    console.log("Both backends ready.");

    closeSplash();
    createWindow();
  } catch (err) {
    closeSplash();
    killBackends();
    dialog.showErrorBox(
      "Gagal Memulai",
      `Tidak dapat memulai backend server:\n\n${err.message}\n\n` +
      "Pastikan Python 3 dan dependensi sidelab sudah terinstall.\n" +
      "Lihat README.md untuk panduan instalasi."
    );
    app.quit();
  }
});

app.on("window-all-closed", () => {
  killBackends();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null && !splashWindow) createWindow();
});

app.on("before-quit", killBackends);

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
