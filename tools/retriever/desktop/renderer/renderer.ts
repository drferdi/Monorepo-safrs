interface SentraHarvesterApi {
  startScrape: (options: Record<string, unknown>) => Promise<any>;
  stopScrape: () => Promise<any>;
  getProfiles: () => Promise<Record<string, any>>;
  openFolder: (path: string) => Promise<any>;
  openUrl: (url: string) => Promise<any>;
  preview: (path?: string) => Promise<any>;
  getWindowPos: () => Promise<[number, number] | undefined>;
  setWindowPos: (x: number, y: number) => void;
  close: () => void;
  minimize: () => void;
  zoom: () => void;
  onLog: (callback: (payload: { type: string; message: string; timestamp?: string }) => void) => () => void;
}

const harvester: SentraHarvesterApi = (window as any).sentraHarvester;

const display = document.getElementById('display') as HTMLPreElement;
const promptLine = document.getElementById('promptLine') as HTMLDivElement;
const cmdInput = document.getElementById('cmdInput') as HTMLInputElement;
const shell = document.getElementById('consoleShell') as HTMLDivElement;

const closeBtn = document.getElementById('closeBtn') as HTMLButtonElement;
const minimizeBtn = document.getElementById('minimizeBtn') as HTMLButtonElement;
const zoomBtn = document.getElementById('zoomBtn') as HTMLButtonElement;

// Guaranteed window close execution
function doClose() {
  try {
    if (harvester?.close) {
      harvester.close();
    } else {
      window.close();
    }
  } catch {
    window.close();
  }
}

// Window button wiring
closeBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  e.preventDefault();
  doClose();
});
closeBtn?.addEventListener('mousedown', (e) => {
  e.stopPropagation();
});

minimizeBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  e.preventDefault();
  harvester?.minimize?.();
});
minimizeBtn?.addEventListener('mousedown', (e) => {
  e.stopPropagation();
});

zoomBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  e.preventDefault();
  harvester?.zoom?.();
});
zoomBtn?.addEventListener('mousedown', (e) => {
  e.stopPropagation();
});

// ESC key closes window
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    doClose();
  }
});

// Programmatic window dragging matching internal/prompt
let dragStart: { mx: number; my: number; wx: number; wy: number } | null = null;
let dragAttempt = 0;

function cancelDrag() {
  dragAttempt += 1;
  dragStart = null;
}

document.addEventListener('mousedown', async (event) => {
  if (event.button !== 0 || !(event.target instanceof HTMLElement)) return;

  const dragSurface = shell;
  if (!dragSurface || !dragSurface.contains(event.target)) return;

  if (event.target.closest('#cmdInput, button, a, [role="button"], input, pre, .traffic-light, .traffic-lights')) {
    return;
  }

  const attempt = ++dragAttempt;
  const pos = await harvester?.getWindowPos?.();
  if (attempt !== dragAttempt || !pos) return;

  dragStart = { mx: event.screenX, my: event.screenY, wx: pos[0], wy: pos[1] };
});

document.addEventListener('mousemove', (event) => {
  if (!dragStart) return;
  if ((event.buttons & 1) === 0) {
    cancelDrag();
    return;
  }

  const dx = event.screenX - dragStart.mx;
  const dy = event.screenY - dragStart.my;
  const distance = Math.hypot(dx, dy);

  if (distance <= 2) {
    return;
  }

  harvester?.setWindowPos?.(dragStart.wx + dx, dragStart.wy + dy);
});

document.addEventListener('mouseup', cancelDrag);
window.addEventListener('blur', cancelDrag);

// Focus input on click anywhere in window
document.addEventListener('click', (e) => {
  if (e.target !== cmdInput && !(e.target as HTMLElement)?.closest('.traffic-lights')) {
    cmdInput.focus();
  }
});

function appendHtmlLine(html: string): void {
  const line = document.createElement('div');
  line.className = 'line';
  line.innerHTML = html;
  display.insertBefore(line, promptLine);
  display.scrollTop = display.scrollHeight;
}

function appendBlankLine(): void {
  const line = document.createElement('div');
  line.className = 'line blank-line';
  line.innerHTML = '&nbsp;';
  display.insertBefore(line, promptLine);
  display.scrollTop = display.scrollHeight;
}

function printWelcome(): void {
  appendHtmlLine('  <span class="bright">Retriever</span>  <span class="dim">2.0.0</span>');
  appendHtmlLine('  <span class="dim">Retriever · complete tech website archiving & AI extraction engine</span>');
  appendHtmlLine('  <span class="dim">────────────────────────────────────────────────────────────────────────</span>');
  appendBlankLine();
  appendHtmlLine('  <span class="label">engine</span>     winhttrack-v3.50           <span class="label">mode</span>      turbo-active');
  appendHtmlLine('  <span class="label">agent</span>      chrome-134-macos           <span class="label">corpus</span>    markdown-llm');
  appendHtmlLine('  <span class="label">status</span>     ready                      <span class="label">scope</span>     complete-mirror');
  appendBlankLine();
  appendHtmlLine('  <span class="dim">Gunakan pilihan exact di bawah ini untuk memulai:</span>');
  appendBlankLine();
  appendHtmlLine('  <span class="cmd">retrieve</span> <span class="dim">"https://fastapi.tiangolo.com/"</span>        <span class="dim">· complete website scrape</span>');
  appendHtmlLine('  <span class="cmd">retrieve ai/llm</span> <span class="dim">"https://fastapi.tiangolo.com/"</span> <span class="dim">· markdown untuk ai</span>');
  appendBlankLine();
  appendHtmlLine('  <span class="cmd">preview</span> <span class="dim">buka website di browser</span>     <span class="cmd">open</span>     <span class="dim">buka folder hasil</span>');
  appendHtmlLine('  <span class="cmd">profiles</span><span class="dim">daftar 6 profile</span>          <span class="cmd">exit</span>     <span class="dim">tutup console</span>');
  appendBlankLine();
  appendHtmlLine('<span class="ok">ok    </span>engine handshake active · httrack binary verified');
  appendHtmlLine('<span class="ok">ok    </span>ready');
  appendBlankLine();
}

// Subscribe to live backend logs
if (harvester?.onLog) {
  harvester.onLog((payload: any) => {
    const { type, message } = payload;
    if (type === 'file') {
      appendHtmlLine(`<span class="label">fetch </span><span class="bright">${message}</span>`);
    } else if (type === 'ok') {
      appendHtmlLine(`<span class="ok">ok    </span>${message}`);
    } else if (type === 'err') {
      appendHtmlLine(`<span class="err">error </span>${message}`);
    } else if (type === 'stats') {
      appendHtmlLine(`<span class="label">stats </span><span class="dim">${message}</span>`);
    } else {
      appendHtmlLine(`<span class="dim">      ${message}</span>`);
    }
  });
}

let pendingUrl: string | null = null;
let lastOutputDir: string | null = null;

cmdInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    const raw = cmdInput.value.trim();
    cmdInput.value = '';

    if (!raw) return;

    // Echo command line in Prompt user style
    const userEcho = document.createElement('div');
    userEcho.className = 'line type-user';
    userEcho.textContent = raw;
    display.insertBefore(userEcho, promptLine);

    // Handle interactive choice if pending
    if (pendingUrl) {
      const choice = raw.toLowerCase();
      const currentUrl = pendingUrl;
      pendingUrl = null;

      if (choice === '1' || choice === 'retrieve') {
        await startJob(currentUrl, 'full-mirror', 3);
        return;
      } else if (choice === '2' || choice.includes('ai') || choice.includes('llm')) {
        await startJob(currentUrl, 'markdown-only', 2);
        return;
      } else {
        appendHtmlLine('<span class="dim">Pilihan dibatalkan. Ketik "help" untuk melihat menu.</span>');
        appendBlankLine();
        return;
      }
    }

    const lower = raw.toLowerCase();
    const parts = raw.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (cmd === 'clear') {
      const lines = Array.from(display.querySelectorAll('.line'));
      lines.forEach((l) => l.remove());
      return;
    }

    if (cmd === 'exit' || cmd === 'quit' || cmd === 'close') {
      doClose();
      return;
    }

    if (cmd === 'help') {
      printWelcome();
      return;
    }

    if (cmd === 'stop') {
      appendHtmlLine('<span class="warn">warn  </span>Menghentikan proses scrape...');
      const res = await harvester?.stopScrape?.();
      appendHtmlLine(`<span class="ok">ok    </span>${res?.message || 'Proses dihentikan'}`);
      appendBlankLine();
      return;
    }

    if (cmd === 'preview' || cmd === 'serve' || cmd === 'view') {
      const target = args[0] || lastOutputDir || './data/scrapes';
      appendHtmlLine(`<span class="dim">Menjalankan preview server untuk: ${target}...</span>`);
      const res = await harvester?.preview?.(target);
      if (res?.ok) {
        appendHtmlLine(`<span class="ok">ok    </span>Website aktif di ${res.url}! Membuka browser...`);
        appendHtmlLine(`<span class="dim">      Root: ${res.rootDir}</span>`);
      } else {
        appendHtmlLine(`<span class="err">error </span>Gagal preview: ${res?.message || 'Server error'}`);
      }
      appendBlankLine();
      return;
    }

    if (cmd === 'open') {
      const target = args[0] || lastOutputDir || './data/scrapes';
      appendHtmlLine(`<span class="dim">Membuka folder: ${target}...</span>`);
      await harvester?.openFolder?.(target);
      appendBlankLine();
      return;
    }

    if (cmd === 'browse') {
      const target = args[0];
      if (!target) {
        appendHtmlLine('<span class="warn">warn  </span>Penggunaan: browse &lt;url atau file local index.html&gt;');
        appendBlankLine();
        return;
      }
      appendHtmlLine(`<span class="dim">Membuka browser: ${target}...</span>`);
      await harvester?.openUrl?.(target);
      appendBlankLine();
      return;
    }

    if (cmd === 'profiles') {
      const profiles = await harvester?.getProfiles?.();
      if (!profiles) return;
      appendBlankLine();
      for (const [key, p] of Object.entries(profiles) as [string, any][]) {
        appendHtmlLine(`  <span class="label">${key.padEnd(16, ' ')}</span> <span class="bright">${p.name}</span>`);
        appendHtmlLine(`  <span class="dim">                 ${p.tagline} (depth: ${p.depth})</span>`);
      }
      appendBlankLine();
      return;
    }

    // Exact command: "retrieve ai/llm <url>" or "retrieve ai <url>"
    if (
      lower.startsWith('retrieve ai/llm') ||
      lower.startsWith('retrieve-ai') ||
      lower.startsWith('retrieve ai') ||
      lower.startsWith('retrieve llm')
    ) {
      const urlCandidate = parts.find((p) => p.startsWith('http://') || p.startsWith('https://'));
      if (!urlCandidate) {
        appendHtmlLine('<span class="err">error </span>Format salah. Contoh: retrieve ai/llm https://fastapi.tiangolo.com/');
        appendBlankLine();
        return;
      }
      await startJob(urlCandidate, 'markdown-only', 2);
      return;
    }

    // Exact command: "retrieve <url> [depth]"
    if (cmd === 'retrieve') {
      const urlCandidate = args.find((p) => p.startsWith('http://') || p.startsWith('https://')) || args[0];
      if (!urlCandidate) {
        appendBlankLine();
        appendHtmlLine('  <span class="label">1</span> <span class="cmd">retrieve</span>        <span class="dim">· Complete Website Scrape (100% Offline)</span>');
        appendHtmlLine('  <span class="label">2</span> <span class="cmd">retrieve ai/llm</span> <span class="dim">· Ekstrak Markdown Bersih untuk AI / LLM</span>');
        appendHtmlLine('  <span class="dim">Masukkan URL setelah kata retrieve. Contoh: retrieve https://fastapi.tiangolo.com/</span>');
        appendBlankLine();
        return;
      }
      const depthArg = args.find((p) => !p.startsWith('http') && /^\d+$/.test(p));
      const depth = depthArg ? parseInt(depthArg, 10) : 3;
      await startJob(urlCandidate, 'full-mirror', depth);
      return;
    }

    // Direct URL pasted: prompt choice between Retrieve or Retrieve AI/LLM
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      pendingUrl = raw;
      appendBlankLine();
      appendHtmlLine(`  <span class="dim">Target URL:</span> <span class="bright">${raw}</span>`);
      appendHtmlLine('  <span class="label">[1]</span> <span class="cmd">retrieve</span>        <span class="dim">· Download Complete Website (100% Offline Mirror)</span>');
      appendHtmlLine('  <span class="label">[2]</span> <span class="cmd">retrieve ai/llm</span> <span class="dim">· Ekstrak Markdown Bersih untuk AI / LLM</span>');
      appendHtmlLine('  <span class="dim">Ketik 1 atau 2 lalu tekan Enter:</span>');
      appendBlankLine();
      return;
    }

    // Aliases
    if (cmd === 'docs') {
      const target = args[0];
      if (!target) {
        appendHtmlLine('<span class="err">error </span>Contoh: docs https://fastapi.tiangolo.com/');
        appendBlankLine();
        return;
      }
      const depth = args[1] ? parseInt(args[1], 10) : 3;
      await startJob(target, 'tech-docs', depth);
      return;
    }

    if (cmd === 'mirror') {
      const target = args[0];
      if (!target) {
        appendHtmlLine('<span class="err">error </span>Contoh: mirror https://fastapi.tiangolo.com/');
        appendBlankLine();
        return;
      }
      const depth = args[1] ? parseInt(args[1], 10) : 3;
      await startJob(target, 'full-mirror', depth);
      return;
    }

    appendHtmlLine(`<span class="err">error </span>Perintah tidak dikenal: "${raw}"`);
    appendHtmlLine('  <span class="dim">Pilihan yang tersedia:</span>');
    appendHtmlLine('  <span class="cmd">retrieve &lt;url&gt;</span>         <span class="dim">· Complete Website Scrape</span>');
    appendHtmlLine('  <span class="cmd">retrieve ai/llm &lt;url&gt;</span>  <span class="dim">· Ekstrak AI/LLM Markdown</span>');
    appendHtmlLine('  <span class="cmd">open</span>                     <span class="dim">· Buka Folder Hasil</span>');
    appendBlankLine();
  }
});

async function startJob(targetUrl: string, profile: string, depth: number) {
  const profileLabel = profile === 'markdown-only' ? 'Retrieve AI/LLM' : 'Retrieve (Complete Website)';
  appendBlankLine();
  appendHtmlLine(`<span class="ok">ok    </span>Memulai: ${profileLabel} (Depth: ${depth})`);
  appendHtmlLine(`<span class="dim">      Target: ${targetUrl}</span>`);

  try {
    const result = await harvester?.startScrape?.({
      url: targetUrl,
      profile,
      depth
    });

    if (result?.ok) {
      lastOutputDir = result.outputDir;
      appendBlankLine();
      appendHtmlLine(`<span class="ok">ok    </span>Sukses! ${result.filesScraped} files di-scrape dalam ${result.duration}s`);
      appendHtmlLine(`<span class="dim">      Output: ${result.outputDir}</span>`);
      appendHtmlLine('  <span class="dim">Ketik </span><span class="cmd">preview</span><span class="dim"> untuk langsung membuka website di browser (Local HTTP).</span>');
      appendHtmlLine('  <span class="dim">Ketik </span><span class="cmd">open</span><span class="dim"> untuk melihat folder file di Explorer.</span>');
      appendBlankLine();
    } else {
      appendBlankLine();
      appendHtmlLine(`<span class="err">error </span>${result?.message || 'Proses selesai atau dihentikan'}`);
      appendBlankLine();
    }
  } catch (err: any) {
    appendBlankLine();
    appendHtmlLine(`<span class="err">error </span>${err?.message || err}`);
    appendBlankLine();
  }
}

// Initial boot
printWelcome();
cmdInput.focus();
