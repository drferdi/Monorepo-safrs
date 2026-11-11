import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { PROFILES } from './profiles.js';
import type { ScrapeOptions, TelemetryEvent } from '../types.js';

export const HTTRACK_CANDIDATE_PATHS = [
  'C:\\Program Files\\WinHTTrack\\httrack.exe',
  'C:\\Program Files (x86)\\WinHTTrack\\httrack.exe',
  'httrack.exe',
  'httrack'
];

export function resolveHttrackBinary(): string | null {
  for (const candidate of HTTRACK_CANDIDATE_PATHS) {
    if (candidate.includes('\\')) {
      if (existsSync(candidate)) return candidate;
    }
  }
  return 'C:\\Program Files\\WinHTTrack\\httrack.exe';
}

export function buildHttrackArgs(options: ScrapeOptions): string[] {
  const profile = PROFILES[options.profile] || PROFILES['tech-docs'];
  const depth = options.depth ?? profile.depth;
  const connections = options.maxConnections ?? profile.maxConnections;
  const outputDir = path.resolve(options.outputDir || './data/scrapes');

  const args: string[] = [
    options.url,
    `-O`, outputDir,
    `-r${depth}`,
    `-c${connections}`,
    `-F`, profile.userAgent
  ];

  // Robots handling
  const bypassRobots = options.bypassRobots ?? profile.robotsBypass;
  if (bypassRobots) {
    args.push(`-s0`); // Robots.txt bypass for docs
  }

  // Link rewriting & local mirror navigation
  if (profile.rewriteLinks) {
    args.push(`-K0`); // Relative links
    args.push(`-k`);  // Cache files
  }

  // Search index
  if (profile.createSearchIndex) {
    args.push(`-%I`); // Generate searchable index
    args.push(`-%i`); // Generate top index
  }

  // WARC/WACZ archive
  if (options.warc || profile.createWarc) {
    args.push(`--warc`);
  }

  // Priority & filters
  args.push(`-p3`); // Save all matching files

  for (const filter of profile.includeMimes) {
    args.push(filter);
  }
  for (const filter of profile.excludeMimes) {
    args.push(filter);
  }
  for (const pattern of profile.excludePatterns) {
    args.push(pattern);
  }

  // Verbose display format
  args.push(`-v`);

  // Non-interactive quiet mode (never prompt on existing directories)
  args.push(`-q`);

  return args;
}

export interface RunHttrackResult {
  exitCode: number;
  outputDir: string;
  filesScraped: number;
  durationSec: number;
}

export function runHttrack(
  options: ScrapeOptions,
  onTelemetry?: (event: TelemetryEvent) => void
): Promise<RunHttrackResult> {
  return new Promise((resolve, reject) => {
    const binary = resolveHttrackBinary();
    if (!binary || !existsSync(binary)) {
      const err = new Error(`HTTrack executable not found at: ${binary}`);
      if (onTelemetry) onTelemetry({ kind: 'error', message: err.message });
      return reject(err);
    }

    const args = buildHttrackArgs(options);
    const outputDir = path.resolve(options.outputDir || './data/scrapes');
    const startTime = Date.now();
    let fileCount = 0;

    if (onTelemetry) {
      onTelemetry({
        kind: 'start',
        message: `Spawning HTTrack engine with ${options.profile} profile on ${options.url}`,
        url: options.url
      });
    }

    const proc = spawn(binary, args, {
      shell: false,
      windowsHide: true
    });

    proc.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8');
      const lines = text.split(/\r?\n/).filter(Boolean);

      for (const line of lines) {
        if (line.includes('Transferring') || line.includes('File: ') || line.includes('-->')) {
          fileCount++;
          if (onTelemetry) {
            onTelemetry({
              kind: 'file',
              message: line.trim(),
              file: line.trim()
            });
          }
        } else if (line.includes('bytes') || line.includes('KiB') || line.includes('MiB')) {
          if (onTelemetry) {
            onTelemetry({
              kind: 'stats',
              message: line.trim()
            });
          }
        }
      }
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8');
      if (onTelemetry) {
        onTelemetry({ kind: 'progress', message: text.trim() });
      }
    });

    proc.on('close', (code) => {
      const durationSec = Math.round((Date.now() - startTime) / 1000);
      const exitCode = code ?? 0;

      if (onTelemetry) {
        onTelemetry({
          kind: 'done',
          message: `HTTrack finished with exit code ${exitCode}`,
          elapsedSec: durationSec
        });
      }

      resolve({
        exitCode,
        outputDir,
        filesScraped: fileCount,
        durationSec
      });
    });

    proc.on('error', (err) => {
      if (onTelemetry) {
        onTelemetry({ kind: 'error', message: err.message });
      }
      reject(err);
    });
  });
}
