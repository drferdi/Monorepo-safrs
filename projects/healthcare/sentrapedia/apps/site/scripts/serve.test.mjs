import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from './serve.mjs';

test('static server preserves local routes, ranges and submission isolation', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const homepage = await fetch(base);
    assert.equal(homepage.status, 200);
    assert.match(homepage.headers.get('content-security-policy'), /form-action 'self'/);
    assert.match(await homepage.text(), /<title>Sentrapedia<\/title>/);
    const asset = '/media/workflows/soap-web.mp4';
    const head = await fetch(base + asset, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('content-type'), 'video/mp4');
    assert.equal((await head.arrayBuffer()).byteLength, 0);
    const range = await fetch(base + asset, { headers: { Range: 'bytes=0-31' } });
    assert.equal(range.status, 206);
    assert.match(range.headers.get('content-range'), /^bytes 0-31\//);
    assert.equal((await range.arrayBuffer()).byteLength, 32);
    for (const value of ['bytes=999999999-', 'bytes=30-2', 'bytes=oops']) {
      const response = await fetch(base + asset, { headers: { Range: value } });
      assert.equal(response.status, 416);
      await response.arrayBuffer();
    }
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const response = await fetch(base + '/api/unavailable', { method });
      assert.equal(response.status, 501);
      assert.equal((await response.json()).status, 'unavailable');
    }
    for (const [route, status] of [['/missing.html', 404], ['/%ZZ', 400], ['/%2e%2e%2fpackage.json', 403], ['/..%5cpackage.json', 403]]) {
      const response = await fetch(base + route);
      assert.equal(response.status, status, route);
      await response.arrayBuffer();
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
