import fs from 'node:fs';
import path from 'node:path';

export const REVIEW_CATEGORIES = [
  'hierarchy','timing','easing','typography','scroll','microinteraction',
  'mobileAdaptation','transitionCoherence','restraint','polishAccessibility',
];

export function validateVisualReview(repoRoot, config) {
  const file = path.resolve(repoRoot, config.visualReviewFile);
  if (!fs.existsSync(file)) return { status: 'not-run', detail: `Missing ${config.visualReviewFile}` };
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return { status: 'fail', detail: 'Visual review JSON is invalid.' }; }

  if (data.standardVersion && data.standardVersion !== config.standardVersion) return { status: 'fail', detail: `Visual review standard ${data.standardVersion} does not match ${config.standardVersion}.` };
  if (data.verdict !== 'PASS') return { status: 'fail', detail: `Visual review verdict is ${data.verdict || 'missing'}.` };
  if (!String(data.reviewer?.name || '').trim()) return { status: 'fail', detail: 'Visual review reviewer.name is required.' };
  if (config.requiredGates.independentVisualReview && data.reviewer?.independent !== true) {
    return { status: 'fail', detail: 'Independent visual review is required.' };
  }
  if (!Array.isArray(data.evidence?.screenshots) || data.evidence.screenshots.length === 0) {
    return { status: 'fail', detail: 'Visual review has no screenshot evidence.' };
  }
  const missingScreens = data.evidence.screenshots.filter(p => !fs.existsSync(path.resolve(repoRoot, p)));
  if (missingScreens.length) return { status: 'fail', detail: `Visual review references ${missingScreens.length} missing screenshot(s).` };
  if (Array.isArray(data.blockingIssues) && data.blockingIssues.length) {
    return { status: 'fail', detail: `Visual review has ${data.blockingIssues.length} blocking issue(s).` };
  }
  const scores = REVIEW_CATEGORIES.map(k => Number(data.scores?.[k]));
  if (scores.some(v => !Number.isFinite(v))) return { status: 'fail', detail: 'Visual review scores are incomplete.' };
  const min = Math.min(...scores);
  const avg = scores.reduce((a,b)=>a+b,0) / scores.length;
  if (min < config.thresholds.minVisualScore || avg < config.thresholds.minVisualAverage) {
    return { status: 'fail', detail: `Visual review below threshold (min ${min.toFixed(1)}, avg ${avg.toFixed(2)}).` };
  }
  return { status: 'pass', detail: `Independent review PASS (min ${min.toFixed(1)}, avg ${avg.toFixed(2)}).` };
}

export function ensureVisualReviewTemplate(repoRoot, config, screenshots = []) {
  const file = path.resolve(repoRoot, config.visualReviewFile);
  if (fs.existsSync(file)) return file;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const scores = Object.fromEntries(REVIEW_CATEGORIES.map(k => [k, null]));
  const data = {
    standardVersion: config.standardVersion,
    reviewer: { name: '', mode: 'independent-agent', independent: true },
    evidence: { browserReport: `${config.reportDir}/browser-qa.json`, screenshots },
    scores,
    blockingIssues: [],
    notes: [],
    verdict: 'PENDING',
  };
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  return file;
}
