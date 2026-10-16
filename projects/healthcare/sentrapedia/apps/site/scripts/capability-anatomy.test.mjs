import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from './serve.mjs';
import { featureTargets } from '../assets/capability-anatomy.js';
import { renderCapabilityAnatomy } from './capability-anatomy.mjs';

test('selection raises exactly one real cartridge and rejects invalid targets', () => {
  assert.deepEqual(featureTargets(3, 1), [0, 1, 0]);
  assert.deepEqual(featureTargets(18, 17), [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
  assert.throws(() => featureTargets(18, 18), RangeError);
  assert.throws(() => featureTargets(0, 0), RangeError);
});

test('generated solid parts do not occupy the same volume at rest', () => {
  for (const kind of ['gateway', 'modes']) {
    const figure = renderCapabilityAnatomy(kind);
    assert.ok(figure.count >= 40 && figure.count <= 80);
    for (let i = 0; i < figure.pieces.length; i++) for (let j = i + 1; j < figure.pieces.length; j++) {
      const a = figure.pieces[i], b = figure.pieces[j];
      const overlap = a.min.every((min, axis) => Math.min(a.max[axis], b.max[axis]) - Math.max(min, b.min[axis]) > .001);
      assert.equal(overlap, false, kind + ': ' + a.name + ' and ' + b.name + ' must meet, not intersect');
    }
  }
});

test('gateway and clinical modes are accessible SVG mechanisms instead of static feature pictures', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const html = await (await fetch('http://127.0.0.1:' + server.address().port)).text();
    const explorer = html.slice(html.indexOf('class="clinical-capability-viewport"'), html.indexOf('id="clinical-principles"'));
    assert.equal([...explorer.matchAll(/data-feature-anatomy="(?:gateway|modes)"/g)].length, 2, 'both requested panels contain a live anatomy figure');
    assert.equal([...explorer.matchAll(/class="iso-svg capability-anatomy-svg"/g)].length, 2);
    assert.equal([...explorer.matchAll(/data-cartridge="\d+"/g)].length, 18, 'the documentation mechanism actually has eighteen cartridges');
    assert.equal([...explorer.matchAll(/data-feature-step="/g)].length, 4, 'both mechanisms expose previous and next controls');
    assert.doesNotMatch(explorer, /src="\/media\/capabilities\/(?:03-cloud-agent|06-clinical-modes)\.webp"/, 'requested SVG panels cannot silently retain the old raster illustrations');
    assert.match(explorer, /data-capability-surface="cyan"/);
    assert.match(explorer, /data-capability-surface="blue"/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
