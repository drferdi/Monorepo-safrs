export function upsertManagedBlock(original, id, body) {
  const begin = `<!-- BEGIN ${id} -->`;
  const end = `<!-- END ${id} -->`;
  const block = `${begin}\n${String(body).trim()}\n${end}`;
  const pattern = new RegExp(`${escapeRegExp(begin)}[\\s\\S]*?${escapeRegExp(end)}`, 'm');
  if (pattern.test(original)) return `${original.replace(pattern, block).trimEnd()}\n`;
  const prefix = original.trimEnd();
  return `${prefix}${prefix ? '\n\n' : ''}${block}\n`;
}

export function patchPackageScripts(pkg) {
  return {
    ...pkg,
    scripts: {
      ...(pkg.scripts || {}),
      'sentra:gsap:verify': 'node scripts/sentra-gsap/verify.mjs',
      'sentra:gsap:qa': 'node scripts/sentra-gsap/browser-qa.mjs',
      'sentra:gsap:install': 'node scripts/sentra-gsap/install.mjs',
      'sentra:gsap:test-standard': 'node --test tests/sentra-gsap/*.test.mjs',
    },
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
