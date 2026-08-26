#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyRecursive } from './lib/fs-utils.mjs';
import { upsertManagedBlock, patchPackageScripts } from './lib/install-utils.mjs';

const args = process.argv.slice(2);
const valueOf = flag => { const i=args.indexOf(flag); return i>=0 ? args[i+1] : null; };
const dryRun = args.includes('--dry-run');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, '../..');
const repoRoot = path.resolve(valueOf('--repo') || process.cwd());

function read(rel, fallback='') { const p=path.join(packageRoot, rel); return fs.existsSync(p)?fs.readFileSync(p,'utf8'):fallback; }
function write(rel, content) { const p=path.join(repoRoot, rel); if (dryRun) return; fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,content); }

const overlayPaths = [
  '.agents/skills/sentra-gsap',
  '.claude/skills/sentra-gsap',
  '.claude/commands/Sentra-GSAP.md',
  'scripts/sentra-gsap',
  'tests/sentra-gsap',
  'docs/standards/sentra-gsap',
];
if (path.resolve(packageRoot) !== path.resolve(repoRoot)) {
  for (const rel of overlayPaths) {
    const src=path.join(packageRoot,rel), dst=path.join(repoRoot,rel);
    if (!dryRun) copyRecursive(src,dst);
  }
}

for (const file of ['AGENTS.md','CLAUDE.md']) {
  const existingPath=path.join(repoRoot,file);
  const existing=fs.existsSync(existingPath)?fs.readFileSync(existingPath,'utf8'):'';
  const block=read(`integration/${file.replace('.md','')}.block.md`).trim();
  write(file,upsertManagedBlock(existing,'SENTRA-GSAP',block));
}

const gi=path.join(repoRoot,'.gitignore');
const giExisting=fs.existsSync(gi)?fs.readFileSync(gi,'utf8'):'';
write('.gitignore',upsertManagedBlock(giExisting,'SENTRA-GSAP-ARTIFACTS','.sentra-gsap/'));

const pkgPath=path.join(repoRoot,'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));
  if (!dryRun) fs.writeFileSync(pkgPath,`${JSON.stringify(patchPackageScripts(pkg),null,2)}\n`);
}

const configPath=path.join(repoRoot,'sentra-gsap.config.mjs');
if (!fs.existsSync(configPath) && !dryRun) fs.copyFileSync(path.join(packageRoot,'templates/sentra-gsap.config.mjs'),configPath);

console.log(`${dryRun?'DRY RUN — ':''}Sentra-GSAP Standard v1.0.0 installation ${dryRun?'planned':'complete'} for ${repoRoot}`);
console.log('Canonical skill: .agents/skills/sentra-gsap/SKILL.md');
console.log('Verify: pnpm sentra:gsap:verify -- --url http://localhost:3000 (or equivalent package manager)');
