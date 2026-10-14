import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('homepage avoids low-frame-rate animated image playback', async () => {
  const html = await fs.readFile(new URL('../site/index.html', import.meta.url), 'utf8');
  const animationSources = [...html.matchAll(/<img\b[^>]*src="\/media\/workflows\/(?![a-z]+-poster\.webp)[a-z]+\.webp"/g)];
  assert.equal(animationSources.length, 0, '10 fps WebP images must not be used as the visible animation source');
  assert.equal([...html.matchAll(/data-workflow-video="\/media\/workflows\/[a-z]+-web\.mp4"/g)].length, 6);
  assert.ok(html.includes('<script src="/media/workflow-playback.js" defer></script>'));
});
