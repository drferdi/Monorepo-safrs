import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsRoot = path.join(root, 'docs', 'spds');
const requiredFrontmatter = [
  'document_id',
  'title',
  'status',
  'authority',
  'owner',
  'version',
  'created',
  'last_verified',
  'applies_to',
  'source_of_truth',
  'agent_readable',
  'agent_editable',
  'human_approval_required',
  'classification',
  'review_trigger'
];

async function markdownFiles(folder) {
  const files = [];
  for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
    const target = path.join(folder, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(target));
    else if (entry.name.endsWith('.md')) files.push(target);
  }
  return files;
}

const errors = [];
const files = await markdownFiles(docsRoot);
// The document index is the inventory: every document is listed there and every listed document exists.
const indexText = await fs.readFile(path.join(docsRoot, 'document_index.md'), 'utf8');
const listed = new Set([...indexText.matchAll(/\]\(([^)#]+\.md)\)/g)].map(match => path.posix.normalize(match[1])));
listed.add('document_index.md');
const found = new Set(files.map(file => path.relative(docsRoot, file).replaceAll('\\', '/')));
for (const name of found) if (!listed.has(name)) errors.push(`Not in document_index.md: ${name}`);
for (const name of listed) if (!found.has(name)) errors.push(`Listed in document_index.md but missing: ${name}`);

for (const file of files) {
  const relative = path.relative(docsRoot, file).replaceAll('\\', '/');
  if (relative !== relative.toLowerCase()) errors.push(`Filename must be lowercase: ${relative}`);
  const text = await fs.readFile(file, 'utf8');
  const header = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1];
  if (!header) {
    errors.push(`Missing YAML frontmatter: ${relative}`);
    continue;
  }
  for (const field of requiredFrontmatter) {
    if (!new RegExp(`^${field}:`, 'm').test(header)) errors.push(`Missing ${field}: ${relative}`);
  }
  if (!/^## Function$/m.test(text)) errors.push(`Missing Function section: ${relative}`);
  if (/\b(?:TBD|TODO|placeholder text)\b/i.test(text)) errors.push(`Unresolved placeholder: ${relative}`);
}

const genome = await fs.readFile(path.join(root, 'SITE_GENOME.yaml'), 'utf8');
for (const field of ['project_id', 'purpose', 'authority_order', 'agent_entry_points', 'constraints', 'evidence_locations', 'unknowns']) {
  if (!new RegExp(`^${field}:`, 'm').test(genome)) errors.push(`Genome missing ${field}`);
}

const medicalUse = await fs.readFile(path.join(docsRoot, 'intended_medical_use.md'), 'utf8');
if (!medicalUse.includes('Intended medical use is none')) errors.push('Non-device intended-use boundary is missing');
const safety = await fs.readFile(path.join(docsRoot, 'software_safety_classification.md'), 'utf8');
if (!safety.includes('IEC 62304 software safety classification is not applicable')) errors.push('IEC 62304 non-applicability is missing');

console.log(JSON.stringify({ documents: files.length, errors }, null, 2));
if (errors.length) process.exitCode = 1;
