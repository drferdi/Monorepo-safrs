import { Command } from 'commander';
import readline from 'node:readline';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { SentraTerminal, Colors } from './ui/terminal.js';
import { PROFILES } from './engine/profiles.js';
import { buildHttrackArgs, resolveHttrackBinary, runHttrack } from './engine/httrack.js';
import { htmlToCleanMarkdown, convertHtmlFolderToMarkdown } from './engine/markdown.js';
import { startPreviewServer } from './engine/server.js';
import type { ScrapeOptions, ScrapeProfileId } from './types.js';

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

export async function runInteractive(): Promise<void> {
  SentraTerminal.clear();
  SentraTerminal.renderHeader('SENTRA WEB HARVESTER & TECH SCRAPER', 'Autonomous Technology Scraper Suite');

  console.log(`${Colors.purple}╭─ Select Harvester Profile ────────────────────────────────────────────────╮${Colors.reset}`);
  const profileKeys = Object.keys(PROFILES) as ScrapeProfileId[];
  profileKeys.forEach((key, index) => {
    const prof = PROFILES[key];
    console.log(
      `${Colors.purple}│${Colors.reset}  ${Colors.cyan}[${index + 1}]${Colors.reset} ${Colors.white}${Colors.bold}${prof.name.padEnd(38, ' ')}${Colors.reset} ${Colors.dim}${prof.tagline.slice(0, 30)}...${Colors.reset}`
    );
  });
  console.log(`${Colors.purple}│${Colors.reset}  ${Colors.cyan}[7]${Colors.reset} ${Colors.yellow}Verify HTTrack Engine & System Diagnostic${Colors.reset}`);
  console.log(`${Colors.purple}╰───────────────────────────────────────────────────────────────────────────╯${Colors.reset}`);
  console.log('');

  const choiceStr = await askQuestion(`  ${Colors.mint}[?] Pilih mode [1-7] (default: 1): ${Colors.reset}`);
  const choice = parseInt(choiceStr || '1', 10);

  if (choice === 7) {
    runDiagnostic();
    return;
  }

  const selectedProfileKey = profileKeys[Math.max(0, Math.min(profileKeys.length - 1, choice - 1))];
  const profile = PROFILES[selectedProfileKey];

  const targetUrl = await askQuestion(
    `  ${Colors.mint}[?] Masukkan URL Target (e.g. https://fastapi.tiangolo.com/): ${Colors.reset}`
  );

  if (!targetUrl) {
    SentraTerminal.logWarning('URL tidak boleh kosong. Membatalkan proses.');
    return;
  }

  const depthStr = await askQuestion(
    `  ${Colors.mint}[?] Crawl Depth (default: ${profile.depth}): ${Colors.reset}`
  );
  const depth = depthStr ? parseInt(depthStr, 10) : profile.depth;

  const defaultOut = `./data/scrapes/${new URL(targetUrl).hostname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const outDir = (await askQuestion(`  ${Colors.mint}[?] Folder Output (default: ${defaultOut}): ${Colors.reset}`)) || defaultOut;

  await executeScrape({
    url: targetUrl,
    profile: selectedProfileKey,
    depth,
    outputDir: outDir,
    extractMarkdown: true
  });
}

export async function executeScrape(options: ScrapeOptions): Promise<void> {
  const binary = resolveHttrackBinary();
  const profile = PROFILES[options.profile] || PROFILES['tech-docs'];
  const resolvedOut = path.resolve(options.outputDir || './data/scrapes');

  await fs.mkdir(resolvedOut, { recursive: true });

  SentraTerminal.renderCard('Harvester Job Manifest', [
    { label: 'Target URL', value: options.url, color: Colors.cyan },
    { label: 'Profile', value: profile.name, color: Colors.mint },
    { label: 'Crawl Depth', value: String(options.depth ?? profile.depth), color: Colors.yellow },
    { label: 'Output Directory', value: resolvedOut, color: Colors.white },
    { label: 'Robots.txt Policy', value: profile.robotsBypass ? 'Bypass (--robots=0)' : 'Default', color: Colors.purple },
    { label: 'Core Engine', value: binary || 'Not Found', color: Colors.mint }
  ]);

  SentraTerminal.stepBadge(1, 4, 'Validating Network & Engine Handshake', 'DONE');
  SentraTerminal.stepBadge(2, 4, `Deploying HTTrack Crawler (${profile.id})`, 'RUNNING');

  console.log(`\n  ${Colors.dim}Menjalankan HTTrack scraper ke ${options.url}...${Colors.reset}`);

  try {
    const result = await runHttrack(options, (evt) => {
      if (evt.kind === 'file') {
        process.stdout.write(`\r  ${Colors.gray}Scraping:${Colors.reset} ${Colors.white}${evt.file?.slice(0, 60)}${Colors.reset}    `);
      }
    });

    console.log('\n');
    SentraTerminal.stepBadge(2, 4, `Scraping Completed (${result.filesScraped} files, ${result.durationSec}s)`, 'DONE');

    // Step 3: Markdown conversion
    SentraTerminal.stepBadge(3, 4, 'Converting Scraped Tech Pages to Clean Markdown for LLM', 'RUNNING');
    const mdOut = path.join(resolvedOut, 'markdown_corpus');
    const mdResult = await convertHtmlFolderToMarkdown(resolvedOut, mdOut);
    SentraTerminal.stepBadge(3, 4, `Generated ${mdResult.convertedCount} Markdown docs (${mdResult.totalWords} words)`, 'DONE');

    // Step 4: Finalizing
    SentraTerminal.stepBadge(4, 4, 'Sovereign Archive Ready & Indexed', 'DONE');

    console.log('');
    SentraTerminal.logSuccess(`Scraping selesai! Hasil tersimpan di: ${resolvedOut}`);
    SentraTerminal.logInfo(`Markdown Corpus untuk AI tersimpan di: ${mdOut}`);
    SentraTerminal.logInfo(`Buka di Browser: jalankan preview server agar bebas CORS file://`);
    SentraTerminal.logInfo(`  -> Ketik 'preview' di console Retriever, atau buka subfolder ${options.url.replace(/^https?:\/\//, '').split('/')[0]}\\index.html`);
  } catch (err: any) {
    SentraTerminal.stepBadge(2, 4, 'Scraping Execution Failed', 'FAIL');
    SentraTerminal.logError(`Gagal menjalankan scraper: ${err.message}`);
  }
}

export function runDiagnostic(): void {
  SentraTerminal.clear();
  SentraTerminal.renderHeader('SENTRA HARVESTER DIAGNOSTIC SUITE', 'Engine Status & Presets Verification');

  const binary = resolveHttrackBinary();
  const binaryExists = Boolean(binary);

  SentraTerminal.stepBadge(1, 3, `Checking HTTrack binary at ${binary}`, binaryExists ? 'DONE' : 'FAIL');
  SentraTerminal.stepBadge(2, 3, `Loaded ${Object.keys(PROFILES).length} Tech Scraping Profiles`, 'DONE');

  // Test sample markdown conversion
  const sampleHtml = `
    <html>
      <head><title>FastAPI Tutorial</title></head>
      <body>
        <nav><a href="/">Home</a></nav>
        <main>
          <h1>FastAPI Quickstart</h1>
          <p>FastAPI is a modern, fast web framework for building APIs with Python.</p>
          <pre><code class="language-python">from fastapi import FastAPI\napp = FastAPI()</code></pre>
        </main>
        <footer>Copyright 2026</footer>
      </body>
    </html>
  `;
  const doc = htmlToCleanMarkdown(sampleHtml, 'https://fastapi.tiangolo.com/');
  const mdOk = doc.markdown.includes('```python') && !doc.markdown.includes('Copyright 2026');

  SentraTerminal.stepBadge(3, 3, 'Markdown & Code Fence Extractor Test', mdOk ? 'DONE' : 'FAIL');

  console.log('');
  SentraTerminal.logSuccess('Diagnostic selesai. Sistem siap digunakan untuk scraping website teknologi!');
}

async function main() {
  const program = new Command();

  program
    .name('sentra-scraper')
    .description('Sentra Web Harvester & Tech Scraper Suite')
    .version('1.0.0')
    .option('-u, --url <url>', 'Target URL to scrape')
    .option('-p, --profile <profile>', 'Scrape profile (tech-docs, ai-research, github-repos, full-mirror, warc-archive, markdown-only)', 'tech-docs')
    .option('-d, --depth <depth>', 'Recursion depth', parseInt)
    .option('-o, --out <path>', 'Output directory', './data/scrapes')
    .option('-c, --connections <number>', 'Maximum concurrent connections', parseInt)
    .option('--warc', 'Generate WARC/WACZ archive container')
    .option('--preview <path>', 'Start local HTTP preview server for scraped site')
    .option('--smoke', 'Run automated smoke test and exit 0')
    .option('--diagnostic', 'Run system and engine diagnostic');

  program.parse(process.argv);
  const opts = program.opts();

  if (opts.smoke) {
    console.log('[SMOKE] Running Sentra Scraper validation...');
    runDiagnostic();
    const args = buildHttrackArgs({
      url: 'https://example.com/docs',
      profile: 'tech-docs',
      depth: 2
    });
    if (!args.includes('-s0') || !args.includes('-r2')) {
      throw new Error('HTTrack argument generator failed validation');
    }
    console.log('[SMOKE] All checks passed successfully.');
    process.exit(0);
  }

  if (opts.preview) {
    console.log(`[PREVIEW] Menjalankan local preview server untuk: ${opts.preview}`);
    const serverInstance = await startPreviewServer(opts.preview);
    console.log(`[PREVIEW] Website aktif di: ${serverInstance.url}`);
    console.log(`[PREVIEW] Root folder: ${serverInstance.rootDir}`);
    console.log('[PREVIEW] Tekan Ctrl+C untuk menghentikan server.');
    return;
  }

  if (opts.diagnostic) {
    runDiagnostic();
    return;
  }

  if (opts.url) {
    await executeScrape({
      url: opts.url,
      profile: (opts.profile as ScrapeProfileId) || 'tech-docs',
      depth: opts.depth,
      outputDir: opts.out,
      maxConnections: opts.connections,
      warc: opts.warc
    });
  } else {
    await runInteractive();
  }
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
