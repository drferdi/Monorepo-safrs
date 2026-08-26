import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBrowserMatrix } from '../../scripts/sentra-gsap/lib/browser.mjs';

test('browser matrix gives Chromium full responsive coverage and cross-browser desktop/mobile coverage', () => {
  const matrix = buildBrowserMatrix({
    browsers: ['chromium','firefox','webkit'],
    viewports: {
      mobile: { width: 390, height: 844, touch: true },
      tablet: { width: 768, height: 1024, touch: true },
      laptop: { width: 1024, height: 768, touch: false },
      desktop: { width: 1440, height: 900, touch: false },
    },
  });
  assert.equal(matrix.filter(x => x.browser === 'chromium').length, 4);
  assert.equal(matrix.filter(x => x.browser === 'firefox').length, 2);
  assert.equal(matrix.filter(x => x.browser === 'webkit').length, 2);
  assert.ok(matrix.some(x => x.browser === 'webkit' && x.viewportName === 'mobile'));
});
