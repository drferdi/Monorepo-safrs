#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from './lib/config.mjs';
import { buildBrowserMatrix, normalizeBaseUrl, routeUrl } from './lib/browser.mjs';
import { ensureVisualReviewTemplate } from './lib/review.mjs';

const args = process.argv.slice(2);
const valueOf = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i+1] : null; };
const repoRoot = path.resolve(valueOf('--repo') || process.cwd());
const config = await loadConfig(repoRoot, valueOf('--config'));
const baseUrl = normalizeBaseUrl(valueOf('--url') || process.env.SENTRA_GSAP_URL || config.browser.url);
const reportDir = path.resolve(repoRoot, config.reportDir);
const screenshotDir = path.resolve(repoRoot, config.screenshotDir);
fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(screenshotDir, { recursive: true });

if (!baseUrl) {
  console.error('SENTRA-GSAP QA FAIL: no app URL. Use --url http://localhost:3000 or SENTRA_GSAP_URL.');
  process.exit(2);
}

let pw;
try { pw = await import('@playwright/test'); }
catch {
  console.error('SENTRA-GSAP QA FAIL: @playwright/test is required for browser QA.');
  process.exit(2);
}

const matrix = buildBrowserMatrix(config.browser);
const results = [];
const screenshots = [];

async function inspectPage(page) {
  const data = await page.evaluate(() => {
    const overflow = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
    const imgsMissingAlt = [...document.querySelectorAll('img:not([alt])')].length;
    const mainCount = document.querySelectorAll('main').length;
    const h1Count = document.querySelectorAll('h1').length;
    const unnamedButtons = [...document.querySelectorAll('button')].filter(el => !((el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim())).length;
    const unnamedLinks = [...document.querySelectorAll('a[href]')].filter(el => !((el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim())).length;
    return { overflow, imgsMissingAlt, mainCount, h1Count, unnamedButtons, unnamedLinks, cls: window.__sentraQA?.cls || 0, longTasks: window.__sentraQA?.longTasks || [] };
  });
  return data;
}

async function prepare(page, errors) {
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
  await page.addInitScript(() => {
    window.__sentraQA = { cls: 0, longTasks: [] };
    try {
      new PerformanceObserver(list => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__sentraQA.cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {}
    try {
      new PerformanceObserver(list => {
        for (const e of list.getEntries()) window.__sentraQA.longTasks.push(e.duration);
      }).observe({ type: 'longtask', buffered: true });
    } catch {}
  });
}

for (const item of matrix) {
  const browserType = pw[item.browser];
  if (!browserType) continue;
  const browser = await browserType.launch({ headless: true });
  try {
    for (const route of config.browser.routes) {
      const errors = [];
      const context = await browser.newContext({
        viewport: { width: item.width, height: item.height },
        hasTouch: Boolean(item.touch),
        isMobile: item.browser === 'chromium' && Boolean(item.touch) && item.viewportName === 'mobile',
      });
      const page = await context.newPage();
      await prepare(page, errors);
      const url = routeUrl(baseUrl, route);
      let navigationError = null;
      try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        if (response && response.status() >= 400) navigationError = `HTTP ${response.status()}`;
        await page.waitForTimeout(config.browser.settleMs);
        const maxScroll = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
        for (let i = 1; i <= 6; i++) {
          await page.evaluate(y => scrollTo(0, y), Math.round(maxScroll * i / 6));
          await page.waitForTimeout(90);
        }
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForTimeout(150);
      } catch (e) { navigationError = e.message; }
      const metrics = navigationError ? null : await inspectPage(page);
      let keyboard = null;
      if (!navigationError) {
        keyboard = await page.evaluate(() => ({ focusable: document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])').length }));
        if (keyboard.focusable > 0) {
          await page.keyboard.press('Tab');
          keyboard.afterTab = await page.evaluate(() => {
            const el = document.activeElement;
            if (!el || el === document.body) return { moved: false, visible: false, tag: 'BODY' };
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            return { moved: true, visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none', tag: el.tagName };
          });
        }
      }
      const safeRoute = route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
      const shotName = `${item.browser}-${item.viewportName}-${safeRoute}.png`;
      const shotPath = path.join(screenshotDir, shotName);
      if (!navigationError) {
        await page.screenshot({ path: shotPath, fullPage: false });
        screenshots.push(path.relative(repoRoot, shotPath).replaceAll('\\', '/'));
      }
      const failures = [];
      if (navigationError) failures.push(navigationError);
      if (errors.length > config.thresholds.consoleErrors) failures.push(`${errors.length} console/page error(s)`);
      if (metrics) {
        if (metrics.overflow > config.thresholds.horizontalOverflowPx) failures.push(`global horizontal overflow ${metrics.overflow}px`);
        if (metrics.imgsMissingAlt) failures.push(`${metrics.imgsMissingAlt} image(s) missing alt`);
        if (metrics.mainCount !== 1) failures.push(`expected exactly 1 <main>, found ${metrics.mainCount}`);
        if (metrics.h1Count < 1) failures.push('missing <h1>');
        if (metrics.unnamedButtons) failures.push(`${metrics.unnamedButtons} unnamed button(s)`);
        if (metrics.unnamedLinks) failures.push(`${metrics.unnamedLinks} unnamed link(s)`);
        if (keyboard?.focusable > 0 && (!keyboard.afterTab?.moved || !keyboard.afterTab?.visible)) failures.push('keyboard Tab did not reach a visible focusable element');
        if (metrics.cls > config.thresholds.cls) failures.push(`CLS ${metrics.cls.toFixed(3)} > ${config.thresholds.cls}`);
        const maxLong = Math.max(0, ...(metrics.longTasks || []));
        if (maxLong > config.thresholds.maxLongTaskMs) failures.push(`long task ${maxLong.toFixed(0)}ms > ${config.thresholds.maxLongTaskMs}ms`);
      }
      results.push({ ...item, route, url, status: failures.length ? 'fail' : 'pass', failures, errors, metrics, keyboard });
      await context.close();
    }
  } finally { await browser.close(); }
}

// Reduced-motion smoke checks in Chromium at mobile + desktop.
for (const viewportName of ['mobile','desktop']) {
  const vp = config.browser.viewports[viewportName];
  const browser = await pw.chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: Boolean(vp.touch), reducedMotion: 'reduce' });
  const page = await context.newPage(); const errors = []; await prepare(page, errors);
  try {
    await page.goto(routeUrl(baseUrl, config.browser.routes[0]), { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(config.browser.settleMs);
    const matches = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
    results.push({ browser: 'chromium', viewportName, route: config.browser.routes[0], mode: 'reduced-motion', status: matches && errors.length === 0 ? 'pass' : 'fail', failures: matches ? errors : ['reduced-motion media emulation not observed'], errors });
  } finally { await context.close(); await browser.close(); }
}

// Multi-route experiences require at least one configured route round-trip journey.
if ((config.browser.routes || []).length > 1 && !(config.browser.journeys || []).length) {
  results.push({ mode: 'route-round-trip', status: 'fail', failures: ['multiple routes configured but browser.journeys is empty'] });
}

// Configured route-transition journeys on Chromium desktop/mobile.
for (const journey of config.browser.journeys || []) {
  for (const viewportName of ['mobile','desktop']) {
    const vp = config.browser.viewports[viewportName];
    const browser = await pw.chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: Boolean(vp.touch) });
    const page = await context.newPage(); const errors = []; await prepare(page, errors);
    const failures = [];
    try {
      await page.goto(routeUrl(baseUrl, journey.from), { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(config.browser.settleMs);
      const beforePins = await page.locator('.pin-spacer').count();
      await page.locator(journey.click).first().click({ timeout: 10_000 });
      if (journey.expectPath) await page.waitForURL(url => url.pathname === journey.expectPath, { timeout: 15_000 });
      await page.waitForTimeout(config.browser.settleMs);
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(config.browser.settleMs);
      const afterPins = await page.locator('.pin-spacer').count();
      if (afterPins > beforePins) failures.push(`pin-spacer count grew ${beforePins} → ${afterPins} after route round-trip`);
      if (errors.length) failures.push(`${errors.length} console/page error(s)`);
    } catch (e) { failures.push(e.message); }
    results.push({ browser:'chromium', viewportName, journey: journey.name, mode:'route-round-trip', status: failures.length ? 'fail':'pass', failures, errors });
    await context.close(); await browser.close();
  }
}

const report = { standardVersion: config.standardVersion, generatedAt: new Date().toISOString(), baseUrl, results, screenshots, verdict: results.every(r => r.status === 'pass') ? 'PASS' : 'FAIL' };
fs.writeFileSync(path.join(reportDir, 'browser-qa.json'), `${JSON.stringify(report, null, 2)}\n`);
ensureVisualReviewTemplate(repoRoot, config, screenshots);
console.log(`SENTRA-GSAP browser QA: ${report.verdict} (${results.filter(r=>r.status==='pass').length}/${results.length} checks passed)`);
process.exit(report.verdict === 'PASS' ? 0 : 1);
