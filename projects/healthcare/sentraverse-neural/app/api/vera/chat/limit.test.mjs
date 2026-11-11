import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MESSAGE_LIMIT, takeMessage } from './limit.ts';

// Minimal stand-in for the Upstash REST pipeline: SET NX EX, INCR, TTL on one key.
function fakeUpstash() {
  const counters = new Map();
  const keys = [];
  const fetchFn = async (url, init) => {
    assert.equal(url, 'https://kv.example/pipeline');
    assert.equal(init.headers.Authorization, 'Bearer test-only');
    const [[, key], [, incrKey], [, ttlKey]] = JSON.parse(init.body);
    assert.equal(incrKey, key);
    assert.equal(ttlKey, key);
    keys.push(key);
    counters.set(key, (counters.get(key) ?? 0) + 1);
    return Response.json([{ result: 'OK' }, { result: counters.get(key) }, { result: 3600 }]);
  };
  return { fetchFn, keys };
}

const store = { url: 'https://kv.example', token: 'test-only' };

test('durable store allows the daily limit, then blocks with the remaining TTL', async () => {
  const { fetchFn } = fakeUpstash();
  for (let i = 0; i < MESSAGE_LIMIT; i++) assert.equal(await takeMessage('203.0.113.7', 0, store, fetchFn), null);
  assert.equal(await takeMessage('203.0.113.7', 0, store, fetchFn), 3600);
  assert.equal(await takeMessage('198.51.100.2', 0, store, fetchFn), null);
});

test('durable store never receives the raw visitor IP', async () => {
  const { fetchFn, keys } = fakeUpstash();
  await takeMessage('203.0.113.7', 0, store, fetchFn);
  assert.match(keys[0], /^vera:msgs:[0-9a-f]{32}$/);
});

test('unreachable store falls back to the per-instance limit', async () => {
  const failing = async () => { throw new Error('offline'); };
  for (let i = 0; i < MESSAGE_LIMIT; i++) assert.equal(await takeMessage('192.0.2.9', 1000, store, failing), null);
  assert.equal(await takeMessage('192.0.2.9', 1000, store, failing), 24 * 60 * 60);
});

test('without a configured store the per-instance limit still applies', async () => {
  for (let i = 0; i < MESSAGE_LIMIT; i++) assert.equal(await takeMessage('192.0.2.10', 0, null), null);
  assert.ok((await takeMessage('192.0.2.10', 0, null)) > 0);
});
