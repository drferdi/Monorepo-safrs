const RECIPIENT = 'drferdiiskandar@sentrahai.com';
const MAX_BODY_BYTES = 4096;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function json(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(body));
}

function trimField(value, maxLength) {
  return typeof value === 'string' && value.length <= maxLength ? value.trim() : null;
}

export function validateContact(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const name = trimField(body.name, 120);
  const email = trimField(body.email, 254);
  const company = trimField(body.company, 160);
  const phone = trimField(body.phone, 40);
  const message = trimField(body.message, 1000);
  const website = trimField(body.website, 100);
  if (!name || !email || company === null || phone === null || !message || website === null || website || body.consent !== true) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (/[\r\n]/.test(name + email + company + phone)) return null;
  if (/\b\d{10,16}\b|\b(?:nik|no\.?\s*rm|rekam medis|tanggal lahir)\s*[:#]/i.test(message)) return null;
  return { name, email, company, phone, message };
}

export async function sendContactViaResend(contact, { apiKey, from, fetchEmail = fetch } = {}) {
  if (!apiKey || !from || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) return null;
  const body = [
    `Nama: ${contact.name}`,
    `Email: ${contact.email}`,
    `Institusi: ${contact.company || '—'}`,
    `Telepon: ${contact.phone || '—'}`,
    '',
    contact.message
  ].join('\n');
  const response = await fetchEmail('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: `Sentrapedia <${from}>`,
      to: [RECIPIENT],
      subject: 'Pertanyaan umum Sentrapedia',
      text: body
    }),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) return null;
  const result = await response.json();
  return typeof result.id === 'string' && result.id ? result.id : null;
}

export function createContactHandler({
  apiKey = process.env.RESEND_API_KEY,
  from = process.env.RESEND_FROM_EMAIL,
  publicOrigin = process.env.CONTACT_PUBLIC_ORIGIN,
  fetchEmail = fetch,
  now = Date.now
} = {}) {
  const attempts = new Map();
  return async (req, res) => {
    const origin = req.headers.origin;
    if (origin && origin !== (publicOrigin || `http://${req.headers.host}`)) {
      json(res, 403, { status: 'rejected', message: 'Origin tidak diizinkan.' });
      return;
    }
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
      json(res, 415, { status: 'invalid', message: 'Format formulir tidak didukung.' });
      return;
    }
    // Behind a proxy (Vercel) the socket is the proxy; the first forwarded address is the visitor.
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const recent = (attempts.get(ip) || []).filter(time => now() - time < WINDOW_MS);
    if (recent.length >= MAX_ATTEMPTS) {
      json(res, 429, { status: 'limited', message: 'Terlalu banyak percobaan. Coba lagi nanti.' });
      return;
    }
    recent.push(now());
    attempts.set(ip, recent);

    let raw = '';
    let tooLarge = false;
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
        tooLarge = true;
        break;
      }
    }
    if (tooLarge) {
      json(res, 413, { status: 'invalid', message: 'Pesan terlalu panjang.' });
      return;
    }
    let input;
    try { input = JSON.parse(raw); }
    catch { json(res, 400, { status: 'invalid', message: 'Formulir tidak valid.' }); return; }
    const contact = validateContact(input);
    if (!contact) {
      json(res, 400, { status: 'invalid', message: 'Periksa isian. Jangan cantumkan identitas atau informasi pasien.' });
      return;
    }
    if (!apiKey || !from) {
      json(res, 503, { status: 'unavailable', message: 'Layanan pengiriman belum tersedia.' });
      return;
    }
    try {
      const id = await sendContactViaResend(contact, { apiKey, from, fetchEmail });
      if (!id) throw new Error('resend-rejected');
      json(res, 202, { status: 'accepted' });
    } catch {
      json(res, 502, { status: 'unavailable', message: 'Layanan pengiriman gagal menerima pesan.' });
    }
  };
}
