import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createContactHandler } from './contact.mjs';

const valid = {
  name: 'Penguji Sintetis',
  email: 'tester@example.test',
  company: '',
  phone: '',
  message: 'Pertanyaan umum tentang dokumentasi.',
  website: '',
  consent: true
};

async function withHandler(options, run) {
  const server = http.createServer(createContactHandler(options));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await run(base); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

function post(base, body, headers = {}) {
  return fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
}

test('contact fails closed until verified sender and key exist', async () => {
  await withHandler({ apiKey: '', from: '' }, async base => {
    const response = await post(base, valid);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).status, 'unavailable');
  });
});

test('contact accepts only a confirmed Resend response to fixed recipient', async () => {
  let sent;
  await withHandler({
    apiKey: 'test-key',
    from: 'verified@example.test',
    fetchEmail: async (url, options) => {
      sent = { url, options };
      return new Response(JSON.stringify({ id: 'mock-id' }), { status: 200 });
    }
  }, async base => {
    const response = await post(base, valid);
    assert.equal(response.status, 202);
    assert.equal((await response.json()).status, 'accepted');
  });
  assert.equal(sent.url, 'https://api.resend.com/emails');
  const payload = JSON.parse(sent.options.body);
  assert.deepEqual(payload.to, ['drferdiiskandar@sentrahai.com']);
  assert.equal(payload.from, 'Sentrapedia <verified@example.test>');
  assert.match(payload.text, /Pertanyaan umum tentang dokumentasi/);
});

test('contact rejects malformed, patient-like, and honeypot submissions', async () => {
  let sends = 0;
  await withHandler({ apiKey: 'test-key', from: 'verified@example.test', fetchEmail: async () => { sends++; return new Response('{}'); } }, async base => {
    for (const body of [
      { ...valid, email: 'invalid' },
      { ...valid, message: 'NIK: 1234567890123456' },
      { ...valid, website: 'spam.example' },
      { ...valid, consent: false }
    ]) {
      const response = await post(base, body);
      assert.equal(response.status, 400);
      await response.arrayBuffer();
    }
  });
  assert.equal(sends, 0);
});

test('contact limits repeated submissions and refuses cross-origin requests', async () => {
  let sends = 0;
  await withHandler({ apiKey: 'test-key', from: 'verified@example.test', fetchEmail: async () => { sends++; return new Response(JSON.stringify({ id: 'mock-id' })); } }, async base => {
    const crossOrigin = await post(base, valid, { Origin: 'https://example.invalid' });
    assert.equal(crossOrigin.status, 403);
    await crossOrigin.arrayBuffer();
    for (let i = 0; i < 5; i++) {
      const response = await post(base, valid);
      assert.equal(response.status, 202);
      await response.arrayBuffer();
    }
    const limited = await post(base, valid);
    assert.equal(limited.status, 429);
    await limited.arrayBuffer();
  });
  assert.equal(sends, 5);
});

test('contact accepts the explicitly configured HTTPS origin only', async () => {
  let sends = 0;
  await withHandler({
    apiKey: 'test-key',
    from: 'verified@example.test',
    publicOrigin: 'https://sentrapedia.example',
    fetchEmail: async () => {
      sends++;
      return new Response(JSON.stringify({ id: 'mock-id' }));
    }
  }, async base => {
    const accepted = await post(base, valid, { Origin: 'https://sentrapedia.example' });
    assert.equal(accepted.status, 202);
    await accepted.arrayBuffer();
    const rejected = await post(base, valid, { Origin: base });
    assert.equal(rejected.status, 403);
    await rejected.arrayBuffer();
  });
  assert.equal(sends, 1);
});
