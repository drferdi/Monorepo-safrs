import test from 'node:test';
import assert from 'node:assert/strict';
import { lintSource } from '../scripts/lint.mjs';

test('lint rejects syntax errors and executable debugger or dynamic code', () => {
  assert.ok(lintSource('broken.ts', 'const = ;').length);
  for (const source of ['debugger;', 'eval("1");', 'new Function("return 1");']) {
    assert.ok(lintSource('unsafe.ts', source).length);
  }
});

test('lint does not confuse comments and strings with executable code', () => {
  assert.deepEqual(lintSource('safe.ts', '// debugger;\nconst text: string = "eval()";'), []);
});
