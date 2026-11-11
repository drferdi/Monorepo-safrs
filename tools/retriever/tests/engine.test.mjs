import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHttrackArgs, resolveHttrackBinary } from '../dist/engine/httrack.js';
import { htmlToCleanMarkdown } from '../dist/engine/markdown.js';
import { PROFILES } from '../dist/engine/profiles.js';

test('resolveHttrackBinary finds installed HTTrack', () => {
  const binary = resolveHttrackBinary();
  assert.ok(binary, 'Binary path should not be null');
  assert.match(binary, /httrack(\.exe)?$/i);
});

test('buildHttrackArgs generates modern tech flags for tech-docs', () => {
  const args = buildHttrackArgs({
    url: 'https://fastapi.tiangolo.com',
    profile: 'tech-docs',
    depth: 3
  });

  assert.ok(args.includes('https://fastapi.tiangolo.com'));
  assert.ok(args.includes('-r3'), 'Should include depth -r3');
  assert.ok(args.includes('-s0'), 'Should include robots bypass');
  assert.ok(args.includes('-K0'), 'Should include relative link rewrite');
  assert.ok(args.includes('-%I'), 'Should include searchable index flag');
  assert.ok(args.some(a => a.includes('Mozilla/5.0')), 'Should spoof modern User-Agent');
});

test('buildHttrackArgs adds --warc flag for warc-archive profile', () => {
  const args = buildHttrackArgs({
    url: 'https://docs.python.org/3/',
    profile: 'warc-archive'
  });

  assert.ok(args.includes('--warc'), 'Should include --warc');
});

test('htmlToCleanMarkdown converts technical article with code blocks', () => {
  const sample = `
    <html>
      <head><title>Rust Async Guide</title></head>
      <body>
        <nav><a href="/home">Home</a></nav>
        <article>
          <h1>Async in Rust</h1>
          <p>Here is an example of async function in Rust:</p>
          <pre><code class="language-rust">async fn fetch_data() -> Result<String, Error> {
    Ok("done".to_string())
}</code></pre>
        </article>
        <div class="cookie-banner">Accept all cookies</div>
        <footer>Page footer</footer>
      </body>
    </html>
  `;

  const doc = htmlToCleanMarkdown(sample, 'https://example.com/rust-async');
  assert.equal(doc.title, 'Async in Rust');
  assert.ok(doc.markdown.includes('# Async in Rust'));
  assert.ok(doc.markdown.includes('```rust'));
  assert.ok(doc.markdown.includes('async fn fetch_data()'));
  assert.ok(!doc.markdown.includes('Accept all cookies'), 'Should strip cookie banner');
  assert.ok(!doc.markdown.includes('Page footer'), 'Should strip footer');
});
