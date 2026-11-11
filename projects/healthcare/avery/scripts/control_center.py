"""Avery Sentra - Executive Living Console.

Full edge-to-edge Living Console powered by Sentra Design Tokens, IBM Plex typography,
real-time log streaming, and operational script launch dock.
"""

from __future__ import annotations

import datetime
import json
import os
import re
import socket
import sqlite3
import subprocess
import sys
import threading
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = 8989
PROFILE = "avery"
SELF_ORIGIN = f"http://127.0.0.1:{PORT}"

USER_HOME = Path.home()
HERMES_HOME = USER_HOME / ".hermes" / "profiles" / PROFILE
REPO_ROOT = Path(__file__).resolve().parents[1]
LOGS_DIR = HERMES_HOME / "logs"
DB_PATH = HERMES_HOME / "state.db"
AVATAR_PATH = Path(os.environ.get("AVERY_AVATAR_PATH", ""))
SCRIPTS_DIR = Path(
    os.environ.get("AVERY_SCRIPTS_DIR", str(USER_HOME / "Documents" / "scripts"))
)
# Opsional: jika diset, seluruh endpoint /api/* menuntut header X-Avery-Token.
CONTROL_TOKEN = os.environ.get("AVERY_CONTROL_TOKEN", "")

KNOWN_SCRIPTS = [
    {"name": "Restart Hermes Gateway.bat", "label": "Restart Gateway", "desc": "Restart service & bersihkan bridge yatim", "icon": "⚡"},
    {"name": "Sentra Cache Cleaner.bat", "label": "Sentra Cache Cleaner", "desc": "Bersihkan cache & file sementara", "icon": "🧹"},
    {"name": "SuperClean.bat", "label": "SuperClean Deep", "desc": "Pembersihan menyeluruh sistem & runtime", "icon": "🛡️"},
    {"name": "Start-Sentra-Monorepo-Kanban.bat", "label": "Sentra Kanban", "desc": "Buka Monorepo Kanban Board", "icon": "📋"},
    {"name": "Start-Github-Regkit.bat", "label": "GitHub Regkit", "desc": "Launcher otomatis GitHub Regkit", "icon": "🐙"},
    {"name": "Start OmniRoute.bat", "label": "OmniRoute Service", "desc": "Jalankan gateway OmniRoute", "icon": "🌐"},
    {"name": "Sentra Prompt.bat", "label": "Sentra Prompt", "desc": "Buka Master Prompt Studio", "icon": "📝"},
    {"name": "Paperclip.bat", "label": "Paperclip Assistant", "desc": "Buka asisten Paperclip", "icon": "📎"},
]
KNOWN_SCRIPT_NAMES = {s["name"] for s in KNOWN_SCRIPTS}


def _is_authorized(request_handler) -> bool:
    """Otorisasi endpoint /api/*: token opsional + penolakan request lintas-origin."""
    if CONTROL_TOKEN:
        supplied = request_handler.headers.get("X-Avery-Token", "")
        if supplied != CONTROL_TOKEN:
            return False

    # Browser modern selalu mengirim Origin pada request lintas-origin (CSRF).
    origin = request_handler.headers.get("Origin")
    if origin and origin != SELF_ORIGIN:
        return False
    return True


def check_tcp_port(port: int, host: str = "127.0.0.1", timeout: float = 1.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False


def get_bridge_health() -> dict:
    try:
        req = urllib.request.Request(
            "http://127.0.0.1:3000/health", headers={"User-Agent": "AveryLivingConsole/1.0"}
        )
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                return {
                    "online": True,
                    "status": data.get("status", "unknown"),
                    "details": data,
                }
    except Exception:
        pass
    is_open = check_tcp_port(3000)
    return {
        "online": is_open,
        "status": "listening" if is_open else "offline",
        "details": None,
    }


def get_gateway_processes() -> list[dict]:
    procs = []
    pid_file = HERMES_HOME / "gateway.pid"
    gw_pid = None
    if pid_file.exists():
        try:
            data = json.loads(pid_file.read_text(encoding="utf-8"))
            candidate_pid = data.get("pid")
            if candidate_pid:
                out = subprocess.check_output(
                    f'tasklist /FI "PID eq {candidate_pid}" /FO CSV', shell=True, text=True
                )
                if str(candidate_pid) in out:
                    gw_pid = candidate_pid
                    procs.append({"pid": gw_pid, "name": "python.exe", "type": "Gateway"})
        except Exception:
            pass

    try:
        output = subprocess.check_output(
            [
                "powershell",
                "-NoProfile",
                "-Command",
                "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'whatsapp-bridge' } | Select-Object -ExpandProperty ProcessId",
            ],
            text=True,
            timeout=3,
        ).strip()
        if output:
            for line in output.splitlines():
                if line.strip().isdigit():
                    procs.append({
                        "pid": int(line.strip()),
                        "name": "node.exe",
                        "type": "Bridge",
                    })
    except Exception:
        pass

    return procs


def get_recent_issues() -> list[dict]:
    issues = []
    gateway_log = LOGS_DIR / "gateway.log"
    now = datetime.datetime.now()

    if gateway_log.exists():
        try:
            lines = gateway_log.read_text(encoding="utf-8", errors="ignore").splitlines()[-40:]
            for line in lines:
                if len(line) < 19:
                    continue
                try:
                    dt = datetime.datetime.strptime(line[:19], "%Y-%m-%d %H:%M:%S")
                    if (now - dt).total_seconds() > 600:
                        continue
                except Exception:
                    pass

                if "WARNING" in line and "Unauthorized user" in line:
                    match = re.search(r"Unauthorized user:\s*([^ ]+)\s*\(([^)]+)\)", line)
                    if match:
                        issues.append({
                            "type": "unauthorized_user",
                            "severity": "warning",
                            "message": f"Pengguna tidak terdaftar: {match.group(2)} ({match.group(1)})",
                            "time": line[:19],
                        })
                elif "ERROR" in line:
                    if "Exiting to avoid double-running" in line:
                        continue
                    issues.append({
                        "type": "gateway_error",
                        "severity": "error",
                        "message": line[line.find("ERROR"):line.find("ERROR") + 120],
                        "time": line[:19],
                    })
        except Exception:
            pass

    if DB_PATH.exists():
        try:
            con = sqlite3.connect(str(DB_PATH))
            cur = con.cursor()
            rows = cur.execute("SELECT session_key, entry_json FROM gateway_routing").fetchall()
            for key, entry_json in rows:
                try:
                    data = json.loads(entry_json)
                    tokens = data.get("last_prompt_tokens", 0)
                    if tokens > 40000:
                        issues.append({
                            "type": "token_bloat",
                            "severity": "warning",
                            "message": f"Sesi bengkak ({tokens:,} token) pada {key.split(':')[-1]}. Perlu di-reset.",
                            "time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        })
                except Exception:
                    pass
            con.close()
        except Exception:
            pass

    unique_issues = []
    seen = set()
    for iss in reversed(issues):
        if iss["message"] not in seen:
            seen.add(iss["message"])
            unique_issues.append(iss)

    return unique_issues[:6]


def get_system_status() -> dict:
    procs = get_gateway_processes()
    bridge_health = get_bridge_health()
    issues = get_recent_issues()

    gw_pids = [p["pid"] for p in procs if p["type"] == "Gateway"]
    bridge_pids = [p["pid"] for p in procs if p["type"] == "Bridge"]

    is_running = len(gw_pids) > 0
    bridge_ok = bridge_health.get("status") == "connected"

    session_count = 0
    max_tokens = 0
    if DB_PATH.exists():
        try:
            con = sqlite3.connect(str(DB_PATH))
            rows = con.execute("SELECT entry_json FROM gateway_routing").fetchall()
            session_count = len(rows)
            for (r,) in rows:
                try:
                    t = json.loads(r).get("last_prompt_tokens", 0)
                    if t > max_tokens:
                        max_tokens = t
                except Exception:
                    pass
            con.close()
        except Exception:
            pass

    return {
        "status": "ok",
        "profile": PROFILE,
        "gateway": {
            "running": is_running,
            "pids": gw_pids,
            "status_text": "ONLINE" if is_running else "OFFLINE",
        },
        "bridge": {
            "running": len(bridge_pids) > 0,
            "connected": bridge_ok,
            "status_text": "CONNECTED" if bridge_ok else ("STANDBY" if bridge_health["online"] else "OFFLINE"),
            "pids": bridge_pids,
        },
        "metrics": {
            "active_sessions": session_count,
            "max_session_tokens": max_tokens,
            "issues_count": len(issues),
        },
        "issues": issues,
        "timestamp": datetime.datetime.now().strftime("%H:%M:%S"),
    }


def get_available_scripts() -> list[dict]:
    results = []
    for s in KNOWN_SCRIPTS:
        file_path = SCRIPTS_DIR / s["name"]
        results.append({
            "name": s["name"],
            "label": s["label"],
            "desc": s["desc"],
            "icon": s["icon"],
            "exists": file_path.exists(),
        })
    return results


def get_recent_logs(max_lines: int = 100) -> list[str]:
    gateway_log = LOGS_DIR / "gateway.log"
    if gateway_log.exists():
        try:
            return gateway_log.read_text(encoding="utf-8", errors="ignore").splitlines()[-max_lines:]
        except Exception:
            return ["Gagal membaca log gateway."]
    return ["Log gateway belum tersedia."]


def get_traffic_feed(max_items: int = 30) -> list[dict]:
    gateway_log = LOGS_DIR / "gateway.log"
    feed = []
    if gateway_log.exists():
        try:
            lines = gateway_log.read_text(encoding="utf-8", errors="ignore").splitlines()[-180:]
            for line in lines:
                if "inbound message:" in line:
                    m = re.search(r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}).*?user=(.*?) chat=(.*?) msg='(.*?)'", line)
                    if m:
                        feed.append({
                            "type": "inbound",
                            "time": m.group(1)[11:],
                            "user": m.group(2),
                            "chat": m.group(3).split("@")[0],
                            "msg": m.group(4) or "[Media / Empty]",
                        })
                elif "response ready:" in line:
                    m = re.search(r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}).*?time=([\d\.]+)s.*?response=(\d+) chars", line)
                    if m:
                        feed.append({
                            "type": "response",
                            "time": m.group(1)[11:],
                            "latency": f"{m.group(2)}s",
                            "chars": f"{m.group(3)} chars",
                            "msg": f"Avery membalas ({m.group(3)} karakter dalam {m.group(2)}s)",
                        })
                elif "ingress drop reason=MENTION_MISMATCH" in line:
                    feed.append({
                        "type": "ignored",
                        "time": line[11:19],
                        "msg": "Pesan diabaikan (Tidak memanggil Avery/bukan reply)",
                    })
        except Exception:
            pass
    return list(reversed(feed))[:max_items]


def execute_action(action: str, script_name: str | None = None) -> dict:
    scripts_dir = REPO_ROOT / "projects" / "healthcare" / "avery" / "scripts"
    if not scripts_dir.exists():
        scripts_dir = REPO_ROOT / "scripts"

    if action == "restart":
        script = scripts_dir / "restart-gateway.ps1"
        subprocess.Popen(["powershell", "-ExecutionPolicy", "Bypass", "-NoProfile", "-File", str(script), "-Execute"])
        return {"status": "ok", "message": "Memulai ulang Gateway Avery..."}
    elif action == "stop":
        # Hentikan hanya proses milik Avery (gateway + bridge), bukan semua node/python.
        targets = get_gateway_processes()
        if not targets:
            return {"status": "error", "message": "Tidak ada proses Avery yang berjalan."}
        for proc in targets:
            subprocess.Popen(
                ["taskkill", "/PID", str(proc["pid"]), "/T", "/F"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        stopped = ", ".join(f"{p['type']} (PID {p['pid']})" for p in targets)
        return {"status": "ok", "message": f"Menghentikan proses Avery: {stopped}..."}
    elif action == "clean":
        script = scripts_dir / "session-housekeeping.ps1"
        subprocess.Popen(["powershell", "-ExecutionPolicy", "Bypass", "-NoProfile", "-File", str(script), "-Execute"])
        return {"status": "ok", "message": "Menjalankan pembersihan sesi & optimasi DB..."}
    elif action == "open_logs":
        os.startfile(str(LOGS_DIR))
        return {"status": "ok", "message": "Membuka folder logs di Explorer..."}
    elif action == "open_scripts_folder":
        os.startfile(str(SCRIPTS_DIR))
        return {"status": "ok", "message": "Membuka folder scripts..."}
    elif action == "run_script" and script_name:
        # Allowlist ketat: nama harus terdaftar persis, tolak path traversal.
        if script_name not in KNOWN_SCRIPT_NAMES or Path(script_name).name != script_name:
            return {"status": "error", "message": f"Script tidak diizinkan: {script_name}"}
        target = SCRIPTS_DIR / script_name
        if target.exists():
            subprocess.Popen(["cmd.exe", "/c", "start", "", str(target)], cwd=str(SCRIPTS_DIR))
            return {"status": "ok", "message": f"Menjalankan: {script_name}"}
        return {"status": "error", "message": f"Script tidak ditemukan: {script_name}"}

    return {"status": "error", "message": f"Aksi tidak dikenal: {action}"}


HTML_PAGE = r"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Avery Sentra — Living Console</title>
  
  <!-- Google Fonts: IBM Plex Sans & IBM Plex Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  
  <style>
    /* 🎨 PALET ASLI + SENTRA DESIGN TOKENS (DesignOption.html) */
    :root {
      --bg-deep: #0D0F14;
      --card-bg: #161922;
      --card-border: rgba(255, 255, 255, 0.12);
      --card-highlight: rgba(255, 255, 255, 0.06);
      --text-primary: #F2F4F7;
      --text-secondary: #9CA3AF;
      --text-muted: #6B7280;
      --accent: #3B82F6;
      --neu-light: rgba(255, 255, 255, 0.04);
      --neu-dark: rgba(0, 0, 0, 0.45);
      --font-sans: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-mono: 'IBM Plex Mono', ui-monospace, Consolas, monospace;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: var(--bg-deep);
      color: var(--text-primary);
      font-family: var(--font-sans);
      user-select: none;
      -webkit-user-select: none;
    }

    /* 🎛️ FULL VIEWPORT LIVING CONSOLE WRAPPER */
    .console-app {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--bg-deep);
    }

    /* 1. TOP COCKPIT HEADER BAR */
    .cockpit-header {
      background: var(--card-bg);
      border-bottom: 1px solid var(--card-border);
      padding: 10px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 var(--card-highlight);
    }

    .agent-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar-frame {
      position: relative;
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }

    .avatar-img {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--accent);
      box-shadow: 0 0 12px rgba(59, 130, 246, 0.35);
    }

    .avatar-pulse {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 11px;
      height: 11px;
      border-radius: 50%;
      background: #10B981;
      border: 2px solid var(--card-bg);
      box-shadow: 0 0 8px #10B981;
      animation: pulse 2s infinite ease-in-out;
    }

    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(1.15); } }

    .brand-text { display: flex; flex-direction: column; gap: 1px; }
    .brand-title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .brand-tag {
      font-size: 9px;
      font-family: var(--font-mono);
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 6px;
      background: rgba(59, 130, 246, 0.15);
      color: var(--accent);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 4px;
    }
    .brand-sub { font-size: 11px; color: var(--text-secondary); }

    /* TELEMETRY PILLS IN HEADER */
    .header-telemetry {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tele-pill {
      background: var(--bg-deep);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 6px 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      box-shadow: inset 2px 2px 5px var(--neu-dark), inset -2px -2px 4px var(--neu-light);
    }
    .tele-label { font-size: 9px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
    .tele-val { font-size: 12px; font-weight: 700; font-family: var(--font-mono); display: flex; align-items: center; gap: 4px; }

    /* 2. LIVING NAV BAR */
    .console-nav {
      background: #11141B;
      border-bottom: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      flex-shrink: 0;
    }

    .nav-tabs { display: flex; gap: 2px; }
    .nav-tab {
      padding: 10px 18px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .nav-tab:hover { color: var(--text-primary); background: rgba(255, 255, 255, 0.03); }
    .nav-tab.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
      background: rgba(59, 130, 246, 0.08);
    }

    .nav-live {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-family: var(--font-mono);
      color: var(--text-secondary);
    }
    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 8px #10B981;
      animation: pulse 1.8s infinite ease-in-out;
    }

    /* 3. MAIN COCKPIT VIEWPORT */
    .console-body {
      flex: 1;
      overflow: hidden;
      display: flex;
      position: relative;
    }

    .living-pane {
      width: 100%;
      height: 100%;
      display: none;
      flex-direction: column;
      padding: 14px 18px;
      overflow-y: auto;
      gap: 12px;
    }
    .living-pane.active { display: flex; }

    /* LIVING LOG TERMINAL (INSET NEUMORPHIC) */
    .terminal-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--bg-deep);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      box-shadow: inset 2px 2px 5px var(--neu-dark), inset -2px -2px 4px var(--neu-light);
      overflow: hidden;
    }

    .terminal-topbar {
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .terminal-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      font-family: var(--font-mono);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .terminal-actions { display: flex; gap: 6px; align-items: center; }

    .term-input {
      background: var(--bg-deep);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 11px;
      color: var(--text-primary);
      font-family: var(--font-mono);
      outline: none;
    }
    .term-input:focus { border-color: var(--accent); }

    .terminal-content {
      flex: 1;
      padding: 12px 14px;
      font-family: var(--font-mono);
      font-size: 11.5px;
      line-height: 1.55;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
      color: var(--text-primary);
    }
    .terminal-content::-webkit-scrollbar { width: 6px; }
    .terminal-content::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 3px; }

    .log-line { padding: 1px 0; }
    .log-time { color: var(--text-muted); margin-right: 6px; }
    .log-info { color: var(--text-secondary); }
    .log-inbound { color: #60A5FA; font-weight: 600; }
    .log-response { color: #34D399; font-weight: 600; }
    .log-warn { color: #FBBF24; }
    .log-err { color: #F87171; font-weight: 600; }

    /* TRAFFIC FEED LIST */
    .traffic-feed {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .traffic-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 var(--card-highlight);
    }
    .traffic-card.inbound { border-left: 3px solid var(--accent); }
    .traffic-card.response { border-left: 3px solid #10B981; }
    .traffic-card.ignored { border-left: 3px solid var(--text-muted); opacity: 0.65; }

    .traffic-meta { display: flex; justify-content: space-between; font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); }
    .traffic-title { font-size: 12px; font-weight: 600; color: var(--text-primary); }
    .traffic-text { font-size: 12px; color: var(--text-secondary); line-height: 1.4; }

    /* SCRIPTS TOOLBOX GRID */
    .scripts-matrix {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: 10px;
    }

    .script-tile {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 12px 14px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: all 0.15s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 var(--card-highlight);
    }
    .script-tile:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(59, 130, 246, 0.25);
    }
    .script-tile:active { transform: translateY(0); }

    .tile-head { display: flex; align-items: center; gap: 8px; }
    .tile-icon { font-size: 18px; }
    .tile-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .tile-desc { font-size: 11px; color: var(--text-muted); line-height: 1.35; margin-top: 2px; }

    /* OVERVIEW TELEMETRY HUD */
    .hud-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .hud-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35), inset 0 1px 0 var(--card-highlight);
    }
    .hud-title { font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; }
    .hud-stat { font-size: 16px; font-weight: 700; font-family: var(--font-mono); display: flex; align-items: center; gap: 6px; }
    .hud-foot { font-size: 11px; color: var(--text-muted); }

    /* 4. BOTTOM COMMAND DOCK */
    .command-dock {
      background: var(--card-bg);
      border-top: 1px solid var(--card-border);
      padding: 10px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-shrink: 0;
      box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.5);
    }

    .dock-actions { display: flex; align-items: center; gap: 8px; }

    .btn {
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
      font-family: inherit;
    }

    .btn-primary {
      background: linear-gradient(135deg, #3B82F6, #2563EB);
      color: white;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
    }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.45); }
    .btn-primary:active { transform: translateY(0); }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-primary);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.12); }

    .btn-ghost {
      background: transparent;
      color: var(--text-secondary);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .btn-ghost:hover { color: var(--text-primary); background: rgba(255, 255, 255, 0.05); }

    .btn-danger {
      background: rgba(239, 68, 68, 0.15);
      color: #EF4444;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }
    .btn-danger:hover { background: rgba(239, 68, 68, 0.25); }

    /* TOAST */
    #toast {
      position: fixed;
      bottom: 64px;
      left: 50%;
      transform: translateX(-50%);
      padding: 7px 18px;
      font-size: 11.5px;
      font-weight: 500;
      background: #161922;
      color: var(--text-primary);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 20px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
      z-index: 100;
    }
  </style>
</head>
<body>

  <div class="console-app">

    <!-- 1. COCKPIT HEADER -->
    <header class="cockpit-header">
      <div class="agent-brand">
        <div class="avatar-frame">
          <img src="/avatar.jpg" alt="Avery Sentra" class="avatar-img" onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/bottts/svg?seed=Avery'">
          <span class="avatar-pulse"></span>
        </div>
        <div class="brand-text">
          <div class="brand-title">
            AVERY SENTRA
            <span class="brand-tag">v0.20.4</span>
          </div>
          <div class="brand-sub">Executive Living Console • Sentra Healthcare</div>
        </div>
      </div>

      <div class="header-telemetry">
        <div class="tele-pill">
          <span class="tele-label">Gateway</span>
          <span id="gw-stat" class="tele-val" style="color: #10B981;">ONLINE</span>
        </div>
        <div class="tele-pill">
          <span class="tele-label">WhatsApp Bridge</span>
          <span id="bridge-stat" class="tele-val" style="color: #10B981;">CONNECTED</span>
        </div>
        <div class="tele-pill">
          <span class="tele-label">Max Token</span>
          <span id="token-stat" class="tele-val" style="color: var(--text-primary);">-</span>
        </div>
      </div>
    </header>

    <!-- 2. LIVING NAV BAR -->
    <nav class="console-nav">
      <div class="nav-tabs">
        <button class="nav-tab active" onclick="switchPane('pane-stream', event)">📜 Live Log Stream</button>
        <button class="nav-tab" onclick="switchPane('pane-traffic', event)">💬 Chat Traffic</button>
        <button class="nav-tab" onclick="switchPane('pane-scripts', event)">⚡ Scripts Toolbox</button>
        <button class="nav-tab" onclick="switchPane('pane-overview', event)">📊 Telemetry HUD</button>
      </div>

      <div class="nav-live">
        <span class="live-dot"></span>
        <span id="clock-display">00:00:00</span>
      </div>
    </nav>

    <!-- 3. MAIN COCKPIT VIEWPORT -->
    <main class="console-body">

      <!-- PANE 1: LIVE LOG STREAM -->
      <div id="pane-stream" class="living-pane active">
        <div class="terminal-wrapper">
          <div class="terminal-topbar">
            <span class="terminal-title">TERMINAL // LOG STREAM</span>
            <div class="terminal-actions">
              <input type="text" id="log-filter" class="term-input" placeholder="Filter log..." oninput="filterLogs()">
              <button class="btn btn-ghost" style="padding: 3px 8px; font-size: 10px;" onclick="fetchLogs()">🔄 Refresh</button>
              <button class="btn btn-ghost" style="padding: 3px 8px; font-size: 10px;" onclick="copyLogs()">📋 Copy</button>
              <button class="btn btn-ghost" style="padding: 3px 8px; font-size: 10px;" onclick="clearTerminal()">🧹 Clear</button>
            </div>
          </div>
          <div class="terminal-content" id="terminal-stream">Memuat live log stream...</div>
        </div>
      </div>

      <!-- PANE 2: CHAT TRAFFIC MONITOR -->
      <div id="pane-traffic" class="living-pane">
        <div class="traffic-feed" id="traffic-container">Memuat traffic chat...</div>
      </div>

      <!-- PANE 3: SCRIPTS TOOLBOX -->
      <div id="pane-scripts" class="living-pane">
        <div class="scripts-matrix" id="scripts-container">
          <!-- Loaded dynamically from C:\Users\drfer\Documents\scripts -->
        </div>
      </div>

      <!-- PANE 4: TELEMETRY HUD -->
      <div id="pane-overview" class="living-pane">
        <div class="hud-grid">
          <div class="hud-card">
            <span class="hud-title">Gateway Service</span>
            <div id="hud-gw-status" class="hud-stat" style="color: #10B981;">ONLINE</div>
            <div id="hud-gw-pid" class="hud-foot">PID: -</div>
          </div>
          <div class="hud-card">
            <span class="hud-title">WhatsApp Bridge</span>
            <div id="hud-bridge-status" class="hud-stat" style="color: #10B981;">CONNECTED</div>
            <div id="hud-bridge-port" class="hud-foot">Port 3000: Active</div>
          </div>
          <div class="hud-card">
            <span class="hud-title">Sesi Aktif (Channel)</span>
            <div id="hud-sessions" class="hud-stat" style="color: var(--text-primary);">-</div>
            <div class="hud-foot">Total ruang obrolan terdaftar</div>
          </div>
          <div class="hud-card">
            <span class="hud-title">Status Diagnosa</span>
            <div id="hud-issues-count" class="hud-stat" style="color: #10B981;">0 Peringatan</div>
            <div class="hud-foot">Sistem beroperasi optimal</div>
          </div>
        </div>

        <div class="hud-card" style="margin-top: 4px;">
          <span class="hud-title">Daftar Peringatan & Anomali</span>
          <div id="hud-issues-list" style="font-size: 11.5px; color: var(--text-secondary); margin-top: 4px;">
            ✨ Tidak ada anomali atau penumpukan token yang terdeteksi.
          </div>
        </div>
      </div>

    </main>

    <!-- 4. BOTTOM COMMAND DOCK -->
    <footer class="command-dock">
      <div class="dock-actions">
        <button class="btn btn-primary" onclick="triggerAction('restart')">
          <span>⚡</span> Restart Gateway
        </button>
        <button class="btn btn-secondary" onclick="triggerAction('clean')">
          <span>🧹</span> Housekeeping
        </button>
        <button class="btn btn-ghost" onclick="triggerAction('open_logs')">
          <span>📁</span> Open Logs
        </button>
      </div>

      <div class="dock-actions">
        <button class="btn btn-ghost" onclick="triggerAction('open_scripts_folder')">
          <span>📂</span> Scripts Folder
        </button>
        <button class="btn btn-danger" onclick="triggerAction('stop')">
          <span>🛑</span> Stop
        </button>
      </div>
    </footer>

  </div>

  <div id="toast">Notifikasi</div>

  <script>
    let activePane = 'pane-stream';
    let rawLogLines = [];

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.style.opacity = '1';
      setTimeout(() => { toast.style.opacity = '0'; }, 2200);
    }

    function switchPane(paneId, ev) {
      document.querySelectorAll('.living-pane').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));

      document.getElementById(paneId).classList.add('active');
      if (ev && ev.target) {
        ev.target.classList.add('active');
      }
      activePane = paneId;

      if (paneId === 'pane-stream') fetchLogs();
      if (paneId === 'pane-traffic') fetchTraffic();
      if (paneId === 'pane-scripts') fetchScripts();
    }

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
      const filtered = query ? rawLogLines.filter(l => l.toLowerCase().includes(query)) : rawLogLines;
      term.innerHTML = filtered.map(formatLogLine).join('');
      term.scrollTop = term.scrollHeight;
    }

    function clearTerminal() {
      document.getElementById('terminal-stream').innerHTML = '<div class="log-line log-info">Terminal dibersihkan. Menunggu log baru...</div>';
      showToast('Terminal dibersihkan');
    }

    function copyLogs() {
      navigator.clipboard.writeText(rawLogLines.join('\n'));
      showToast('Log disalin ke clipboard');
    }

    async function fetchLogs() {
      try {
        const res = await fetch('/api/logs');
        rawLogLines = await res.json();
        filterLogs();
      } catch (e) {
        document.getElementById('terminal-stream').innerText = 'Gagal memuat log stream.';
      }
    }

    async function fetchTraffic() {
      try {
        const res = await fetch('/api/traffic');
        const items = await res.json();
        const cont = document.getElementById('traffic-container');
        if (!items || items.length === 0) {
          cont.innerHTML = '<div class="traffic-card"><div class="traffic-text">Belum ada aktivitas chat terkini.</div></div>';
          return;
        }
        cont.innerHTML = items.map(item => {
          if (item.type === 'inbound') {
            return `
              <div class="traffic-card inbound">
                <div class="traffic-meta">
                  <span>📥 PESAN MASUK — ${item.user}</span>
                  <span>${item.time}</span>
                </div>
                <div class="traffic-text">${item.msg}</div>
              </div>
            `;
          } else if (item.type === 'response') {
            return `
              <div class="traffic-card response">
                <div class="traffic-meta">
                  <span>📤 RESPON AVERY — Latensi ${item.latency}</span>
                  <span>${item.time}</span>
                </div>
                <div class="traffic-text">${item.msg}</div>
              </div>
            `;
          } else {
            return `
              <div class="traffic-card ignored">
                <div class="traffic-meta">
                  <span>👁️ DIABAIKAN (Strict Group Protocol)</span>
                  <span>${item.time}</span>
                </div>
                <div class="traffic-text">${item.msg}</div>
              </div>
            `;
          }
        }).join('');
      } catch (e) {
        document.getElementById('traffic-container').innerText = 'Gagal memuat traffic chat.';
      }
    }

    async function fetchScripts() {
      try {
        const res = await fetch('/api/scripts');
        const scripts = await res.json();
        const cont = document.getElementById('scripts-container');
        cont.innerHTML = scripts.map(s => `
          <div class="script-tile" onclick="runScript('${s.name}')">
            <div class="tile-head">
              <span class="tile-icon">${s.icon}</span>
              <span class="tile-title">${s.label}</span>
            </div>
            <div class="tile-desc">${s.desc}</div>
          </div>
        `).join('');
      } catch (e) {
        document.getElementById('scripts-container').innerHTML = '<div class="empty-state">Gagal memuat scripts.</div>';
      }
    }

    async function runScript(name) {
      showToast('Menjalankan: ' + name);
      try {
        const res = await fetch('/api/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'run_script', script_name: name })
        });
        const d = await res.json();
        showToast(d.message);
      } catch (e) {
        showToast('Gagal menjalankan script.');
      }
    }

    async function fetchStatus() {
      try {
        const res = await fetch('/api/status');
        const d = await res.json();

        // Telemetry in Header
        const gwRunning = d.gateway.running;
        const gwStatEl = document.getElementById('gw-stat');
        gwStatEl.innerText = gwRunning ? 'ONLINE' : 'OFFLINE';
        gwStatEl.style.color = gwRunning ? '#10B981' : '#EF4444';

        const bridgeConnected = d.bridge.connected;
        const bridgeStatEl = document.getElementById('bridge-stat');
        bridgeStatEl.innerText = bridgeConnected ? 'CONNECTED' : (d.bridge.running ? 'STANDBY' : 'OFFLINE');
        bridgeStatEl.style.color = bridgeConnected ? '#10B981' : (d.bridge.running ? '#F59E0B' : '#EF4444');

        document.getElementById('token-stat').innerText = d.metrics.max_session_tokens.toLocaleString();
        document.getElementById('clock-display').innerText = d.timestamp;

        // Telemetry HUD Pane
        document.getElementById('hud-gw-status').innerText = gwRunning ? 'ONLINE (Aktif)' : 'OFFLINE (Mati)';
        document.getElementById('hud-gw-status').style.color = gwRunning ? '#10B981' : '#EF4444';
        document.getElementById('hud-gw-pid').innerText = gwRunning ? ('PID: ' + d.gateway.pids.join(', ')) : 'Status: Berhenti';

        document.getElementById('hud-bridge-status').innerText = bridgeConnected ? 'CONNECTED' : (d.bridge.running ? 'STANDBY' : 'OFFLINE');
        document.getElementById('hud-bridge-status').style.color = bridgeConnected ? '#10B981' : (d.bridge.running ? '#F59E0B' : '#EF4444');
        document.getElementById('hud-bridge-port').innerText = d.bridge.running ? 'Port 3000: Aktif' : 'Port 3000: Mati';

        document.getElementById('hud-sessions').innerText = d.metrics.active_sessions;
        document.getElementById('hud-issues-count').innerText = d.metrics.issues_count + ' Peringatan';
        document.getElementById('hud-issues-count').style.color = d.metrics.issues_count > 0 ? '#F59E0B' : '#10B981';

        if (d.issues && d.issues.length > 0) {
          document.getElementById('hud-issues-list').innerHTML = d.issues.map(i => `
            <div style="padding: 6px 10px; border-left: 2px solid #F59E0B; background: rgba(245,158,11,0.08); margin-bottom: 6px; border-radius: 4px;">
              <div>⚠️ ${i.message}</div>
              <div style="font-size: 9.5px; color: var(--text-muted); margin-top: 2px;">${i.time}</div>
            </div>
          `).join('');
        } else {
          document.getElementById('hud-issues-list').innerHTML = '✨ Tidak ada anomali atau penumpukan token yang terdeteksi.';
        }
      } catch (err) {
        document.getElementById('gw-stat').innerText = 'ERROR';
      }
    }

    async function triggerAction(action) {
      showToast('Mengirim perintah: ' + action);
      try {
        const res = await fetch('/api/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Avery-Control': '1' },
          body: JSON.stringify({ action: action })
        });
        const d = await res.json();
        showToast(d.message);
        setTimeout(fetchStatus, 1200);
        setTimeout(fetchLogs, 1500);
      } catch (err) {
        showToast('Gagal mengirim perintah.');
      }
    }

    // Auto-update loop (2.5s)
    setInterval(() => {
      fetchStatus();
      if (activePane === 'pane-stream') fetchLogs();
      if (activePane === 'pane-traffic') fetchTraffic();
    }, 2500);

    fetchStatus();
    fetchLogs();
    fetchScripts();
  </script>

</body>
</html>
"""


class DashboardHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _send_json(self, payload: dict | list, status: int = 200):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _deny(self, reason: str = "Forbidden"):
        self._send_json({"status": "error", "message": reason}, 403)

    def do_GET(self):
        if self.path == "/avatar.jpg":
            if AVATAR_PATH.exists():
                try:
                    data = AVATAR_PATH.read_bytes()
                    self.send_response(200)
                    self.send_header("Content-Type", "image/jpeg")
                    self.send_header("Content-Length", str(len(data)))
                    self.send_header("Cache-Control", "public, max-age=86400")
                    self.end_headers()
                    self.wfile.write(data)
                    return
                except Exception:
                    pass
            self.send_response(404)
            self.end_headers()
        elif not _is_authorized(self):
            self._deny()
        elif self.path == "/api/status":
            self._send_json(get_system_status())
        elif self.path == "/api/logs":
            self._send_json(get_recent_logs(100))
        elif self.path == "/api/traffic":
            self._send_json(get_traffic_feed(30))
        elif self.path == "/api/scripts":
            self._send_json(get_available_scripts())
        else:
            data = HTML_PAGE.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    def do_POST(self):
        if self.path != "/api/action":
            self.send_response(404)
            self.end_headers()
            return
        if not _is_authorized(self):
            self._deny()
            return
        # Custom header tidak bisa dikirim oleh form/fetch lintas-origin tanpa
        # preflight yang disetujui server — lapisan anti-CSRF kedua.
        if self.headers.get("X-Avery-Control") != "1":
            self._deny("Missing X-Avery-Control header")
            return
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            payload = json.loads(body.decode("utf-8"))
            action = payload.get("action", "")
            script_name = payload.get("script_name")
            result = execute_action(action, script_name)
        except Exception as e:
            result = {"status": "error", "message": str(e)}
        self._send_json(result)


def main():
    server = ThreadingHTTPServer(("127.0.0.1", PORT), DashboardHandler)
    print(f"=== Avery Living Console Server running on http://127.0.0.1:{PORT} ===")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Stopping server...")
        server.server_close()


if __name__ == "__main__":
    main()
