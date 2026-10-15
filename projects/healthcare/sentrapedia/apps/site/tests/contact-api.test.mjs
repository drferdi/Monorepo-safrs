import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createContactHandler } from '../scripts/contact.mjs';
import vercelContact from '../api/contact.mjs';

const valid = {
  name: 'Penguji Sintetis',
  email: 'tester@example.test',
  company: '',
  phone: '',
  message: 'Pertanyaan umum tentang dokumentasi.',
  website: '',
  consent: true
};

async function withServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await run(base); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

function post(base, headers = {}) {
  return fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(valid) });
}

test('Vercel contact function refuses non-POST and fails closed without delivery settings', async () => {
  await withServer(vercelContact, async base => {
    const get = await fetch(base);
    assert.equal(get.status, 405);
    assert.equal(get.headers.get('allow'), 'POST');
    await get.arrayBuffer();
    const response = await post(base);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).status, 'unavailable');
  });
});

test('contact rate limit is per forwarded visitor, not per proxy socket', async () => {
  const handler = createContactHandler({
    apiKey: 'test-key',
    from: 'verified@example.test',
    fetchEmail: async () => new Response(JSON.stringify({ id: 'mock-id' }))
  });
  await withServer(handler, async base => {
    for (let i = 0; i < 5; i++) {
      const response = await post(base, { 'X-Forwarded-For': '203.0.113.1, 10.0.0.1' });
      assert.equal(response.status, 202);
      await response.arrayBuffer();
    }
    const limited = await post(base, { 'X-Forwarded-For': '203.0.113.1' });
    assert.equal(limited.status, 429);
    await limited.arrayBuffer();
    const other = await post(base, { 'X-Forwarded-For': '198.51.100.7' });
    assert.equal(other.status, 202);
    await other.arrayBuffer();
  });
});
