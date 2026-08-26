import test from 'node:test';
import assert from 'node:assert/strict';
import { computeVerdict } from '../../scripts/sentra-gsap/lib/report.mjs';

test('required missing evidence fails the gate', () => {
  const verdict = computeVerdict([
    { id: 'static', required: true, status: 'pass' },
    { id: 'browser', required: true, status: 'not-run' },
  ]);
  assert.equal(verdict, 'FAIL');
});

test('warnings do not fail when all required gates pass', () => {
  const verdict = computeVerdict([
    { id: 'static', required: true, status: 'pass' },
    { id: 'browser', required: true, status: 'pass' },
    { id: 'advisory', required: false, status: 'warn' },
  ]);
  assert.equal(verdict, 'PASS');
});
