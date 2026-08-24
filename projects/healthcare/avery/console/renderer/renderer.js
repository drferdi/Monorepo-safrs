let activePaneId = 'pane-stream';
let rawLogLines = [];

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 2200);
}

// Window Controls
document.getElementById('btn-minimize').addEventListener('click', () => {
  window.avery.minimize();
});

document.getElementById('btn-maximize').addEventListener('click', () => {
  window.avery.maximize();
});

document.getElementById('btn-close').addEventListener('click', () => {
  window.avery.close();
});

window.avery.onWindowStateChange(({ isMaximized }) => {
  document.getElementById('btn-maximize').innerText = isMaximized ? '\u274F' : '\u25A1';
});

// Navigation Tabs
document.querySelectorAll('.nav-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.living-pane').forEach((p) => p.classList.remove('active'));

    tab.classList.add('active');
    const targetPaneId = tab.getAttribute('data-pane');
    document.getElementById(targetPaneId).classList.add('active');
    activePaneId = targetPaneId;

    if (activePaneId === 'pane-stream') fetchLogs();
    if (activePaneId === 'pane-traffic') fetchTraffic();
    if (activePaneId === 'pane-scripts') fetchScripts();
  });
});

// Formatting and Log Filter
function formatLogLine(raw) {
  let cls = 'log-info';
  if (raw.includes('inbound message:')) cls = 'log-inbound';
  else if (raw.includes('response ready:') || raw.includes('Sending response')) cls = 'log-response';
  else if (raw.includes('WARNING') || raw.includes('MENTION_MISMATCH')) cls = 'log-warn';
  else if (raw.includes('ERROR') || raw.includes('Exception') || raw.includes('FAIL')) cls = 'log-err';

  const time = raw.slice(0, 19);
  const rest = raw.slice(20);
  return `<div class="log-line ${cls}"><span class="log-time">[${time}]</span>${rest}</div>`;
}

function filterLogs() {
  const query = (document.getElementById('log-filter').value || '').toLowerCase();
  const term = document.getElementById('terminal-stream');
  const filtered = query ? rawLogLines.filter((l) => l.toLowerCase().includes(query)) : rawLogLines;
  term.innerHTML = filtered.map(formatLogLine).join('');
  term.scrollTop = term.scrollHeight;
}

document.getElementById('log-filter').addEventListener('input', filterLogs);

document.getElementById('btn-clear-log').addEventListener('click', () => {
  document.getElementById('terminal-stream').innerHTML = '<div class="log-line log-info">Terminal dibersihkan. Menunggu log baru...</div>';
  showToast('Terminal dibersihkan');
});

document.getElementById('btn-copy-log').addEventListener('click', () => {
  navigator.clipboard.writeText(rawLogLines.join('\n'));
  showToast('Log disalin ke clipboard');
});

document.getElementById('btn-refresh-log').addEventListener('click', () => {
  fetchLogs();
  showToast('Log diperbarui');
});

// Live Log Stream
async function fetchLogs() {
  try {
    rawLogLines = await window.avery.getLogs(100);
    filterLogs();
  } catch (err) {
    document.getElementById('terminal-stream').innerText = 'Gagal memuat log stream.';
  }
}

// Live Chat Traffic
async function fetchTraffic() {
  try {
    const items = await window.avery.getTraffic(30);
    const cont = document.getElementById('traffic-container');
    if (!items || items.length === 0) {
      cont.innerHTML = '<div class="traffic-card"><div class="traffic-text">Belum ada aktivitas chat terkini.</div></div>';
      return;
    }
    cont.innerHTML = items.map((item) => {
      if (item.type === 'inbound') {
        return `
          <div class="traffic-card inbound">
            <div class="traffic-meta">
              <span>INBOUND MESSAGE &mdash; ${item.user}</span>
              <span>${item.time}</span>
            </div>
            <div class="traffic-text">${item.msg}</div>
          </div>
        `;
      } else if (item.type === 'response') {
        return `
          <div class="traffic-card response">
            <div class="traffic-meta">
              <span>AVERY RESPONSE &mdash; Latensi ${item.latency}</span>
              <span>${item.time}</span>
            </div>
            <div class="traffic-text">${item.msg}</div>
          </div>
        `;
      } else {
        return `
          <div class="traffic-card ignored">
            <div class="traffic-meta">
              <span>IGNORED (STRICT GROUP PROTOCOL)</span>
              <span>${item.time}</span>
            </div>
            <div class="traffic-text">${item.msg}</div>
          </div>
        `;
      }
    }).join('');
  } catch (err) {
    document.getElementById('traffic-container').innerText = 'Gagal memuat traffic chat.';
  }
}

// Scripts Toolbox
async function fetchScripts() {
  try {
    const scripts = await window.avery.getScripts();
    const cont = document.getElementById('scripts-container');
    cont.innerHTML = scripts.map((s) => `
      <div class="script-tile" data-name="${s.name}">
        <div class="tile-head">
          <span class="tile-title">${s.label}</span>
          <span class="tile-tag">${s.tag}</span>
        </div>
        <div class="tile-desc">${s.desc}</div>
      </div>
    `).join('');

    cont.querySelectorAll('.script-tile').forEach((tile) => {
      tile.addEventListener('click', async () => {
        const name = tile.getAttribute('data-name');
        showToast('Menjalankan: ' + name);
        const res = await window.avery.runScript(name);
        showToast(res.message);
      });
    });
  } catch (err) {
    document.getElementById('scripts-container').innerHTML = '<div class="empty-state">Gagal memuat scripts.</div>';
  }
}

// System Status Telemetry
async function fetchStatus() {
  try {
    const d = await window.avery.getStatus();

    const gwRunning = d.gateway.running;
    const gwStatEl = document.getElementById('gw-stat');
    gwStatEl.innerText = gwRunning ? 'ONLINE' : 'OFFLINE';
    gwStatEl.style.color = gwRunning ? '#10B981' : '#EF4444';

    const bridgeConnected = d.bridge.connected;
    const bridgeStatEl = document.getElementById('bridge-stat');
    bridgeStatEl.innerText = bridgeConnected ? 'CONNECTED' : (d.bridge.online ? 'STANDBY' : 'OFFLINE');
    bridgeStatEl.style.color = bridgeConnected ? '#10B981' : (d.bridge.online ? '#F59E0B' : '#EF4444');

    document.getElementById('channel-stat').innerText =
      d.metrics.active_sessions === null ? 'SESI: N/A' : `${d.metrics.active_sessions} SESI`;
    document.getElementById('clock-display').innerText = d.timestamp;

    document.getElementById('hud-gw-status').innerText = gwRunning ? 'ONLINE (Aktif)' : 'OFFLINE (Mati)';
    document.getElementById('hud-gw-status').style.color = gwRunning ? '#10B981' : '#EF4444';
    document.getElementById('hud-gw-pid').innerText = gwRunning ? (`PID: ${d.gateway.pid}`) : 'Status: Berhenti';

    document.getElementById('hud-bridge-status').innerText = bridgeConnected ? 'CONNECTED' : (d.bridge.online ? 'STANDBY' : 'OFFLINE');
    document.getElementById('hud-bridge-status').style.color = bridgeConnected ? '#10B981' : (d.bridge.online ? '#F59E0B' : '#EF4444');
    document.getElementById('hud-bridge-port').innerText = d.bridge.online ? 'Port 3000: Aktif' : 'Port 3000: Mati';

    document.getElementById('hud-sessions').innerText =
      d.metrics.active_sessions === null ? '—' : d.metrics.active_sessions;
  } catch (err) {
    console.error('Failed to fetch status:', err);
  }
}

// Bottom Action Buttons
document.getElementById('btn-action-restart').addEventListener('click', async () => {
  showToast('Memulai ulang Gateway Avery...');
  const res = await window.avery.executeAction('restart');
  showToast(res.message);
  setTimeout(fetchStatus, 1500);
  setTimeout(fetchLogs, 2000);
});

document.getElementById('btn-action-clean').addEventListener('click', async () => {
  showToast('Menjalankan Housekeeping...');
  const res = await window.avery.executeAction('clean');
  showToast(res.message);
  setTimeout(fetchStatus, 1500);
});

document.getElementById('btn-action-logs').addEventListener('click', async () => {
  const res = await window.avery.executeAction('open_logs');
  showToast(res.message);
});

document.getElementById('btn-action-scripts').addEventListener('click', async () => {
  const res = await window.avery.executeAction('open_scripts_folder');
  showToast(res.message);
});

document.getElementById('btn-action-stop').addEventListener('click', async () => {
  showToast('Menghentikan Gateway...');
  const res = await window.avery.executeAction('stop');
  showToast(res.message);
  setTimeout(fetchStatus, 1000);
});

// Auto-update loop (2.5s)
setInterval(() => {
  fetchStatus();
  if (activePaneId === 'pane-stream') fetchLogs();
  if (activePaneId === 'pane-traffic') fetchTraffic();
}, 2500);

// Initialize
fetchStatus();
fetchLogs();
fetchScripts();
