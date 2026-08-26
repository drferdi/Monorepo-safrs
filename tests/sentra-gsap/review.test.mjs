import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateVisualReview } from '../../scripts/sentra-gsap/lib/review.mjs';
import { mergeConfig } from '../../scripts/sentra-gsap/lib/config.mjs';

test('independent visual review requires real evidence and threshold scores', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sentra-review-'));
  fs.mkdirSync(path.join(root, '.sentra-gsap/reviews'), { recursive: true });
  fs.mkdirSync(path.join(root, '.sentra-gsap/screenshots'), { recursive: true });
  fs.writeFileSync(path.join(root, '.sentra-gsap/screenshots/home.png'), 'x');
  const scores = Object.fromEntries(['hierarchy','timing','easing','typography','scroll','microinteraction','mobileAdaptation','transitionCoherence','restraint','polishAccessibility'].map(k => [k, 5]));
  fs.writeFileSync(path.join(root, '.sentra-gsap/reviews/visual-review.json'), JSON.stringify({
    standardVersion:'1.0.0', reviewer:{name:'Fresh reviewer',independent:true},
    evidence:{screenshots:['.sentra-gsap/screenshots/home.png']}, scores, blockingIssues:[], verdict:'PASS'
  }));
  assert.equal(validateVisualReview(root, mergeConfig()).status, 'pass');
});

test('pending or non-independent review fails', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sentra-review-'));
  fs.mkdirSync(path.join(root, '.sentra-gsap/reviews'), { recursive: true });
  fs.writeFileSync(path.join(root, '.sentra-gsap/reviews/visual-review.json'), JSON.stringify({ verdict:'PENDING', reviewer:{independent:false} }));
  assert.equal(validateVisualReview(root, mergeConfig()).status, 'fail');
});
