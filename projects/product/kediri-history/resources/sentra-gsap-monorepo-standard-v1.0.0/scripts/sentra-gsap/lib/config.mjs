import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_CONFIG = Object.freeze({
  standardVersion: '1.0.0',
  scanPaths: ['apps', 'packages', 'src'],
  ignore: ['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.turbo', '.sentra-gsap'],
  requiredGates: {
    staticAudit: true,
    typecheck: true,
    lint: true,
    test: true,
    build: true,
    browser: true,
    visualReview: true,
    independentVisualReview: true,
  },
  commands: {
    typecheck: 'auto',
    lint: 'auto',
    test: 'auto',
    build: 'auto',
  },
  browser: {
    url: null,
    routes: ['/'],
    browsers: ['chromium', 'firefox', 'webkit'],
    viewports: {
      mobile: { width: 390, height: 844, touch: true },
      tablet: { width: 768, height: 1024, touch: true },
      laptop: { width: 1024, height: 768, touch: false },
      desktop: { width: 1440, height: 900, touch: false },
    },
    journeys: [],
    settleMs: 700,
  },
  thresholds: {
    cls: 0.1,
    horizontalOverflowPx: 2,
    consoleErrors: 0,
    maxLongTaskMs: 200,
    minVisualScore: 4,
    minVisualAverage: 4.2,
  },
  reportDir: '.sentra-gsap/reports',
  screenshotDir: '.sentra-gsap/screenshots',
  visualReviewFile: '.sentra-gsap/reviews/visual-review.json',
});

const COMMAND_ALIASES = {
  typecheck: ['typecheck', 'check:types', 'check-types', 'types', 'type-check'],
  lint: ['lint'],
  test: ['test', 'test:unit', 'unit'],
  build: ['build'],
};

export function mergeConfig(user = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...user,
    requiredGates: { ...DEFAULT_CONFIG.requiredGates, ...(user.requiredGates || {}) },
    commands: { ...DEFAULT_CONFIG.commands, ...(user.commands || {}) },
    browser: {
      ...DEFAULT_CONFIG.browser,
      ...(user.browser || {}),
      viewports: { ...DEFAULT_CONFIG.browser.viewports, ...(user.browser?.viewports || {}) },
    },
    thresholds: { ...DEFAULT_CONFIG.thresholds, ...(user.thresholds || {}) },
  };
}

export function detectPackageManager(repoRoot) {
  let pkg = {};
  const packagePath = path.join(repoRoot, 'package.json');
  if (fs.existsSync(packagePath)) {
    try { pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8')); } catch {}
  }
  const declared = String(pkg.packageManager || '').split('@')[0];
  if (['pnpm', 'npm', 'yarn', 'bun'].includes(declared)) return declared;
  if (fs.existsSync(path.join(repoRoot, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(repoRoot, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(repoRoot, 'bun.lockb')) || fs.existsSync(path.join(repoRoot, 'bun.lock'))) return 'bun';
  return 'npm';
}

function runner(pm, script) {
  if (pm === 'yarn') return `yarn ${script}`;
  if (pm === 'bun') return `bun run ${script}`;
  return `${pm} run ${script}`;
}

export function resolveAutoCommand(kind, configured, scripts = {}, packageManager = 'npm') {
  if (configured === false || configured == null) return null;
  if (configured !== 'auto') return String(configured);
  const alias = (COMMAND_ALIASES[kind] || []).find(name => Object.hasOwn(scripts, name));
  return alias ? runner(packageManager, alias) : null;
}

export async function loadConfig(repoRoot, explicitPath) {
  const candidate = explicitPath
    ? path.resolve(repoRoot, explicitPath)
    : path.join(repoRoot, 'sentra-gsap.config.mjs');
  if (!fs.existsSync(candidate)) return mergeConfig();
  const mod = await import(`${pathToFileURL(candidate).href}?v=${Date.now()}`);
  return mergeConfig(mod.default || {});
}
