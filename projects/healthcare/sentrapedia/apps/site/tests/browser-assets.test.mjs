import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';

test('browser assembly keeps feature helpers private and runs initializers in order', async () => {
  const { assembleBrowserScript } = await import('../scripts/browser-assets.mjs');
  const root = await mkdtemp(path.join(os.tmpdir(), 'site-browser-'));
  try {
    await mkdir(path.join(root, 'assets'), {recursive:true});
    await mkdir(path.join(root, 'scripts/browser'), {recursive:true});
    for (const [name, body] of Object.entries({menu:'calls.push("menu")',cards:'calls.push("cards")',contact:'calls.push("contact")',reveal:'calls.push("reveal")'})) {
      await writeFile(path.join(root, `scripts/browser/${name}.js`), `function init${name[0].toUpperCase()+name.slice(1)}() { ${body}; }`);
    }
    await writeFile(path.join(root,'assets/design-audit.js'), 'initMenu(); initCards(); initContact(); initReveal();');
    const context = {calls:[]};
    vm.runInNewContext(await assembleBrowserScript(root, 'design-audit.js'), context);
    assert.deepEqual(context.calls, ['menu','cards','contact','reveal']);
    assert.equal(context.initMenu, undefined);
  } finally { await rm(root,{recursive:true,force:true}); }
});
