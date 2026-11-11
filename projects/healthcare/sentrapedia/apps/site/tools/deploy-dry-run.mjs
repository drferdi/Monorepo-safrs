import { readFile, stat } from 'node:fs/promises';

const home = await readFile(new URL('../site/index.html', import.meta.url), 'utf8');
const faq = await readFile(new URL('../site/faq/index.html', import.meta.url), 'utf8');
if (!home.includes('<title>Sentrapedia</title>') || !home.includes('href="#featured-projects"')) {
  throw new Error('Homepage identity or primary route missing');
}
if (!faq.includes('<title>') || !faq.includes('<details')) throw new Error('FAQ output missing');
for (const page of ['privasi', 'ketentuan', 'penafian']) {
  const legal = await readFile(new URL(`../site/${page}/index.html`, import.meta.url), 'utf8');
  if (!legal.includes('<title>') || !legal.includes('class="legal-toc"')) throw new Error(`${page} output missing`);
}
for (const relative of ['site/media/design-audit.css', 'site/media/workflows/soap-web.mp4', 'site/assets/brand/favicon.png']) {
  await stat(new URL(`../${relative}`, import.meta.url));
}
console.log('Deploy dry-run passed; no files published or external service called.');
