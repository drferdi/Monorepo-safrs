import fs from 'node:fs';
import path from 'node:path';

export function computeVerdict(gates) {
  for (const gate of gates) {
    if (gate.required && gate.status !== 'pass') return 'FAIL';
    if (gate.status === 'fail') return 'FAIL';
  }
  return 'PASS';
}

export function toMarkdown(report) {
  const lines = [
    '# Sentra-GSAP Quality Gate',
    '',
    `**Standard:** ${report.standardVersion}`,
    `**Generated:** ${report.generatedAt}`,
    `**Overall:** ${report.verdict}`,
    '',
    '| Gate | Required | Status | Detail |',
    '|---|---:|---|---|',
  ];
  for (const g of report.gates) {
    lines.push(`| ${escapeCell(g.label || g.id)} | ${g.required ? 'Yes' : 'No'} | ${String(g.status).toUpperCase()} | ${escapeCell(g.detail || '')} |`);
  }
  if (report.findings?.length) {
    lines.push('', '## Findings', '');
    for (const f of report.findings) lines.push(`- **${f.severity.toUpperCase()} · ${f.ruleId}** — \`${f.file}\`: ${f.message}`);
  }
  lines.push('', report.verdict === 'PASS'
    ? '> SENTRA-GSAP PASS — required evidence is present and every required gate passed.'
    : '> SENTRA-GSAP FAIL — implementation must not be represented as production-ready under this standard.');
  return `${lines.join('\n')}\n`;
}

function escapeCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

export function writeReport(repoRoot, config, report) {
  const dir = path.resolve(repoRoot, config.reportDir);
  fs.mkdirSync(dir, { recursive: true });
  const jsonPath = path.join(dir, 'sentra-gsap-report.json');
  const mdPath = path.join(dir, 'sentra-gsap-report.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, toMarkdown(report));
  return { jsonPath, mdPath };
}
