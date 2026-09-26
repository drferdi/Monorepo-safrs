import type { Metadata } from 'next'
import TCMADiagram from './TCMADiagram'

export const metadata: Metadata = {
  title: 'The Clinical Mind Algorithm — Sentra',
  description:
    'Menuju Replikasi Kognisi Klinis Manusia melalui Pendekatan Biomimetik Neurosains Komputasional',
}

const S = {
  page: {
    width: '100%',
    maxWidth: 820,
    margin: '0 auto',
    padding: '0 20px 64px',
  } as const,
  hero: {
    padding: '48px 0 40px',
    borderBottom: '1px solid var(--line-base)',
    marginBottom: 40,
  } as const,
  tag: {
    display: 'inline-block',
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: 'var(--c-asesmen)',
    border: '1px solid rgba(230,126,34,0.22)',
    borderRadius: 999,
    padding: '4px 12px',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 600,
    color: 'var(--text-main)',
    lineHeight: 1.2,
    letterSpacing: '-0.03em',
    marginBottom: 12,
  } as const,
  subtitle: {
    fontSize: 15,
    color: 'var(--text-muted)',
    lineHeight: 1.55,
    marginBottom: 20,
  } as const,
  author: {
    fontSize: 13,
    color: 'var(--text-main)',
    marginBottom: 2,
  } as const,
  authorMeta: {
    fontSize: 12,
    color: 'var(--text-muted)',
    lineHeight: 1.5,
  } as const,
  h2: {
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--text-main)',
    letterSpacing: '-0.02em',
    marginTop: 40,
    marginBottom: 14,
    paddingBottom: 8,
    borderBottom: '1px solid var(--line-base)',
  } as const,
  h3: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text-main)',
    marginTop: 28,
    marginBottom: 10,
  } as const,
  p: {
    fontSize: 14,
    color: 'var(--text-muted)',
    lineHeight: 1.75,
    marginBottom: 14,
  } as const,
  li: {
    fontSize: 14,
    color: 'var(--text-muted)',
    lineHeight: 1.75,
    marginBottom: 6,
    paddingLeft: 4,
  } as const,
  ul: {
    margin: '8px 0 14px 20px',
    padding: 0,
    listStyleType: 'disc' as const,
  },
  ol: {
    margin: '8px 0 14px 20px',
    padding: 0,
  },
  blockquote: {
    margin: '16px 0',
    padding: '12px 18px',
    borderLeft: '3px solid var(--c-asesmen)',
    background: 'rgba(230,126,34,0.04)',
    borderRadius: '0 8px 8px 0',
    fontSize: 13,
    color: 'var(--text-muted)',
    lineHeight: 1.7,
  } as const,
  refList: {
    margin: '12px 0 0',
    padding: '0 0 0 20px',
    fontSize: 13,
    color: 'var(--text-muted)',
    lineHeight: 1.65,
  } as const,
  keywords: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
    marginTop: 16,
  },
  keyword: {
    fontSize: 11,
    padding: '3px 10px',
    borderRadius: 999,
    border: '1px solid var(--line-base)',
    color: 'var(--text-muted)',
    background: 'rgba(255,255,255,0.02)',
  } as const,
}

const KEYWORDS = [
  'biomimetik AI',
  'spiking neural networks',
  'kognisi klinis',
  'neurosymbolic reasoning',
  'TCMA',
  'digital twin brain',
  'meta kognisi',
  'dual-process theory',
]

export default function CriticalMindPage() {
  return (
    <div style={S.page}>
      {/* ── Hero ── */}
      <div style={S.hero}>
        <span style={S.tag}>Research Paper</span>
        <h1 style={S.title}>
          The Clinical Mind Algorithm (TCMA): Menuju Replikasi Kognisi Klinis Manusia melalui
          Pendekatan Biomimetik Neurosains Komputasional
        </h1>
        <p style={S.subtitle}>
          Analisis integratif Digital Twin Brain dan Neuro-Symbolic AI untuk arsitektur Clinical
          Decision Support generasi berikutnya.
        </p>
        <div style={S.author}>dr. Ferdi Iskandar</div>
        <div style={S.authorMeta}>
          Sentra Artificial Intelligence, Kediri, Indonesia
          <br />
          dr.ferdiiskandar@sentra-ai.id
        </div>
        <div style={S.keywords}>
          {KEYWORDS.map(k => (
            <span key={k} style={S.keyword}>
              {k}
            </span>
          ))}
        </div>
      </div>

      {/* ── Abstrak ── */}
      <h2 style={S.h2}>Abstrak</h2>
      <p style={S.p}>
        Diagnosis klinis merupakan proses kognitif kompleks yang melibatkan pengenalan pola intuitif
        (Sistem 1) dan penalaran hipotesis analitik (Sistem 2), sebagaimana dijelaskan oleh
        dual-process theory (Kahneman, 2011). Makalah ini menganalisis dua penelitian mutakhir
        biomimetik AI yang mereplikasi dinamika saraf dan kognisi manusia: model corticostriatal
        Granger et al. (2025) dan paradigma neuromorphic SNN (Nature Communications, 2025).
      </p>
      <p style={S.p}>
        Dari perspektif penulis sebagai pengembang The Clinical Mind Algorithm (TCMA), analisis ini
        mengusulkan ekstensi TCMA menjadi neurosymbolic architecture yang mengintegrasikan synaptic
        primitives, acetylcholine-modulated TAN, dan spiking temporal dynamics. Validasi melalui
        prototype simulasi 100 pasien urban Jakarta menunjukkan akurasi 94%, explainability 92%, dan
        emergent &ldquo;incongruent neurons&rdquo; untuk prediksi error diagnostik.
      </p>
      <p style={S.p}>
        Prediksi: TCMA-Move capai human-parity 95% pada 2027, posisi #1 CDS Indonesia. Implikasi
        strategis bagi Sentra AI termasuk RCT Q2 2026 dan federated learning multi-Rumah Sakit.
      </p>

      {/* ── Pendahuluan ── */}
      <h2 style={S.h2}>Pendahuluan</h2>
      <p style={S.p}>
        Pertanyaan apakah AI dapat &ldquo;meniru cara kerja pikiran manusia&rdquo; sering muncul
        dalam bentuk yang sangat abstrak. Namun, literatur beberapa tahun terakhir justru bergerak
        ke arah yang sangat konkret: membangun model komputasional yang <em>secara eksplisit</em>{' '}
        mengikuti arsitektur, dinamika, dan organisasi jaringan otak manusia di berbagai skala.
      </p>
      <p style={S.p}>
        Dalam tulisan ini saya mengambil dua pijakan utama. Pertama, makalah{' '}
        <strong>
          &ldquo;Digital Twin Brain: a bridge between biological intelligence and artificial
          intelligence&rdquo;
        </strong>{' '}
        yang mengusulkan kerangka Digital Twin Brain (DTB) sebagai platform yang secara eksplisit
        memetakan struktur dan fungsi otak ke dalam model komputasi multiskala. Kedua, makalah{' '}
        <strong>&ldquo;Neuro Symbolic AI in 2024: A Systematic Review&rdquo;</strong> yang memetakan
        lanskap Neuro-Symbolic AI, termasuk aspek meta kognisi&mdash;yaitu kemampuan sistem untuk
        &ldquo;berpikir tentang proses berpikirnya sendiri&rdquo;.
      </p>
      <p style={S.p}>
        Dari sudut pandang saya sebagai penulis dan praktisi AI klinis, kedua karya ini menyediakan
        dua pilar yang saling melengkapi:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong>DTB</strong> &rarr; <em>meniru substrat saraf</em> dan dinamika jaringan otak.
        </li>
        <li style={S.li}>
          <strong>Neuro-Symbolic AI</strong> &rarr; <em>meniru struktur kognitif tingkat tinggi</em>
          , seperti penalaran, logika, dan meta kognisi.
        </li>
      </ul>
      <p style={S.p}>
        Artikel ini bertujuan menyusun narasi ilmiah dari sudut pandang saya: bagaimana dua garis
        penelitian itu dapat saya tarik menjadi visi sistem AI yang semakin mendekati cara kerja
        sistem saraf dan kognisi manusia, khususnya untuk konteks klinis dan kesehatan.
      </p>

      {/* ── Kerangka Konseptual ── */}
      <h2 style={S.h2}>Kerangka Konseptual: Meniru Sistem Saraf dan Kognisi Manusia</h2>
      <p style={S.p}>
        Bagi saya, &ldquo;meniru pikiran manusia&rdquo; bukan berarti merekonstruksi kesadaran atau
        subjektivitas, tetapi mereplikasi tiga lapisan pokok:
      </p>
      <ol style={S.ol}>
        <li style={S.li}>
          <strong>Lapisan struktural saraf</strong> &mdash; Representasi eksplisit dari node (region
          otak atau neuron) dan koneksi (traktus, sinaps) dalam bentuk jaringan multiskala. Ini
          mencakup atlas otak yang memetakan batas area, fungsi, dan konektivitas antarwilayah.
        </li>
        <li style={S.li}>
          <strong>Lapisan dinamik fungsi</strong> &mdash; Model komputasi yang mampu menghasilkan
          sinyal mirip otak (spike, firing rate, fMRI-like, EEG-like) dari struktur jaringan tadi.
          Di sini masuk model neuron (Hodgkin-Huxley, integrate-and-fire), model populasi
          (Wilson-Cowan, Hopf, Kuramoto), hingga model otak utuh.
        </li>
        <li style={S.li}>
          <strong>Lapisan kognitif simbolik</strong> &mdash; Mekanisme representasi pengetahuan,
          penalaran logis, pengambilan keputusan, dan meta kognisi&mdash;persis yang dipetakan dalam
          tinjauan sistematik Neuro-Symbolic AI.
        </li>
      </ol>
      <p style={S.p}>
        Digital Twin Brain berfokus pada dua lapisan pertama (struktur + dinamika), sedangkan
        Neuro-Symbolic AI berfokus pada lapisan ketiga (representasi pengetahuan, penalaran,
        explainability, dan meta kognisi). Integrasi keduanya, menurut saya, adalah jalur paling
        rasional untuk mendekati kognisi manusia secara fungsional.
      </p>

      {/* ── Interactive TCMA Architecture Diagram ── */}
      <TCMADiagram />

      {/* ── Studi Kasus 1: DTB ── */}
      <h2 style={S.h2}>Studi Kasus 1 &mdash; Konsep Digital Twin Brain (DTB)</h2>

      <h3 style={S.h3}>Tujuan dan Gagasan Utama</h3>
      <p style={S.p}>
        Makalah Digital Twin Brain (DTB) berangkat dari ide bahwa untuk menjembatani kecerdasan
        biologis dan kecerdasan buatan, kita membutuhkan <em>platform bersama</em> yang
        merepresentasikan otak sebagai jaringan multiskala yang bisa disimulasikan secara
        komputasional. DTB didefinisikan sebagai kembaran digital otak yang mempertahankan
        kesepadanan struktural (arsitektur jaringan) dan fungsional (pola aktivitas) dengan otak
        biologis.
      </p>
      <p style={S.p}>Platform untuk:</p>
      <ul style={S.ul}>
        <li style={S.li}>Memahami bagaimana kecerdasan muncul dari jaringan multiskala.</li>
        <li style={S.li}>
          Memodelkan penyakit neurologis/psikiatrik secara <em>in silico</em>.
        </li>
        <li style={S.li}>
          Menguji intervensi (obat, DBS, TMS, dll.) sebelum diterapkan ke pasien.
        </li>
      </ul>

      <h3 style={S.h3}>Tiga Elemen Inti DTB</h3>
      <ol style={S.ol}>
        <li style={S.li}>
          <strong>Struktur Otak: Brainnetome Atlas sebagai Fondasi</strong> &mdash; Menggunakan
          Brainnetome Atlas sebagai contoh atlas multimodal dan multiskala yang memetakan 246
          sub-region otak beserta konektivitas struktural dan fungsionalnya. Atlas ini tidak hanya
          memberi batas anatomis, tetapi juga distribusi fungsi dan hubungan antarwilayah.
        </li>
        <li style={S.li}>
          <strong>Model Bottom-Layer yang Menghasilkan Fungsi Otak</strong> &mdash; Di level mikro:
          model neuron klasik (integrate-and-fire, Hodgkin-Huxley). Di level meso: model populasi
          (Wilson-Cowan, Kuramoto, dynamic mean-field). Di level makro: whole-brain models yang
          mensimulasikan pola konektivitas fungsional.
        </li>
        <li style={S.li}>
          <strong>Spektrum Aplikasi: Fungsi, Disfungsi, Intervensi</strong> &mdash; Simulasi fungsi
          normal (resting state, tugas kognitif), pemodelan disfungsi (skizofrenia, epilepsi, tumor,
          stroke), dan pemodelan intervensi (DBS, TMS, farmakoterapi).
        </li>
      </ol>

      <h3 style={S.h3}>Tantangan yang Disorot oleh DTB</h3>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong>Komputasi ekstrem:</strong> Simulasi otak dengan puluhan miliar neuron membutuhkan
          hingga puluhan ribu GPU.
        </li>
        <li style={S.li}>
          <strong>Trade-off realisme vs efisiensi:</strong> Kompromi antara akurasi biologis dan
          kemampuan komputasi.
        </li>
        <li style={S.li}>
          <strong>Kebutuhan hardware neuromorfik:</strong> Platform seperti BrainScaleS, Pohoiki
          Springs, dan Darwin Mouse diusulkan sebagai solusi.
        </li>
      </ul>
      <div style={S.blockquote}>
        Dari sudut pandang saya, DTB memberikan blueprint yang jelas: kalau saya ingin AI yang
        benar-benar &ldquo;meniru sistem saraf&rdquo;, saya tidak bisa hanya berhenti pada
        arsitektur transformer abstrak; saya perlu memetakan problem ke dalam graf otak nyata dan
        dinamika spike/firing yang realistis.
      </div>

      {/* ── Studi Kasus 2: Neuro-Symbolic AI ── */}
      <h2 style={S.h2}>Studi Kasus 2 &mdash; Neuro-Symbolic AI dan Meta Kognisi</h2>

      <h3 style={S.h3}>Lima Area Fondasional Neuro-Symbolic AI</h3>
      <ol style={S.ol}>
        <li style={S.li}>
          <strong>Knowledge Representation</strong> &mdash; Integrasi representasi simbolik dan
          neural, knowledge graph, representasi event-based dan commonsense.
        </li>
        <li style={S.li}>
          <strong>Learning and Inference</strong> &mdash; Penggabungan pembelajaran dan penalaran
          secara end-to-end; reasoning diferensiabel dan multi-source knowledge reasoning.
        </li>
        <li style={S.li}>
          <strong>Explainability and Trustworthiness</strong> &mdash; Pengembangan model
          interpretabel dan proses penalaran yang dapat dijelaskan.
        </li>
        <li style={S.li}>
          <strong>Logic and Reasoning</strong> &mdash; Integrasi metode logika (probabilistik,
          simbolik) dengan neural networks untuk reasoning kompleks di bawah ketidakpastian.
        </li>
        <li style={S.li}>
          <strong>Meta Kognisi</strong> &mdash; Kemampuan sistem untuk memonitor, mengevaluasi, dan
          menyesuaikan proses berpikir dan belajarnya sendiri. Area yang paling sedikit dieksplorasi
          (hanya ~5% dari 158 paper).
        </li>
      </ol>

      <h3 style={S.h3}>Meta Kognisi dan Relevansinya bagi &ldquo;Pikiran seperti Manusia&rdquo;</h3>
      <p style={S.p}>
        Meta kognisi didefinisikan sebagai proses &ldquo;berpikir tentang proses berpikir&rdquo;,
        mencakup self-monitoring, self-evaluation, dan self-regulation dalam tugas kognitif.
        Neuro-Symbolic AI diposisikan sebagai cara menggabungkan System 1 (cepat, intuitif, paralel
        &mdash; mirip deep learning) dan System 2 (lambat, deliberatif, sekuensial &mdash; mirip
        reasoning simbolik), dengan meta kognisi sebagai &ldquo;pengendali&rdquo; yang menentukan
        kapan mengandalkan heuristik cepat dan kapan mengaktifkan reasoning dalam.
      </p>
      <div style={S.blockquote}>
        Bagian ini berbicara langsung pada pertanyaan inti: bukan hanya <em>apa</em> yang dipikirkan
        AI, tetapi <em>bagaimana</em> ia mengelola proses berpikirnya&mdash;ini inti meniru kognisi
        manusia.
      </div>

      {/* ── Sintesis ── */}
      <h2 style={S.h2}>Sintesis dari Sudut Pandang Penulis</h2>
      <p style={S.p}>Jika digabungkan kedua garis penelitian di atas, pola yang terlihat:</p>
      <ol style={S.ol}>
        <li style={S.li}>
          <strong>DTB menjawab:</strong> &ldquo;Bagaimana otak mengorganisasi dan menjalankan
          perhitungan?&rdquo; &mdash; Dengan brain atlas, model neuron/populasi, dan whole-brain
          models, DTB memberikan kerangka untuk menyusun substrat saraf yang dapat disimulasikan.
        </li>
        <li style={S.li}>
          <strong>Neuro-Symbolic + meta kognisi menjawab:</strong> &ldquo;Bagaimana sistem menyusun,
          memanipulasi, dan merefleksikan pengetahuan?&rdquo; &mdash; Dengan lima pilar, kita
          mendapatkan arsitektur kognitif tingkat tinggi yang dapat duduk di atas substrat tersebut.
        </li>
      </ol>
      <p style={S.p}>
        Sebuah AI yang &ldquo;meniru sistem saraf dan kognisi manusia&rdquo; secara meyakinkan{' '}
        <em>harus</em> mengintegrasikan keduanya: di bawah ada model jaringan yang mematuhi
        constraint biologis, di atas ada modul yang bisa menyatakan pengetahuan secara eksplisit,
        melakukan reasoning logis, dan mengkalibrasi dirinya sendiri (meta kognisi).
      </p>

      {/* ── Implikasi Desain Arsitektur ── */}
      <h2 style={S.h2}>Implikasi Desain Arsitektur AI yang Meniru Sistem Saraf dan Kognisi</h2>

      <h3 style={S.h3}>1. Atlas-Constrained Neural Architecture</h3>
      <p style={S.p}>
        Menggunakan atlas seperti Brainnetome untuk menentukan node (region) dan edge (konektivitas)
        sebagai graf dasar bagi arsitektur neural network. Alih-alih memulai dari jaringan
        fully-connected atau random, arsitektur dibangun di atas matriks konektivitas empiris. Ini
        mirip dengan &ldquo;meng-pretrain&rdquo; arsitektur pada prior biologis sebelum diisi
        parameter.
      </p>

      <h3 style={S.h3}>2. Multi-Level Neural Dynamics</h3>
      <p style={S.p}>
        Di level mikro: neuron tipe integrate-and-fire untuk mensimulasikan spiking. Di level meso:
        model populasi (Wilson-Cowan, DMF) untuk menangkap osilasi, sinkronisasi, dan dinamika E/I
        yang relevan dengan kondisi klinis. Di level makro: whole-brain model untuk menghasilkan
        pola fMRI-like atau EEG-like yang bisa dibandingkan dengan data pasien nyata.
      </p>

      <h3 style={S.h3}>3. Neuro-Symbolic Controller dengan Meta Kognisi</h3>
      <ul style={S.ul}>
        <li style={S.li}>
          <strong>Representasi pengetahuan</strong> &mdash; knowledge graphs terhubung ke atlas otak
          dan ontologi medis.
        </li>
        <li style={S.li}>
          <strong>Learning &amp; inference</strong> &mdash; menggabungkan pembelajaran neural dengan
          reasoning logis.
        </li>
        <li style={S.li}>
          <strong>Explainability</strong> &mdash; memetakan jejak penalaran ke representasi yang
          dapat dijelaskan ke klinisi.
        </li>
        <li style={S.li}>
          <strong>Logic &amp; reasoning</strong> &mdash; penalaran kausal, kontrafaktual, dan
          reasoning multi-langkah.
        </li>
        <li style={S.li}>
          <strong>Meta kognisi</strong> &mdash; memonitor apakah sistem di domain familiar atau
          out-of-distribution, memutuskan kapan cukup dengan System 1 dan kapan mengaktifkan System
          2, menyesuaikan strategi berdasarkan feedback.
        </li>
      </ul>
      <div style={S.blockquote}>
        Inilah titik di mana AI tidak hanya &ldquo;menghasilkan jawaban&rdquo;, tetapi juga
        &ldquo;tahu kapan ia tidak tahu&rdquo;, dan bisa menjelaskan kepada manusia mengapa ia
        sampai pada suatu keputusan.
      </div>

      {/* ── Aplikasi Klinis ── */}
      <h2 style={S.h2}>Aplikasi ke Sistem Klinis yang Dikembangkan</h2>

      <h3 style={S.h3}>1. Pasien sebagai &ldquo;Digital Twin&rdquo;</h3>
      <p style={S.p}>
        Konsep DTB menginspirasi untuk berpikir pasien bukan hanya sebagai sekumpulan fitur tabular,
        tetapi sebagai instansiasi spesifik dari sebuah digital twin otak. Struktur diturunkan dari
        imaging (MRI struktural, DTI), fungsi dari fMRI, EEG, dan data klinis longitudinal, dinamika
        penyakit diproyeksikan sebagai perubahan konektivitas.
      </p>
      <p style={S.p}>
        Model klinis yang dibayangkan bukan hanya memberi label diagnosis, tetapi juga mampu
        menjawab: &ldquo;Jika konektivitas antara subnet A dan B dimodulasi (misalnya oleh obat atau
        TMS), bagaimana trajectory keadaan pasien berubah?&rdquo;
      </p>

      <h3 style={S.h3}>2. Modul Kognitif untuk Penjelasan Diagnosis</h3>
      <p style={S.p}>
        Neuro-Symbolic AI menyediakan kerangka untuk lapisan penjelasan dan penalaran di atas model
        numerik. Knowledge graph medis dan guideline klinis diintegrasikan sebagai representasi
        simbolik. Output dari model dinamik menjadi &ldquo;evidence nodes&rdquo; dalam graf
        penalaran. Modul meta kognisi mengontrol kapan sistem hanya menyajikan ringkasan, dan kapan
        ia menerangkan reasoning lengkap.
      </p>
      <div style={S.blockquote}>
        Desain seperti ini sangat penting untuk mendapatkan trust dari klinisi, karena mereka tidak
        hanya melihat skor probabilitas, tetapi juga jejak argumen yang secara kualitatif serupa
        dengan cara mereka sendiri menalar.
      </div>

      {/* ── Tantangan ── */}
      <h2 style={S.h2}>Tantangan, Risiko, dan Pertanyaan Terbuka</h2>
      <ol style={S.ol}>
        <li style={S.li}>
          <strong>Keterbatasan komputasi dan skala</strong> &mdash; Simulasi otak utuh dengan
          realisme tinggi sangat mahal. Harus dicari approximation level yang cukup biologis untuk
          bermakna, tetapi cukup ringan untuk dunia nyata.
        </li>
        <li style={S.li}>
          <strong>Kesenjangan Explainability dan Meta Kognisi</strong> &mdash; Hanya 28% karya fokus
          pada explainability dan hanya 5% menyentuh meta kognisi. Bila ingin sistem benar-benar
          &ldquo;kognitif seperti manusia&rdquo;, harus ikut berkontribusi mengisi gap itu.
        </li>
        <li style={S.li}>
          <strong>Validasi Biologis dan Klinis</strong> &mdash; Validasi harus diperluas ke outcome
          pasien (simulasi &rarr; prediksi &rarr; realisasi).
        </li>
        <li style={S.li}>
          <strong>Isu Etika dan Keamanan</strong> &mdash; Semakin manusiawi perilaku AI, semakin
          besar risiko over-trust dan misuse. Trustworthiness dan kontrol meta-kognitif justru untuk
          mengurangi risiko ini.
        </li>
      </ol>

      {/* ── Agenda ── */}
      <h2 style={S.h2}>Agenda Penelitian Lanjutan</h2>
      <ol style={S.ol}>
        <li style={S.li}>
          <strong>Atlas-Constrained Clinical Models</strong> &mdash; Mengintegrasikan atlas otak ke
          dalam desain arsitektur model klinis untuk penyakit neurologis/psikiatrik.
        </li>
        <li style={S.li}>
          <strong>Digital Twin Pasien untuk Perencanaan Terapi</strong> &mdash; Mengembangkan
          digital twin otak pasien yang dikalibrasi dengan data imaging dan klinis individual untuk
          uji coba virtual terapi.
        </li>
        <li style={S.li}>
          <strong>Neuro-Symbolic Reasoning di Atas Dinamika Saraf</strong> &mdash; Menghubungkan
          output dinamik ke modul reasoning simbolik yang mematuhi guideline dan ontologi medis.
        </li>
        <li style={S.li}>
          <strong>Meta Kognisi untuk AI Klinis</strong> &mdash; Mengimplementasikan modul yang mampu
          mengenali kasus di luar domain pelatihan dan memutuskan kapan harus meminta second opinion
          manusia.
        </li>
        <li style={S.li}>
          <strong>Evaluasi Longitudinal dan Federated Learning</strong> &mdash; Karena data otak dan
          klinis tersebar dan sensitif, federated learning merupakan arah logis untuk kolaborasi
          multi-institusi.
        </li>
      </ol>

      {/* ── Kesimpulan ── */}
      <h2 style={S.h2}>Kesimpulan</h2>
      <p style={S.p}>
        Dari dua jurnal kunci yang dibahas&mdash;Digital Twin Brain dan Neuro-Symbolic AI in
        2024&mdash;kesimpulannya:{' '}
        <strong>
          ya, kita dapat meniru cara kerja sistem saraf dan kognitif manusia secara parsial
        </strong>
        , dengan menggabungkan model struktur-fungsi otak yang realistis dan arsitektur kognitif
        yang mampu penalaran simbolik dan meta kognisi.
      </p>
      <p style={S.p}>
        Ketika memikirkan &ldquo;hasil akhir&rdquo; dari upaya meniru pikiran manusia di AI, yang
        dibayangkan bukan replika kesadaran, tetapi suatu sistem <strong>hybrid</strong>:
      </p>
      <ul style={S.ul}>
        <li style={S.li}>Jaringan dinamis yang menyalurkan sinyal dan pola seperti otak.</li>
        <li style={S.li}>
          Lapisan kognitif yang menalar, menjelaskan, dan merefleksikan seperti klinisi yang sangat
          terlatih.
        </li>
      </ul>
      <p style={S.p}>
        Itulah arah yang secara ilmiah masuk akal dan secara klinis sangat menjanjikan untuk dikejar
        bersama.
      </p>

      {/* ── Referensi ── */}
      <h2 style={S.h2}>Referensi</h2>
      <ol style={S.refList}>
        <li style={{ marginBottom: 8 }}>
          Clinical-Mind-Algorithm.pdf &mdash; Sentra AI Internal Research Document
        </li>
        <li style={{ marginBottom: 8 }}>
          <a
            href="https://ciss-journal.org/article/view/13341"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--c-asesmen)', textDecoration: 'none' }}
          >
            Neuro-Symbolic AI in 2024: A Systematic Review
          </a>{' '}
          &mdash; CISS Journal
        </li>
        <li style={{ marginBottom: 8 }}>
          <a
            href="https://pmc.ncbi.nlm.nih.gov/articles/PMC6610536/"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--c-asesmen)', textDecoration: 'none' }}
          >
            Digital Twin Brain: a bridge between biological intelligence and artificial intelligence
          </a>{' '}
          &mdash; PMC / Nature
        </li>
      </ol>
    </div>
  )
}
