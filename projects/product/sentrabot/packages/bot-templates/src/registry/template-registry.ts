declare const require: any;
declare const process: any;

const fs = require('node:fs');
const path = require('node:path');

export interface RegistryEntry {
  id: string;
  path: string;
  category: string;
  title: string;
  featured?: boolean;
}

export interface TemplateRegistry {
  version: string;
  generatedAt?: string;
  templates: RegistryEntry[];
}

export function loadRegistry(rootDir: string = process.cwd()): TemplateRegistry {
  const registryPath = path.join(rootDir, 'templates', 'registry.json');
  if (!fs.existsSync(registryPath)) throw new Error(`Template registry not found: ${registryPath}`);
  const parsed = JSON.parse(fs.readFileSync(registryPath, 'utf8')) as TemplateRegistry;
  if (!parsed.version || !Array.isArray(parsed.templates)) throw new Error('Invalid template registry format.');
  return parsed;
}

export function findTemplate(id: string, rootDir: string = process.cwd()): any {
  const registry = loadRegistry(rootDir);
  const entry = registry.templates.find(item => item.id === id);
  if (!entry) throw new Error(`Unknown template id: ${id}`);
  const templatePath = path.join(rootDir, entry.path);
  if (!fs.existsSync(templatePath)) throw new Error(`Template file missing for ${id}: ${templatePath}`);
  return JSON.parse(fs.readFileSync(templatePath, 'utf8'));
}
