import fs from 'node:fs';
import path from 'node:path';

const TEXT_EXT = /\.(?:[cm]?[jt]sx?|vue|svelte|css|scss|sass|less|md|json|yaml|yml|npmrc)$/i;

export function collectTextFiles(repoRoot, scanPaths, ignoreNames = []) {
  const out = [];
  const ignore = new Set(ignoreNames);
  const roots = scanPaths
    .map(p => path.resolve(repoRoot, p))
    .filter(p => fs.existsSync(p));
  if (fs.existsSync(path.join(repoRoot, '.npmrc'))) roots.push(path.join(repoRoot, '.npmrc'));

  const visit = p => {
    let stat;
    try { stat = fs.statSync(p); } catch { return; }
    if (stat.isDirectory()) {
      if (ignore.has(path.basename(p))) return;
      for (const name of fs.readdirSync(p)) visit(path.join(p, name));
      return;
    }
    if (!TEXT_EXT.test(p) && path.basename(p) !== '.npmrc') return;
    try {
      const text = fs.readFileSync(p, 'utf8');
      if (text.length <= 2_000_000) out.push({ path: path.relative(repoRoot, p).replaceAll('\\', '/'), text });
    } catch {}
  };
  for (const root of [...new Set(roots)]) visit(root);
  return out;
}

export function readJson(file, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

export function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

export function copyRecursive(src, dst) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    ensureDir(dst);
    for (const name of fs.readdirSync(src)) copyRecursive(path.join(src, name), path.join(dst, name));
  } else {
    ensureDir(path.dirname(dst));
    fs.copyFileSync(src, dst);
  }
}
