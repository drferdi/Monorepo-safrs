import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../scripts/serve.mjs';

test('desktop and mobile menus provide direct HTTPS access to the beta login', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const html = await (await fetch(`http://127.0.0.1:${server.address().port}/`)).text();
    const desktop = html.slice(html.indexOf('<header '), html.indexOf('</header>'));
    const mobile = html.slice(html.indexOf('<div id="mobile-menu"'), html.indexOf('<div id="awwwards"'));
    const desktopNavigation = desktop.match(/<ul id="menu-main-menu-de"[\s\S]*?<\/ul>/)?.[0] ?? '';
    assert.match(desktopNavigation, /<li\b[^>]*class="menu-item"[^>]*><a href="https:\/\/beta\.sentrapedia\.com\/sign-in">Masuk<\/a><\/li>/, 'login belongs to the same primary menu as the other navigation entries');
    for (const menu of [desktop, mobile]) {
      const links = [...menu.matchAll(/<a\b([^>]*)>Masuk<\/a>/g)];
      assert.equal(links.length, 1, 'each navigation has exactly one login entry');
      assert.match(links[0][1], /href="https:\/\/beta\.sentrapedia\.com\/sign-in"/);
      assert.doesNotMatch(links[0][1], /target=|onclick=/, 'login uses ordinary same-tab navigation');
      const requests = [...menu.matchAll(/<a\b([^>]*)>Ajukan akses<\/a>/g)];
      assert.equal(requests.length, 1, 'each navigation has one request-access entry');
      assert.match(requests[0][1], /href="https:\/\/beta\.sentrapedia\.com\/apply"/);
      assert.doesNotMatch(requests[0][1], /target=|onclick=/);
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
