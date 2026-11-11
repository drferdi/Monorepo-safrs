const panels = [
  {
    slug: 'cockpit', number: '01', title: 'Clinical Cockpit', layout: 'three',
    route: 'M32 28 H568', caption: 'Clinical Cockpit',
    cards: [
      ['Encounter', 'Riwayat & antrean', 'Konteks kunjungan'],
      ['Ruang kerja', 'Template & dokumen', 'Draf terarah'],
      ['Referensi', 'Sumber klinis', 'Bahan peninjauan']
    ]
  },
  {
    slug: 'document-studio', number: '02', title: 'Document Studio', layout: 'document',
    route: 'M32 28 H235 L278 42 H540 L568 28', caption: 'Document Studio',
    cards: [
      ['Dokumen', 'Anamnesis', 'Pemeriksaan · Rencana'],
      ['Sumber', 'Riwayat', 'Konteks tersusun'],
      ['Tinjauan', 'Isi & format', 'Draf untuk dokter']
    ]
  },
  {
    slug: 'fast-assessment', number: '04', title: 'Fast Assessment', layout: 'six',
    route: 'M32 28 H568', caption: 'Fast Assessment',
    cards: [
      ['01', 'Gejala', 'Ringkasan'], ['02', 'DDx', 'Kemungkinan'],
      ['03', 'Diagnosis', 'Draf kerja'], ['04', 'Penunjang', 'Kebutuhan'],
      ['05', 'Terapi', 'Rencana'], ['06', 'Edukasi', 'Tindak lanjut']
    ]
  },
  {
    slug: 'icd10', number: '05', title: 'ICD-10', layout: 'resolution',
    route: 'M32 28 H230 L290 42 H540 L568 28', caption: 'ICD-10',
    cards: [
      ['Draf', 'Draf diagnosis', 'Belum final'],
      ['Kode', 'Referensi kode', 'Telusuri kode'],
      ['Tinjau', 'Tinjauan klinisi', 'Keputusan dokter']
    ]
  },
  {
    slug: 'ambient-scribing', number: '07', title: 'Ambient Scribing', layout: 'scribe',
    route: 'M32 28 C110 4 184 52 270 28 S447 4 568 28', caption: 'Ambient Scribing',
    cards: [
      ['Masukan', 'Percakapan', 'Dikte browser'],
      ['Susun', 'Scribe Note', 'Transkrip menjadi draf'],
      ['Tinjau', 'Draf', 'Dokter memeriksa']
    ]
  },
  {
    slug: 'power-navigation', number: '08', title: 'Power Navigation', layout: 'navigation',
    route: 'M32 28 H190 V12 H395 V28 H568', caption: 'Power Navigation',
    cards: [
      ['Cari', 'Cari perintah', 'Ctrl + J'],
      ['Pilih', 'Buka dokumen', 'Pilih template'],
      ['Buka', 'Cari referensi', 'Navigasi cepat']
    ]
  },
  {
    slug: 'privacy', number: '09', title: 'Privacy by Design', layout: 'privacy',
    route: 'M32 28 H250 L300 9 L350 28 H568', caption: 'Privacy by Design',
    cards: [
      ['Masukan', 'Data sintetis', 'Bukan data pasien'],
      ['Periksa', 'Pemeriksaan PII', 'Batas konteks'],
      ['Kendalikan', 'Batas biaya', 'Tinjauan']
    ]
  },
  {
    slug: 'library', number: '10', title: 'Sentrapedia Library', layout: 'library',
    route: 'M32 28 H568', caption: 'Sentrapedia Library',
    cards: [
      ['Cari', 'Cari referensi', 'Sumber primer'],
      ['Sumber', 'Pedoman', 'Referensi primer'],
      ['Katalog', 'Obat', 'Cari referensi'],
      ['Klasifikasi', 'ICD-10', 'Telusuri kode']
    ]
  }
];

const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const lineDetail = '<span class="capability-live-detail-lines" aria-hidden="true"><i></i><i></i><i></i></span>';
const waveform = '<svg class="capability-live-waveform" viewBox="0 0 120 26" aria-hidden="true"><path d="M2 13V10M10 13V5M18 13V17M26 13V2M34 13V24M42 13V7M50 13V19M58 13V4M66 13V22M74 13V8M82 13V17M90 13V3M98 13V23M106 13V7M114 13V15"/></svg>';
const shield = '<svg class="capability-live-shield" viewBox="0 0 36 40" aria-hidden="true"><path d="M18 2 32 8v12c0 10-6 15-14 18C10 35 4 30 4 20V8z"/><path d="m11 20 5 5 9-11"/></svg>';

function cardDecoration(slug, index) {
  if ((slug === 'document-studio' || slug === 'icd10') && index === 0) return lineDetail;
  if (slug === 'ambient-scribing' && index === 0) return waveform;
  if (slug === 'privacy' && index === 1) return shield;
  return '';
}

export function capabilityPanelSlugs() { return panels.map(panel => panel.slug); }

export function renderCapabilityPanel(slug) {
  const panel = panels.find(candidate => candidate.slug === slug);
  if (!panel) throw new Error('Unknown capability panel: ' + slug);
  const cards = panel.cards.map(([label, title, detail], index) => `
        <article class="capability-live-card" data-live-card>
          <span class="capability-live-card-index">${String(index + 1).padStart(2, '0')}</span>
          <span class="capability-live-card-label">${escapeHtml(label)}</span>
          <strong>${escapeHtml(title)}</strong>
          <span class="capability-live-card-detail">${escapeHtml(detail)}</span>${cardDecoration(panel.slug, index) ? `
          ${cardDecoration(panel.slug, index)}` : ''}
        </article>`).join('');
  return `<!-- capability-live:${panel.slug}:start -->
    <figure class="capability-live-visual" data-capability-live="${panel.slug}">
      <div class="capability-live-panel" data-live-layout="${panel.layout}">
        <div class="capability-live-top"><span class="capability-live-brand">Sentrapedia</span><span class="capability-live-badge">ILUSTRASI / ${panel.number}</span></div>
        <div class="capability-live-heading"><h5>${escapeHtml(panel.title)}</h5><span>DRAF · TINJAU DOKTER</span></div>
        <svg class="capability-live-route" data-live-route viewBox="0 0 600 56" preserveAspectRatio="none" aria-hidden="true"><path class="capability-live-route-base" d="${panel.route}"/><path class="capability-live-route-signal" data-live-path d="${panel.route}"/><circle class="capability-live-route-node" cx="32" cy="28" r="3"/><circle class="capability-live-route-node" cx="568" cy="28" r="3"/><circle class="capability-live-route-pulse" data-live-pulse cx="32" cy="28" r="5"/></svg>
        <div class="capability-live-cards">${cards}
        </div>
        <div class="capability-live-bottom"><span>DATA SINTETIS</span><span>KEPUTUSAN PADA DOKTER</span></div>
      </div>
      <figcaption>${escapeHtml(panel.caption)} / Ilustrasi fitur, keputusan tetap pada dokter.</figcaption>
    </figure><!-- capability-live:${panel.slug}:end -->`;
}
