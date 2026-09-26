const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, exec } = require('child_process');
const http = require('http');

const USER_HOME = os.homedir();
const HERMES_HOME = path.join(USER_HOME, '.hermes', 'profiles', 'avery');
const REPO_ROOT = path.resolve(__dirname, '..');
const LOGS_DIR = path.join(HERMES_HOME, 'logs');
const DB_PATH = path.join(HERMES_HOME, 'state.db');
const AVATAR_PATH = process.env.AVERY_AVATAR_PATH || '';
const SCRIPTS_DIR = process.env.AVERY_SCRIPTS_DIR || path.join(USER_HOME, 'Documents', 'scripts');
// --smoke: hidden window, exits 0 once the renderer has loaded (project.contract.json run).
const SMOKE = process.argv.includes('--smoke');

const KNOWN_SCRIPTS = [
  { name: 'Restart Hermes Gateway.bat', label: 'Restart Gateway', tag: 'SYSTEM', desc: 'Restart service dan pembersihan bridge yatim' },
  { name: 'Sentra Cache Cleaner.bat', label: 'Cache Cleaner', tag: 'CLEANUP', desc: 'Pembersihan cache dan berkas sementara' },
  { name: 'SuperClean.bat', label: 'SuperClean Deep', tag: 'MAINTENANCE', desc: 'Pembersihan menyeluruh sistem dan runtime' },
  { name: 'Start-Sentra-Monorepo-Kanban.bat', label: 'Sentra Kanban', tag: 'PROJECT', desc: 'Membuka Sentra Monorepo Kanban Board' },
  { name: 'Start-Github-Regkit.bat', label: 'GitHub Regkit', tag: 'DEV-OPS', desc: 'Launcher otomatis GitHub Regkit' },
  { name: 'Start OmniRoute.bat', label: 'OmniRoute Service', tag: 'NETWORK', desc: 'Menjalankan gateway routing OmniRoute' },
  { name: 'Sentra Prompt.bat', label: 'Sentra Prompt Studio', tag: 'AI-CORE', desc: 'Membuka Master Prompt Studio' },
  { name: 'Paperclip.bat', label: 'Paperclip Assistant', tag: 'UTILITY', desc: 'Membuka asisten Paperclip' },
];
const KNOWN_SCRIPT_NAMES = new Set(KNOWN_SCRIPTS.map((s) => s.name));

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 660,
    height: 540,
    minWidth: 480,
    minHeight: 380,
    x: 24,
    y: 24,
    frame: false,
    show: !SMOKE,
    backgroundColor: '#0D0F14',
    title: 'Avery Sentra — Living Console',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (SMOKE) {
    mainWindow.webContents.once('did-finish-load', () => app.exit(0));
    mainWindow.webContents.once('did-fail-load', () => app.exit(1));
  }
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:state-changed', { isMaximized: true });
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:state-changed', { isMaximized: false });
  });
}

// Window control handlers
ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// System Telemetry Handlers
function checkBridgeHealth() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:3000/health', { timeout: 1500 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ online: true, connected: json.status === 'connected', status: json.status || 'unknown' });
        } catch {
          resolve({ online: true, connected: false, status: 'listening' });
        }
      });
    });
    req.on('error', () => resolve({ online: false, connected: false, status: 'offline' }));
    req.on('timeout', () => { req.destroy(); resolve({ online: false, connected: false, status: 'timeout' }); });
  });
}

function getGatewayPid() {
  const pidFile = path.join(HERMES_HOME, 'gateway.pid');
  if (fs.existsSync(pidFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(pidFile, 'utf8'));
      return data.pid || null;
    } catch {}
  }
  return null;
}

function isProcessRunning(pid) {
  return new Promise((resolve) => {
    if (!pid) return resolve(false);
    exec(`tasklist /FI "PID eq ${pid}" /FO CSV`, (err, stdout) => {
      if (err || !stdout) return resolve(false);
      resolve(stdout.includes(String(pid)));
    });
  });
}

ipcMain.handle('system:getStatus', async () => {
  const gwPid = getGatewayPid();
  const gwRunning = await isProcessRunning(gwPid);
  const bridge = await checkBridgeHealth();

  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];

  return {
    status: 'ok',
    gateway: {
      running: gwRunning,
      pid: gwRunning ? gwPid : null,
      status_text: gwRunning ? 'ONLINE' : 'OFFLINE',
    },
    bridge: {
      online: bridge.online,
      connected: bridge.connected,
      status_text: bridge.connected ? 'CONNECTED' : (bridge.online ? 'STANDBY' : 'OFFLINE'),
    },
    metrics: {
      // Tidak ada pembaca SQLite di konsol ini; null = data tidak tersedia,
      // renderer menampilkan tanda hubung alih-alih angka palsu.
      active_sessions: null,
      max_session_tokens: 0,
    },
    timestamp: timeStr,
  };
});

ipcMain.handle('system:getLogs', async (event, maxLines = 100) => {
  const logFile = path.join(LOGS_DIR, 'gateway.log');
  if (fs.existsSync(logFile)) {
    try {
      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.split(/\r?\n/).filter(Boolean);
      return lines.slice(-maxLines);
    } catch {
      return ['Gagal membaca file log gateway.'];
    }
  }
  return ['Log gateway belum tersedia.'];
});

ipcMain.handle('system:getTraffic', async (event, maxItems = 30) => {
  const logFile = path.join(LOGS_DIR, 'gateway.log');
  const feed = [];
  if (fs.existsSync(logFile)) {
    try {
      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.split(/\r?\n/).filter(Boolean).slice(-180);
      for (const line of lines) {
        if (line.includes('inbound message:')) {
          const m = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}).*?user=(.*?) chat=(.*?) msg='(.*?)'/);
          if (m) {
            feed.push({
              type: 'inbound',
              time: m[1].slice(11),
              user: m[2],
              chat: m[3].split('@')[0],
              msg: m[4] || '[Media / Empty]',
            });
          }
        } else if (line.includes('response ready:')) {
          const m = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}).*?time=([\d\.]+)s.*?response=(\d+) chars/);
          if (m) {
            feed.push({
              type: 'response',
              time: m[1].slice(11),
              latency: `${m[2]}s`,
              chars: `${m[3]} chars`,
              msg: `Avery membalas (${m[3]} karakter dalam ${m[2]}s)`,
            });
          }
        } else if (line.includes('ingress drop reason=MENTION_MISMATCH')) {
          feed.push({
            type: 'ignored',
            time: line.slice(11, 19),
            msg: 'Pesan diabaikan (Tidak menyebut Avery / bukan reply)',
          });
        }
      }
    } catch {}
  }
  return feed.reverse().slice(0, maxItems);
});

ipcMain.handle('system:getScripts', () => {
  return KNOWN_SCRIPTS.map((s) => ({
    ...s,
    exists: fs.existsSync(path.join(SCRIPTS_DIR, s.name)),
  }));
});

ipcMain.handle('system:runScript', (event, scriptName) => {
  // Allowlist ketat: tolak nama tak terdaftar dan path traversal.
  if (
    typeof scriptName !== 'string' ||
    !KNOWN_SCRIPT_NAMES.has(scriptName) ||
    path.basename(scriptName) !== scriptName
  ) {
    return { status: 'error', message: `Script tidak diizinkan: ${scriptName}` };
  }
  const target = path.join(SCRIPTS_DIR, scriptName);
  if (fs.existsSync(target)) {
    exec(`start "" "${target}"`, { cwd: SCRIPTS_DIR });
    return { status: 'ok', message: `Menjalankan: ${scriptName}` };
  }
  return { status: 'error', message: `Script tidak ditemukan: ${scriptName}` };
});

function getBridgePids() {
  return new Promise((resolve) => {
    const ps =
      "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'whatsapp-bridge' } | Select-Object -ExpandProperty ProcessId";
    exec(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"')}"`, (err, stdout) => {
      if (err || !stdout) return resolve([]);
      resolve(
        stdout
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => /^\d+$/.test(l))
          .map(Number)
      );
    });
  });
}

ipcMain.handle('system:executeAction', (event, action) => {
  const scriptsDir = path.join(REPO_ROOT, 'scripts');
  if (action === 'restart') {
    const script = path.join(scriptsDir, 'restart-gateway.ps1');
    spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-NoProfile', '-File', script, '-Execute'], { detached: true, stdio: 'ignore' });
    return { status: 'ok', message: 'Memulai ulang Gateway Avery...' };
  } else if (action === 'clean') {
    const script = path.join(scriptsDir, 'session-housekeeping.ps1');
    spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-NoProfile', '-File', script, '-Execute'], { detached: true, stdio: 'ignore' });
    return { status: 'ok', message: 'Menjalankan pembersihan sesi & optimasi DB...' };
  } else if (action === 'stop') {
    // Hentikan hanya proses milik Avery berdasarkan PID, bukan semua node/python.
    const gwPid = getGatewayPid();
    getBridgePids().then((bridgePids) => {
      const pids = [];
      if (gwPid) pids.push(gwPid);
      for (const pid of bridgePids) pids.push(pid);
      for (const pid of pids) {
        exec(`taskkill /PID ${pid} /T /F`);
      }
    });
    return { status: 'ok', message: 'Menghentikan proses Gateway & Bridge milik Avery...' };
  } else if (action === 'open_logs') {
    shell.openPath(LOGS_DIR);
    return { status: 'ok', message: 'Membuka folder logs di Explorer...' };
  } else if (action === 'open_scripts_folder') {
    shell.openPath(SCRIPTS_DIR);
    return { status: 'ok', message: 'Membuka folder scripts di Explorer...' };
  }
  return { status: 'error', message: `Aksi tidak dikenal: ${action}` };
});

ipcMain.handle('system:getAvatarData', () => {
  if (fs.existsSync(AVATAR_PATH)) {
    try {
      const buffer = fs.readFileSync(AVATAR_PATH);
      return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    } catch {}
  }
  return null;
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
