#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, detectPackageManager, resolveAutoCommand } from './lib/config.mjs';
import { collectTextFiles, readJson } from './lib/fs-utils.mjs';
import { auditTextFiles } from './lib/rules.mjs';
import { runCommand } from './lib/process.mjs';
import { computeVerdict, writeReport } from './lib/report.mjs';
import { validateVisualReview } from './lib/review.mjs';

const args = process.argv.slice(2);
const valueOf = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i+1] : null; };
const repoRoot = path.resolve(valueOf('--repo') || process.cwd());
const config = await loadConfig(repoRoot, valueOf('--config'));
const packageJson = readJson(path.join(repoRoot, 'package.json'), { scripts: {} });
const pm = detectPackageManager(repoRoot);
const gates = [];
const files = collectTextFiles(repoRoot, config.scanPaths, config.ignore);
const findings = auditTextFiles(files);
const errors = findings.filter(f => f.severity === 'error');

gates.push({ id:'static', label:'GSAP Architecture', required: config.requiredGates.staticAudit, status: errors.length ? 'fail':'pass', detail: `${errors.length} error(s), ${findings.filter(f=>f.severity==='warn').length} warning(s)` });

for (const kind of ['typecheck','lint','test','build']) {
  const required = Boolean(config.requiredGates[kind]);
  const command = resolveAutoCommand(kind, config.commands[kind], packageJson.scripts || {}, pm);
  if (!command) {
    gates.push({ id:kind, label:kind[0].toUpperCase()+kind.slice(1), required, status:'not-run', detail:`No command resolved. Configure commands.${kind}.` });
    continue;
  }
  const result = runCommand(command, repoRoot);
  gates.push({ id:kind, label:kind[0].toUpperCase()+kind.slice(1), required, status: result.code === 0 ? 'pass':'fail', detail:`${command} → exit ${result.code} (${result.durationMs}ms)`, commandResult: { code:result.code, stdout:result.stdout.slice(-3000), stderr:result.stderr.slice(-3000) } });
}

const url = valueOf('--url') || process.env.SENTRA_GSAP_URL || config.browser.url;
if (url) {
  const qa = runCommand(`node scripts/sentra-gsap/browser-qa.mjs --url ${JSON.stringify(url)}`, repoRoot);
  gates.push({ id:'browser', label:'Browser QA', required: config.requiredGates.browser, status: qa.code === 0 ? 'pass':'fail', detail:`browser-qa → exit ${qa.code}` });
} else {
  gates.push({ id:'browser', label:'Browser QA', required: config.requiredGates.browser, status:'not-run', detail:'No app URL configured. Set browser.url, SENTRA_GSAP_URL, or --url.' });
}

const review = validateVisualReview(repoRoot, config);
gates.push({ id:'visual-review', label:'Visual Quality Review', required: config.requiredGates.visualReview, status: review.status, detail: review.detail });

const report = { standardVersion: config.standardVersion, generatedAt: new Date().toISOString(), repoRoot, verdict: computeVerdict(gates), gates, findings };
const paths = writeReport(repoRoot, config, report);
console.log(`\nSENTRA-GSAP QUALITY GATE: ${report.verdict}`);
for (const g of gates) console.log(`${String(g.status).toUpperCase().padEnd(7)} ${g.label}${g.required ? ' [required]' : ''} — ${g.detail}`);
console.log(`Report: ${path.relative(repoRoot, paths.mdPath)}`);
process.exit(report.verdict === 'PASS' ? 0 : 1);
