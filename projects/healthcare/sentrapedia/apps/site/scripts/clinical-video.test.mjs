import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from './serve.mjs';
import { renderClinicalNote } from './clinical-note.mjs';
import { clinicalNote } from '../assets/clinical-note.config.mjs';

test('clinical narrative preserves video, content and local assets', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const homepage = await fetch(base);
    assert.equal(homepage.status, 200);
    const html = await homepage.text();
    const section = html.slice(html.indexOf('<section id="home-bottom"'), html.indexOf('</main>'));
    assert.ok(section.includes('id="clinical-title"'), 'clinical reasoning section exists');
    assert.doesNotMatch(section, /<video\b[^>]*\bcontrols\b/);
    assert.match(section, /class="clinical-video-toggle" aria-label="Putar video"/);
    assert.match(section, /<source src="\/media\/sentrapedia-solusi\.mp4" type="video\/mp4">/);
    assert.equal([...section.matchAll(/class="clinical-stage"/g)].length, 6);
    const narrative = section.slice(section.indexOf('id="clinical-story"'), section.indexOf('id="clinical-capabilities"'));
    const copy = [["Anamnesis","Cerita pasien,<br> tergali utuh.","Sentrapedia menyarankan pertanyaan lanjutan dan menandai tanda bahaya sejak awal."],["Pemeriksaan","Periksa yang<br> paling menentukan.","Saran pemeriksaan fisik dan penunjang yang paling membantu menegakkan diagnosis."],["Diagnosis banding","Semua kemungkinan,<br> di atas meja.","Daftar diagnosis banding lengkap dengan alasannya, termasuk yang wajib disingkirkan."],["Diagnosis kerja","Satu kesimpulan,<br> jelas alasannya.","Rangkuman temuan yang mendukung, dan yang masih belum cocok."],["Terapi","Tata laksana<br> sesuai pedoman.","Merujuk PNPK, PPK, dan Fornas, disesuaikan dengan kondisi pasien."],["Keputusan akhir","Pulang, rawat,<br> atau rujuk.","Kriteria ditimbang sesuai kompetensi dan kemampuan fasilitas. Keputusan tetap pada dokter."]];
    let previous = -1;
    for (const [label, heading, body] of copy) {
      const position = narrative.indexOf(' / ' + label + '</p>');
      assert.ok(position > previous, label + ' follows the approved order');
      assert.ok(narrative.includes(heading), label + ' preserves the approved heading');
      assert.ok(narrative.includes(body), label + ' preserves the approved copy');
      previous = position;
    }
    assert.ok(narrative.includes(renderClinicalNote()), 'note is generated from the editable case config');
    assert.match(narrative, /dr Ferdi Iskandar/);
    assert.doesNotMatch(narrative, /clinical-note-ghost/);
    assert.equal([...narrative.matchAll(/class="clinical-note-row"/g)].length, 6);
    assert.equal([...narrative.matchAll(/class="clinical-note-strike"/g)].length, 3);
    assert.equal([...narrative.matchAll(/class="clinical-note-circle"/g)].length, 1);
    assert.doesNotMatch(narrative, /clinical-neuron|clinical-network|clinical-soma/);
    assert.equal([...section.matchAll(/class="clinical-capability"/g)].length, 10);
    assert.match(section, /class="clinical-capability-viewport"/);
    assert.match(section, /href="#clinical-principles">Lanjut ke fondasi/);
    assert.equal([...section.matchAll(/class="clinical-product-visual\b/g)].length, 3);
    for (const title of ['Clinical Cockpit Interface', 'Document Studio', 'Cloud Agent Gateway', 'Fast Assessment', 'Ministry ICD-10 Resolution', 'Mesin Dokumentasi 18 Mode Klinis', 'Ambient Scribing &amp; Speech Dictation', 'Power Navigation &amp; Developer/Clinician UI', 'Privacy-by-Design', 'Sentrapedia Library']) {
      assert.ok(section.includes('<h4>' + title + '</h4>'), title);
    }
    for (const pillar of ['Clinical Speed &amp; Fluidity', 'Dual AI Intelligence', 'Evidence-Grounded Medicine', 'Standalone Capsule Sovereignty']) assert.ok(section.includes(pillar));
    const pricing = section.slice(section.indexOf('<section id="clinical-pricing"'), section.indexOf('<div class="clinical-closing'));
    assert.ok(section.indexOf('id="clinical-faq"') < section.indexOf('id="clinical-pricing"'));
    assert.equal([...pricing.matchAll(/class="clinical-price-card(?: clinical-price-card-pro)?"/g)].length, 3);
    for (const plan of ['Pribadi<br>Lite', 'Pribadi<br>Pro', 'Institusi']) assert.ok(pricing.includes(plan), plan);
    assert.equal([...pricing.matchAll(/aria-label="Harga akan diisi"/g)].length, 3);
    assert.doesNotMatch(pricing, /Rp\s*\d/);
    assert.match(html, /href="\/media\/pricing\.css"/);
    assert.match(html, /src="\/media\/pricing\.js"/);
    assert.equal([...section.matchAll(/<li>.*?<\/li>/g)].filter(match => /Ringkasan Gejala|Differential Diagnosis|Diagnosis Utama|Pemeriksaan Penunjang|Terapi Farmakologi|Edukasi Pasien/.test(match[0])).length, 6);
    assert.match(section, /Diagnosis, terapi, dan rujukan tetap menjadi kewenangan dokter/);
    assert.match(section, /href="#clinical-note" data-clinical-skip>Lewati animasi/);
    assert.doesNotMatch(section, /feature-card|clinical-feature-list|2,9 detik|validator e-Klaim/);
    for (const asset of ['gsap.min.js', 'ScrollTrigger.min.js', 'SplitText.min.js', 'DrawSVGPlugin.min.js', 'fonts/Caveat-Variable.ttf', 'clinical-video.js', 'clinical-video.css', 'pricing.js', 'pricing.css', 'clinical-product/workspace.png', 'clinical-product/document-review.png', 'clinical-product/anamnesis-source.png']) {
      const response = await fetch(base + '/media/' + asset);
      assert.equal(response.status, 200, asset);
      const served = new Uint8Array(await response.arrayBuffer());
      const source = await readFile(new URL('../assets/' + asset, import.meta.url));
      assert.equal(createHash('sha256').update(served).digest('hex'), createHash('sha256').update(source).digest('hex'), asset + ' source matches served bytes');
    }
    const video = await fetch(base + '/media/sentrapedia-solusi.mp4', { headers: { Range: 'bytes=0-31' } });
    assert.equal(video.status, 206);
    assert.equal(video.headers.get('content-type'), 'video/mp4');
    assert.equal((await video.arrayBuffer()).byteLength, 32);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('clinical note escapes editable patient content', () => {
  const edited = structuredClone(clinicalNote);
  edited.patient = '<img src=x onerror=alert(1)>';
  edited.rows[0].lines[0].text = 'A & B <script>bad()</script>';
  const html = renderClinicalNote(edited);
  assert.doesNotMatch(html, /<img|<script>/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /A &amp; B &lt;script&gt;bad\(\)&lt;\/script&gt;/);
});
