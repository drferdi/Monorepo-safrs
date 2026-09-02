const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('repository template validation CLI exits zero and validates all 50 templates', () => {
  const result = spawnSync(process.execPath, [path.join(process.cwd(),'dist/src/cli/validate-templates.js')], {cwd:process.cwd(),encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Validated 50 templates: 50 valid, 0 invalid/);
});
