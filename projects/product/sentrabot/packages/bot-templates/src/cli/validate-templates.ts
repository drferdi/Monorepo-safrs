declare const process: any;
declare const require: any;
declare const module: any;

import { loadRegistry, findTemplate } from '../registry/template-registry';
import { validateTemplate } from '../validation/template-validator';
import type { BotTemplate } from '../domain/types';

export function validateRepository(rootDir: string = process.cwd()): { valid: number; invalid: number; warnings: number } {
  const registry = loadRegistry(rootDir);
  let valid = 0;
  let invalid = 0;
  let warnings = 0;

  for (const entry of registry.templates) {
    const template = findTemplate(entry.id, rootDir) as BotTemplate;
    const result = validateTemplate(template);
    warnings += result.issues.filter(issue => issue.severity === 'warning').length;
    if (result.valid) {
      valid += 1;
    } else {
      invalid += 1;
      console.error(`INVALID ${entry.id}`);
      for (const issue of result.issues.filter(issue => issue.severity === 'error')) {
        console.error(`  - [${issue.code}] ${issue.path}: ${issue.message}`);
      }
    }
  }

  console.log(`Validated ${registry.templates.length} templates: ${valid} valid, ${invalid} invalid, ${warnings} warnings.`);
  return { valid, invalid, warnings };
}

if (typeof require !== 'undefined' && require.main === module) {
  const result = validateRepository(process.cwd());
  process.exitCode = result.invalid === 0 ? 0 : 1;
}
