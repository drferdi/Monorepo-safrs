const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadRegistry, findTemplate } = require('../dist/src/registry/template-registry.js');

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sentra-registry-'));
  fs.mkdirSync(path.join(root,'templates','leadership','executive'), {recursive:true});
  const template = { id:'executive-chief-of-staff', version:'1.0.0', identity:{title:'Executive Chief of Staff'} };
  fs.writeFileSync(path.join(root,'templates','leadership','executive','template.json'), JSON.stringify(template));
  fs.writeFileSync(path.join(root,'templates','registry.json'), JSON.stringify({version:'1.0.0', templates:[{id:template.id,path:'templates/leadership/executive/template.json',category:'leadership',title:template.identity.title}]}));
  return root;
}

test('loads registry metadata from repository root', () => {
  const root = fixtureRoot();
  const registry = loadRegistry(root);
  assert.equal(registry.templates.length, 1);
  assert.equal(registry.templates[0].id, 'executive-chief-of-staff');
});

test('finds and parses a template by id', () => {
  const root = fixtureRoot();
  const template = findTemplate('executive-chief-of-staff', root);
  assert.equal(template.identity.title, 'Executive Chief of Staff');
});

test('throws a clear error for an unknown template id', () => {
  const root = fixtureRoot();
  assert.throws(() => findTemplate('missing', root), /Unknown template id/);
});
