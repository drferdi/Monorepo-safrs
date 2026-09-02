const test = require('node:test');
const assert = require('node:assert/strict');
const { compilePrompt } = require('../dist/src/runtime/prompt-compiler.js');

test('compiles prompt layers in ascending priority order', () => {
  const output = compilePrompt([
    {id:'role',priority:50,content:'ROLE OVERLAY'},
    {id:'system-core',priority:10,content:'SYSTEM CORE',safetyBoundary:true},
    {id:'indonesia',priority:30,content:'INDONESIA POLICY',safetyBoundary:true}
  ]);
  assert.ok(output.indexOf('SYSTEM CORE') < output.indexOf('INDONESIA POLICY'));
  assert.ok(output.indexOf('INDONESIA POLICY') < output.indexOf('ROLE OVERLAY'));
});

test('marks safety-boundary layers explicitly', () => {
  const output = compilePrompt([{id:'core',priority:1,content:'Never bypass approvals.',safetyBoundary:true}]);
  assert.match(output, /SAFETY_BOUNDARY:ENFORCED/);
  assert.match(output, /Never bypass approvals\./);
});

test('rejects duplicate layer ids', () => {
  assert.throws(() => compilePrompt([
    {id:'same',priority:1,content:'A'},
    {id:'same',priority:2,content:'B'}
  ]), /Duplicate prompt layer id/);
});
