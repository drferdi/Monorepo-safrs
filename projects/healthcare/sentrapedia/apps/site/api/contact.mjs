// Vercel Function for the public contact form; the local server uses the same handler in scripts/serve.mjs.
import { createContactHandler } from '../scripts/contact.mjs';

const handleContact = createContactHandler();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { Allow: 'POST', 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ status: 'invalid', message: 'Metode tidak didukung.' }));
    return;
  }
  await handleContact(req, res);
}
