import type { ActDto, JourneyManifestDto, SceneDto } from "./dto";
import { PUBLIC_EVIDENCE_LANGUAGE } from "./public-evidence-language";

/**
 * Snapshot editorial naskah produksi yang ditetapkan Chief pada 2026-08-26.
 *
 * Ini bukan sumber fakta baru dan tidak pernah diimpor oleh modul motion.
 * Ia menyiapkan komposisi Journey lengkap sambil CMS masih memuat tiga irisan
 * vertikal yang telah ditinjau. Relasi event, bukti, dan media yang sudah
 * terbit tetap datang dari CMS dan digabungkan berdasarkan anchor scene.
 * Setelah seluruh record editorial masuk CMS, snapshot ini dapat dipensiunkan
 * tanpa mengubah komponen atau koreografi.
 */

export interface FramingMedia {
  readonly path: string;
  readonly altText: string;
  readonly continuationAltText?: string;
  readonly label: string;
  readonly labelDetail?: string;
  /** Gerak hidup opsional; `path` tetap poster + fallback tanpa JavaScript. */
  readonly videoPath?: string;
  /** Sumber lanjutan yang diputar berulang setelah video pembuka selesai. */
  readonly continuationVideoPath?: string;
}

/**
 * Satu babak footage di dalam pembuka Prolog. `posterPath` sengaja opsional:
 * babak yang datang dari kanvas gelap tidak butuh poster, dan poster yang
 * salah justru berkedip sebagai citra era lain sebelum footage-nya siap.
 */
export interface PrologueOvertureClip {
  readonly videoPath: string;
  readonly altText: string;
}

/**
 * Pembuka Prolog (direktif Chief 2026-09-04): citra Kediri 2026 → gelap →
 * footage kota kuno → gelap → naskah era Daha → footage kehidupan sehari-hari
 * → gelap → pelat "KEDIRI, 2026" dan portal 879 yang sudah ada.
 *
 * Naskahnya tidak menambah fakta baru: ketiga kalimat disusun dari pernyataan
 * yang sudah dipakai scene Daha (abad ke-11 dan ke-12, bentuk fisik kota
 * belum dapat dipastikan), lalu menutup dengan pernyataan jujur bahwa yang
 * ditonton adalah bayangan artistik, bukan rekaman peristiwa.
 */
export interface PrologueOverture {
  readonly city: PrologueOvertureClip;
  readonly life: PrologueOvertureClip;
  readonly copy: readonly string[];
}

export interface FramingNarrative {
  readonly eyebrow: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  /** Pengelompokan indeks paragraf menjadi ketukan editorial di dalam frame. */
  readonly beatGroups?: readonly (readonly number[])[];
  readonly masterLine: string;
  readonly portal?: {
    readonly date: string;
    readonly label: string;
  };
  readonly media?: FramingMedia;
  readonly overture?: PrologueOverture;
}

/**
 * Prolog dan Finale berbagi SATU citra yang sama — keputusan direktif produksi:
 * Finale mengunjungi kembali perspektif Prolog, bukan membuat aset ke-28.
 * Total hero image produksi tetap 27.
 */
const FRAMING_MEDIA_2026: FramingMedia = {
  // Scene 00 lolos verifikasi crop (Redo Register); disajikan statis, tanpa
  // gerbang route pratinjau (direktif runtime 2026-08-28).
  path: "/journey-approved/00-prologue.webp",
  altText:
    "Visualisasi artistik Kediri kontemporer saat senja: jembatan di atas Brantas, lalu lintas menyala, dan kota yang hidup di kedua tepian sungai.",
  label: "VISUALISASI ARTISTIK · KEDIRI, 2026",
};

/*
 * Berkas footage menunjuk aset publik yang sudah bersih dari watermark.
 * Peningkatan resolusi cukup mengganti berkas publik pada path yang sama,
 * tanpa menyentuh kode naratif.
 */
const PROLOGUE_OVERTURE: PrologueOverture = {
  city: {
    videoPath: "/journey-approved/00-prologue.mp4",
    altText:
      "Visualisasi artistik imajiner sebuah kota kuno bercandi di tepi sungai saat fajar; wujudnya rekaan dan tidak menggambarkan tempat atau bangunan yang terdokumentasi.",
  },
  life: {
    videoPath: "/journey-approved/00-prologue-daha.mp4",
    altText:
      "Visualisasi artistik imajiner hari biasa di sebuah permukiman Jawa kuno: pasar, gerabah, dan pekerjaan sehari-hari; adegannya rekaan, bukan rekaman peristiwa.",
  },
  copy: [
    "Pada abad ke-11 dan ke-12, Daha menjadi pusat kekuasaan Panjalu.",
    "Bentuk fisik kotanya belum dapat dipastikan sepenuhnya; nama Daha bertahan lewat teks dan nama tempat, bukan lewat kota yang masih berdiri.",
    "Yang tampak berikut ini adalah bayangan artistik tentang hari-hari biasa di sekitarnya, bukan rekaman peristiwa.",
  ],
};

export const PRODUCTION_PROLOGUE: FramingNarrative = {
  eyebrow: "Kediri · Jawa Timur · 2026",
  title: "KEDIRI, 2026",
  beatGroups: [[0], [1]],
  paragraphs: [
    "Kota memiliki lebih dari satu awal. Bentang alam, permukiman, pemerintahan, dan ingatan warganya tidak lahir pada saat yang sama.",
    "27 Juli 879 diperingati Kota Kediri sebagai awal kronologi sipilnya—bukan sebagai tanggal berdirinya pemerintahan kota modern.",
  ],
  masterLine: "Berapa Usia Sebuah Kota?",
  portal: {
    date: "879",
    label: "Catatan pertama menunggu di balik aliran.",
  },
  media: FRAMING_MEDIA_2026,
  overture: PROLOGUE_OVERTURE,
};

export const PRODUCTION_FINALE: FramingNarrative = {
  eyebrow: "Finale · 2026",
  title: "Kediri Terus Berjalan",
  paragraphs: [
    "Perjalanan ini berakhir di Kediri masa kini, tempat Brantas, jembatan, pasar, industri, dan warganya tetap menjadi bagian dari kehidupan kota.",
    "Dari 27 Juli 879 hingga 2026 terbentang 1.147 tahun sejak tanggal yang diperingati sebagai Hari Jadi Kediri.",
    "Rentang itu bukan riwayat satu pemerintahan yang tidak berubah. Ia memuat nama Kadhiri, masa Panjalu, perpindahan kekuasaan, masa kolonial, republik, industri, dan perubahan cara kota terhubung.",
    "Setiap bab menjelaskan mengapa Kediri hari ini memiliki bentuk dan kehidupan seperti sekarang.",
    "Sejarah Kediri terus bertambah bersama kehidupan warganya.",
  ],
  masterLine: "Sejarah Kediri terus ditulis oleh kehidupan kota hari ini.",
  media: FRAMING_MEDIA_2026,
};

type SceneInput = Pick<
  SceneDto,
  | "slug"
  | "order"
  | "title"
  | "dateDisplay"
  | "sceneType"
  | "masterLine"
  | "choreographyKey"
  | "visualVariant"
  | "epistemicStatus"
> & {
  readonly paragraphs: readonly string[];
  /**
   * Pengelompokan paragraf menjadi beat sinematik, sebagai indeks ke
   * `paragraphs`. Keputusan ritme penyuntingan — kalimatnya tidak pernah
   * ditulis ulang di sini. Tanpa ini, tiap paragraf menjadi satu beat.
   */
  readonly beatGroups?: readonly (readonly number[])[];
  readonly imageReady?: boolean;
  readonly imagePath?: string;
  /** Video pratinjau editorial; citra slot menjadi poster + fallback. */
  readonly videoPath?: string;
  readonly previewAltText?: string;
};

const EDITORIAL_DRAFT_STATUS = PUBLIC_EVIDENCE_LANGUAGE.editorialDraft;

function scene(input: SceneInput): SceneDto {
  const expectedPath =
    input.imagePath ??
    `/api/editorial-preview/${String(input.order).padStart(2, "0")}-${input.slug}.webp`;
  return {
    id: `production-${input.slug}`,
    slug: input.slug,
    order: input.order,
    title: input.title,
    dateDisplay: input.dateDisplay,
    sceneType: input.sceneType,
    narrativeShort: input.paragraphs[0],
    narrativeParagraphs: input.paragraphs,
    narrativeBeats: input.beatGroups?.map((group) =>
      group
        .map((index) => input.paragraphs[index])
        .filter((line): line is string => line !== undefined),
    ),
    masterLine: input.masterLine,
    choreographyKey: input.choreographyKey,
    visualVariant: input.visualVariant,
    epistemicStatus: input.epistemicStatus
      ? `${input.epistemicStatus} · ${EDITORIAL_DRAFT_STATUS}`
      : EDITORIAL_DRAFT_STATUS,
    evidenceBadgeMode: "hidden",
    featuredClaims: [],
    themeSlugs: [],
    mediaSlot: {
      key: input.slug,
      expectedPath,
      ready: input.imageReady ?? false,
      videoPath: input.videoPath,
      altText: input.previewAltText ?? "",
      label: input.imageReady
        ? "Visualisasi artistik · pratinjau editorial"
        : "Media utama sedang dipersiapkan",
    },
  };
}

function act(
  order: number,
  slug: string,
  title: string,
  dateRangeDisplay: string,
  introCopy: string | readonly string[],
  visualEraKey: string,
  scenes: readonly SceneDto[],
): ActDto {
  return {
    id: `production-act-${order}`,
    slug,
    order,
    title,
    dateRangeDisplay,
    introCopy,
    visualEraKey,
    scenes,
  };
}

const ACT_1 = act(
  1,
  "the-land-remembers",
  "Awal Sejarah Kediri",
  "879–1042",
  [
    "Kisah Kediri dimulai dari catatan tertulis, bukan dari legenda tentang sebuah kota yang lahir seketika.",
    "Pada 879 tercatat sebuah keputusan kerajaan. Pada 921, nama Kadhiri muncul dalam prasasti. Pada 1042, wilayah ini menjadi bagian dari perubahan besar di Jawa Timur.",
    "Dari sini, perjalanan Kediri dapat ditelusuri melalui bukti, tempat, dan cerita yang diwariskan.",
  ],
  "ancient",
  [
    scene({
      order: 1,
      slug: "879-first-mark",
      title: "Jejak Pertama",
      dateDisplay: "27 Juli 879",
      sceneType: "hero",
      visualVariant: "material",
      choreographyKey: "inscriptionReveal",
      /*
       * `masterLine` (kalimat pemikul) TIDAK diberikan Chief di revisi ini —
       * dipinjam dari kalimat brief sendiri ("Itulah mengapa perjalanan ini
       * dimulai di sini.") karena tiap scene wajib punya satu (kontrak
       * `production-narrative.test.ts`). Kalimat itu TIDAK diulang lagi di
       * beat manapun di bawah — kalau ini salah, koreksi Chief dipersilakan.
       */
      masterLine: "Itulah mengapa perjalanan ini dimulai di sini.",
      // Lima ketukan (revisi Chief 2026-08-30), satu per paragraf brief —
      // hening di antaranya, tidak digabung: mengapa 879 dicatat → belum ada
      // kota modern → tanggal Prasasti Kwak dipilih → bukan lahir sekaligus,
      // melainkan titik tambat kronologi → jembatan 42 tahun menuju nama
      // (921), berdiri sendiri sebagai ketukan penutup sebelum handoff.
      beatGroups: [[0], [1], [2], [3], [4]],
      imageReady: true,
      // Crop lolos verifikasi Redo Register (REDO-ASSET-001); disajikan
      // statis, tanpa gerbang route pratinjau.
      imagePath: "/journey-approved/01-879-first-mark.webp",
      previewAltText:
        "Visualisasi artistik permukaan batu prasasti dalam cahaya menyudut; relief aksara dan angka tahun 879 tampak timbul dari kegelapan.",
      paragraphs: [
        "Lebih dari sebelas abad lalu, sebuah prasasti dibuat pada masa Jawa kuno.",
        'Hari itu tentu tidak disebut sebagai "Hari Jadi Kota Kediri". Kota modern bahkan belum ada.',
        "Tetapi tanggal yang tercatat dalam Prasasti Kwak—27 Juli 879—kelak dipilih sebagai titik awal peringatan sejarah Kediri.",
        "Bukan karena Kediri lahir sekaligus pada satu hari, tetapi karena dari sinilah kronologi yang kita miliki mulai dapat ditambatkan pada sebuah tanggal.",
        "42 tahun kemudian, sejarah memberi kita sesuatu yang lebih penting daripada tanggal: sebuah nama.",
      ],
    }),
    scene({
      order: 2,
      slug: "921-kadhiri",
      title: "Kadhiri",
      dateDisplay: "19 SEPTEMBER 921",
      sceneType: "supporting",
      visualVariant: "word",
      choreographyKey: "nameEmerges",
      // Tujuh ketukan: pembuka dua baris → Prasasti Harinjing B → momen
      // penting → wilayah kini bernama → makna kāḍiri → nama bertahan lintas
      // zaman → transisi menuju scene 1015.
      beatGroups: [[0, 1], [2], [3], [4], [5], [6], [7]],
      imageReady: true,
      // Crop lolos verifikasi Redo Register (REDO-ASSET-002); disajikan
      // statis, tanpa gerbang route pratinjau.
      imagePath: "/journey-approved/02-921-kadhiri.webp",
      previewAltText:
        "Visualisasi artistik bongkah batu prasasti dengan kata kadhiri terbaca di tengah barisan aksara kuno.",
      masterLine: "Kadhiri. Sebuah nama muncul dari dalam sejarah.",
      paragraphs: [
        "Nama itu muncul:",
        "Kadhiri.",
        "Dalam Prasasti Harinjing B, bertarikh 19 September 921, nama Kadhiri tercatat secara tertulis pada masa Raja Rakai Layang Dyah Tulodong.",
        "Inilah salah satu momen penting dalam sejarah Kediri.",
        "Sebuah wilayah yang sebelumnya kita kenali melalui jejak masa lalu kini memiliki nama yang dapat kita baca lebih dari seribu tahun kemudian.",
        "Dalam bahasa Jawa Kuno, kāḍiri dikaitkan dengan makna berdiri sendiri, mandiri, atau berdiri tegak.",
        "Nama itu akan bertahan melewati kerajaan, perang, kolonialisme, revolusi, dan modernisasi.",
        "Dan nama Kadhiri tidak berhenti pada satu prasasti.",
      ],
    }),
    scene({
      order: 3,
      slug: "1015-name-endures",
      title: "Nama yang Kembali Muncul",
      dateDisplay: "7 Juni 1015",
      sceneType: "interlude",
      visualVariant: "document",
      epistemicStatus: "Research Hold",
      choreographyKey: "nameEndures",
      // Lima ketukan: pengulangan nama, catatan Carama, lokasi lempeng,
      // makna catatan berulang, lalu transisi ke pembagian 1042.
      beatGroups: [[0], [1], [2], [3], [4]],
      imageReady: true,
      // Crop lolos verifikasi Redo Register (REDO-ASSET-003); disajikan
      // statis, tanpa gerbang route pratinjau.
      imagePath: "/journey-approved/03-1015-name-endures.webp",
      previewAltText:
        "Visualisasi artistik lempeng tembaga gelap dengan jejak tulisan samar; nama Kadhiri hampir tak terbaca, sengaja menyisakan ketidakpastian.",
      masterLine: "Nama yang Kembali Muncul",
      paragraphs: [
        "Nama Kadhiri yang tercatat pada 921 muncul lagi hampir satu abad kemudian.",
        "Prasasti Carama, bertarikh 7 Juni 1015, mencatat penganugerahan yang berkaitan dengan Sri Mahadewi yang bertakhta di Kadhiri.",
        "Lempeng tembaganya kini tercatat berada di Frankfurt, Jerman.",
        "Penyebutan berulang ini menunjukkan bahwa Kadhiri sudah dikenal dalam lingkungan politik Jawa sebelum masa Panjalu.",
        "Setelah itu, perubahan politik yang lebih besar terjadi pada 1042.",
      ],
    }),
    scene({
      order: 4,
      slug: "1042-river-divides-kingdom",
      title: "Panjalu dan Janggala",
      dateDisplay: "1042",
      sceneType: "hero",
      visualVariant: "landscape",
      choreographyKey: "dividedKingdom",
      beatGroups: [[0], [1], [2], [3], [4], [5]],
      imageReady: true,
      // Crop lolos verifikasi Redo Register (REDO-ASSET-004); disajikan
      // statis, tanpa gerbang route pratinjau.
      imagePath: "/journey-approved/04-1042-river-divides-kingdom.webp",
      previewAltText:
        "Visualisasi artistik pandangan udara malam: sungai Brantas membelah dataran menjadi wilayah Panjalu di barat dan Janggala di timur.",
      masterLine: "Panjalu dan Janggala",
      paragraphs: [
        "Perubahan itu terjadi pada 1042, ketika kekuasaan Airlangga dibagi menjadi Panjalu dan Janggala.",
        "Pembagian ini mengubah peta politik Jawa Timur.",
        "Tradisi kemudian mengisahkan Mpu Bharada membelah tanah dengan air suci untuk menandai kedua wilayah.",
        "Kisah itu adalah tradisi, bukan catatan peristiwa yang dapat dipastikan secara langsung.",
        "Brantas berada di antara kedua wilayah tersebut.",
        "Dari pembagian ini, Panjalu berkembang dengan Daha sebagai pusat kekuasaannya.",
      ],
    }),
  ],
);

const ACT_2 = act(
  2,
  "panjalu-rises",
  "Panjalu Bangkit",
  "c. 1042–1222",
  "Setelah pembagian 1042, Panjalu berkembang dengan Daha sebagai pusat kekuasaan. Masa ini meninggalkan prasasti dan karya sastra penting dalam sejarah Jawa.",
  "panjalu",
  [
    scene({
      order: 5,
      slug: "daha-centre-of-power",
      title: "Daha, Pusat Kekuasaan",
      dateDisplay: "Daha",
      sceneType: "supporting",
      visualVariant: "landscape",
      choreographyKey: "dahaLiving",
      imageReady: true,
      // Direktif Chief 2026-08-28: Daha bergerak sebagai video dahanasada;
      // citra 05-daha tetap poster + fallback, dan citranya sendiri pindah
      // menjadi latar kartu judul act "Panjalu Rises".
      videoPath: "/journey-approved/05-daha-centre-of-power.mp4",
      previewAltText:
        "Visualisasi artistik imajiner kota kuno berkabut di lembah sungai saat fajar; bentuknya sengaja tidak pasti karena wujud fisik Daha tidak diketahui.",
      masterLine: "Daha menjadi pusat kekuasaan Panjalu.",
      beatGroups: [[0], [1]],
      paragraphs: [
        "Setelah pembagian 1042, Daha menjadi pusat kekuasaan Panjalu pada abad ke-11 dan ke-12.",
        "Di kawasan ini keputusan kerajaan dibuat dan kehidupan politik Panjalu berlangsung. Bentuk fisik kotanya belum dapat dipastikan sepenuhnya, tetapi nama Daha tetap tercatat dalam teks dan nama tempat.",
      ],
    }),
    scene({
      order: 6,
      slug: "1135-panjalu-jayati",
      title: "Panjalu Jayati",
      dateDisplay: "1135",
      sceneType: "hero",
      visualVariant: "word",
      choreographyKey: "royalConsolidation",
      imageReady: true,
      /*
       * Footage Jayabaya dipasang di sini atas direktif Chief 2026-09-04.
       * Sosok raja di dalamnya REKAAN: tidak ada potret Jayabhaya yang
       * terdokumentasi, dan status epistemik di bawah menyatakannya di
       * halaman, bukan hanya di komentar ini. Citra prasasti tetap poster dan
       * fallback tanpa JavaScript.
       */
      videoPath: "/journey-approved/jayabaya.mp4",
      epistemicStatus:
        "Sosok raja dalam visual adalah rekaan; tidak ada potret Jayabhaya yang terdokumentasi",
      previewAltText:
        "Visualisasi artistik imajiner seorang raja bermahkota di balai batu berelief; wajah dan busananya rekaan, bukan potret Jayabhaya yang terdokumentasi.",
      masterLine: "Panjalu tampil sebagai kerajaan yang kuat.",
      paragraphs: [
        "Dari Daha, Panjalu berkembang menjadi salah satu kekuatan penting di Jawa Timur.",
        "Pada masa Jayabhaya, Prasasti Hantang memuat frasa Panjalu Jayati, yang berarti Panjalu menang.",
        "Frasa itu menjadi penanda penting bagi kedudukan Panjalu pada masanya.",
        "Kekuatan Panjalu tidak hanya terlihat dalam politik, tetapi juga dalam karya sastra.",
      ],
    }),
    scene({
      order: 7,
      slug: "1157-words-become-monuments",
      title: "Kata-Kata yang Bertahan",
      dateDisplay: "1157",
      sceneType: "hero",
      visualVariant: "document",
      choreographyKey: "manuscriptWorld",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik naskah kuno terbuka bertinta emas; halaman kiri memuat iluminasi adegan kereta perang epos Bharatayuddha.",
      masterLine: "Kediri juga meninggalkan warisan sastra.",
      paragraphs: [
        "Selain prasasti, masa Panjalu juga meninggalkan karya sastra Jawa Kuno.",
        "Kakawin Bharatayuddha, yang dikaitkan dengan Mpu Sedah dan Mpu Panuluh, adalah salah satu karya penting dari masa itu.",
        "Melalui teks seperti ini, kita mengenal bahasa, cerita, dan gagasan yang berkembang di lingkungan Kediri.",
        "Warisan budaya Kediri juga berlanjut melalui cerita Panji.",
      ],
    }),
    scene({
      order: 8,
      slug: "panji-story-left-kediri",
      title: "Panji, Cerita yang Melampaui Kediri",
      dateDisplay: "Panji",
      sceneType: "supporting",
      visualVariant: "document",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik hamparan banyak naskah dari tradisi berbeda; kisah Panji yang sama hidup dalam gaya dan bahasa yang berlainan.",
      masterLine: "Cerita Panji berkembang melampaui Kediri.",
      paragraphs: [
        "Kisah Panji berakar pada lingkungan budaya Kediri, Daha, dan Janggala.",
        "Kisah ini kemudian hadir dalam manuskrip dan pertunjukan di berbagai daerah.",
        "Penyebarannya ke berbagai bahasa dan tradisi Asia Tenggara menunjukkan luasnya pengaruh budaya tersebut.",
        "Sementara cerita Panji terus berkembang, kedudukan politik Kediri mulai berubah pada abad ke-13.",
      ],
    }),
  ],
);

const ACT_3 = act(
  3,
  "the-throne-breaks",
  "Pusat Kekuasaan Berpindah",
  "1222–1293",
  [
    "Pada abad ke-13, lanskap kekuasaan di Jawa Timur mengalami pergeseran paling menentukan. Pertempuran Ganter pada 1222 mematahkan hegemoni wangsa Isyana di Daha, ketika Ken Arok memimpin Tumapel meruntuhkan kekuasaan Raja Kertajaya dan meletakkan fondasi bagi berdirinya Singhasari.",
    "Kediri tidak lenyap. Meski takhta utama berpindah ke timur Gunung Kawi, lembah Brantas tetap menjadi jantung agraris yang subur dan urat nadi perniagaan sungai. Daha tetap hidup sebagai kadipaten terkemuka—menyimpan tradisi sastra, tata kelola air, dan memori kedaulatan yang terus dipelihara oleh para keturunan rajanya.",
    "Tujuh dasawarsa berselang, bayang-bayang masa lalu kembali bangkit. Pada 1292, Jayakatwang memimpin perlawanan dari Daha untuk meruntuhkan Singhasari dan merebut kembali mahkota kekuasaan leluhurnya. Namun dunia di sekeliling Kediri telah berubah; kebangkitan singkat ini segera berbenturan dengan kedatangan armada besar Mongol Dinasti Yuan dan manuver Raden Wijaya yang melahirkan kemegahan Majapahit pada 1293.",
    "Babak ini menutup riwayat Kediri sebagai imperium berdaulat, tetapi menegaskan ketahanannya sebagai pusat peradaban: istana boleh berganti dan takhta boleh berpindah, namun Kediri melampaui usia kerajaan-kerajaan yang pernah menguasainya.",
  ],
  "collapse",
  [
    scene({
      order: 9,
      slug: "1222-ganter",
      title: "Ganter",
      dateDisplay: "1222",
      sceneType: "hero",
      visualVariant: "landscape",
      choreographyKey: "politicalFracture",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik peta kartografis bernuansa bara: wilayah Panjalu, Jenggala, Madiun, dan Lumajang dengan panah pergerakan pasukan tahun 1222.",
      masterLine: "Pada 1222, pusat kekuasaan bergeser dari Kediri.",
      paragraphs: [
        "Perubahan politik ini mencapai titik penting pada Pertempuran Ganter tahun 1222.",
        "Kediri kehilangan kedudukan sebagai pusat kekuasaan utama, sementara Tumapel bangkit dan kemudian berkembang menjadi Singhasari.",
        "Sesudahnya, pusat politik Jawa Timur bergeser ke Tumapel dan Singhasari.",
        "Kediri tetap ada sebagai wilayah dan kota, tetapi perannya berubah.",
      ],
    }),
    scene({
      order: 10,
      slug: "1292-the-return",
      title: "JAYAKATWANG",
      dateDisplay: "1292",
      sceneType: "supporting",
      visualVariant: "word",
      choreographyKey: "royalConsolidation",
      imageReady: true,
      previewAltText:
        "Rekonstruksi artistik suasana krisis 1292: bara istana dan lintasan kampanye tanpa potret tokoh yang dapat diautentikasi.",
      masterLine: "RAJA KEDIRIAN TERAKHIR",
      paragraphs: [
        "Tujuh puluh tahun setelah Ganter, Jayakatwang menjatuhkan Singhasari pada 1292.",
        "Pusat kekuasaan kembali ke Daha untuk waktu yang singkat.",
        "Namun situasi politik Jawa sudah berubah dibanding masa Panjalu sebelumnya.",
        "Pada 1293, Jayakatwang dikalahkan oleh pasukan Raden Wijaya.",
      ],
    }),
    scene({
      order: 11,
      slug: "1293-last-kingdom",
      title: "Akhir Kerajaan Kediri",
      dateDisplay: "1293",
      sceneType: "hero",
      visualVariant: "landscape",
      choreographyKey: "politicalFracture",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik montase tiga kekuatan tahun 1293: armada Yuan, peta strategi Jawa Timur, dan dua figur penguasa yang saling berhadapan.",
      masterLine: "Pada 1293, Kerajaan Kediri berakhir.",
      paragraphs: [
        "Kekalahan Jayakatwang mempertemukan Kediri dengan pasukan Yuan dan Raden Wijaya.",
        "Raden Wijaya mula-mula bekerja sama dengan pasukan Yuan untuk mengalahkan Jayakatwang, lalu berbalik melawan mereka.",
        "Dari rangkaian peristiwa ini muncul Majapahit, dan Kerajaan Kediri berakhir sebagai kekuasaan berdaulat.",
        "Kediri tetap menjadi nama tempat dan ruang hidup masyarakatnya.",
      ],
    }),
  ],
);

const ACT_4 = act(
  4,
  "after-the-kings",
  "Setelah Masa Kerajaan",
  "Setelah 1293",
  "Setelah Kerajaan Kediri berakhir, nama, tokoh, dan cerita dari masa Panjalu tetap hidup dalam naskah, pertunjukan, dan tradisi masyarakat.",
  "memory",
  [
    scene({
      order: 12,
      slug: "jayabaya-after-jayabaya",
      title: "Jayabaya dalam Ingatan",
      dateDisplay: "Jayabaya",
      sceneType: "supporting",
      visualVariant: "document",
      choreographyKey: "manuscriptWorld",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik penggambaran kemudian tentang raja di atas takhta di tengah kerumunan; bukan potret historis Jayabhaya, melainkan citra yang diwariskan tradisi.",
      masterLine: "Jayabhaya dikenal dalam sejarah dan tradisi.",
      paragraphs: [
        "Setelah kerajaan berakhir, Jayabhaya tetap diingat sebagai raja Panjalu dari abad ke-12.",
        "Dalam tradisi kemudian, Jayabaya juga dikaitkan dengan ramalan, Zaman Edan, dan Ratu Adil.",
        "Keduanya perlu dibedakan: Jayabhaya sebagai tokoh sejarah dan Jayabaya sebagai tokoh dalam tradisi.",
        "Tradisi ini penting sebagai bagian dari ingatan budaya Jawa, bukan sebagai bukti bahwa ramalannya pasti terjadi.",
      ],
    }),
    scene({
      order: 13,
      slug: "shadow-archive",
      title: "Cerita yang Hidup dalam Tradisi",
      dateDisplay: "Tradition",
      sceneType: "optional",
      visualVariant: "landscape",
      epistemicStatus: "Tradition · Folklore · Urban Legend",
      choreographyKey: "politicalFracture",
      imageReady: true,
      previewAltText:
        "Visualisasi folklor: gunung Kelud bergolak, sosok banteng bertanduk, dan figur-figur legenda Kediri berlapis dalam kegelapan naskah.",
      masterLine: "Tradisi dan fakta sejarah perlu dibedakan.",
      paragraphs: [
        "Selain kisah Jayabaya, Kediri memiliki banyak cerita rakyat seperti Calon Arang, Lembu Suro, dan kisah Kelud.",
        "Cerita-cerita ini hidup dalam sastra, ritual, dan ingatan masyarakat.",
        "Situs ini tidak menyajikannya sebagai fakta tentang peristiwa supernatural.",
        "Yang dapat dipelajari adalah cara masyarakat memakai cerita untuk mengingat dan memahami lingkungannya.",
      ],
    }),
  ],
);

const ACT_5 = act(
  5,
  "empires-cross-brantas",
  "Brantas dalam Perebutan Kekuasaan",
  "1678",
  "Pada abad ke-17, Kediri kembali menjadi wilayah konflik. Brantas, yang dahulu berada di antara Panjalu dan Janggala, menjadi bagian dari strategi pertahanan dan pergerakan pasukan.",
  "seventeenthCentury",
  [
    scene({
      order: 14,
      slug: "1678-river-fortress",
      title: "Brantas sebagai Pertahanan",
      dateDisplay: "1678",
      sceneType: "hero",
      visualVariant: "landscape",
      choreographyKey: "politicalFracture",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik masa konflik Trunajaya: perahu-perahu pasukan menyeberangi Brantas di antara palisade dan menara kayu.",
      masterLine: "Pada 1678, Brantas menjadi bagian dari pertahanan.",
      paragraphs: [
        "Dalam konflik Trunajaya, Kediri kembali menjadi wilayah perebutan kekuasaan.",
        "Brantas menjadi rintangan militer sekaligus bagian dari pertahanan wilayah.",
        "Sungai yang pernah menandai pembagian dua kerajaan kini memengaruhi pergerakan pasukan.",
        "Pada masa berikutnya, sungai yang sama juga akan dihubungkan oleh infrastruktur kota.",
      ],
    }),
  ],
);

const ACT_6 = act(
  6,
  "iron-sugar-modern-city",
  "Besi, Gula, dan Kota Modern",
  "Abad ke-19–1942",
  "Pada abad ke-19, Kediri masuk ke dalam jaringan perkebunan gula, transportasi, dan administrasi kolonial. Perubahan ini membentuk pekerjaan, ruang kota, dan kehidupan warganya.",
  "colonialIndustrial",
  [
    scene({
      order: 15,
      slug: "sugar-changes-land",
      title: "Gula Mengubah Lanskap",
      dateDisplay: "Sugar",
      sceneType: "supporting",
      visualVariant: "landscape",
      choreographyKey: "industrialExpansion",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik kompleks pabrik gula Meritjan: cerobong, roda mesin, lori tebu, dan rel yang menjalin tanah menjadi satu sistem.",
      masterLine: "Perkebunan gula mengubah ekonomi dan ruang Kediri.",
      paragraphs: [
        "Sesudah masa konflik, Kediri masuk ke dalam ekonomi perkebunan kolonial.",
        "Tebu menghubungkan lahan, pabrik, jalan, rel, gudang, dan pasar.",
        "Jaringan ini mengatur penggunaan tanah, tenaga kerja, dan pergerakan barang.",
        "Dari sini, Kediri semakin terhubung dengan wilayah di luar kota.",
      ],
    }),
    scene({
      order: 16,
      slug: "1869-brantas-bridge",
      title: "Besi Melintasi Brantas",
      dateDisplay: "18 Maret 1869",
      sceneType: "hero",
      visualVariant: "structure",
      choreographyKey: "bridgeConstruction",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik jembatan rangka besi melintasi Brantas beserta diagram struktur penopangnya; besi mengubah pemisah menjadi penghubung.",
      masterLine: "Pada 1869, Jembatan Lama menghubungkan dua sisi Brantas.",
      paragraphs: [
        "Jaringan perkebunan membutuhkan pergerakan orang dan barang yang lebih lancar.",
        "Pada 1869, Jembatan Lama memberi jalur tetap untuk melintasi Brantas.",
        "Jembatan ini memudahkan perjalanan, perdagangan, dan hubungan antara dua sisi kota.",
        "Infrastruktur menjadi bagian penting dari perubahan Kediri pada abad ke-19.",
      ],
    }),
    scene({
      order: 17,
      slug: "1906-city-on-paper",
      title: "Kota dalam Administrasi Kolonial",
      dateDisplay: "1906",
      sceneType: "supporting",
      visualVariant: "document",
      choreographyKey: "manuscriptWorld",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik kota kolonial 1906: stasiun kereta, gereja, jalan beraspal, dan kehidupan yang tertata di atas kertas administrasi.",
      masterLine: "Pada 1906, Kediri menjadi kotapraja kolonial.",
      paragraphs: [
        "Setelah jaringan transportasi berkembang, pemerintahan kota juga ditata ulang pada masa kolonial.",
        "Pada 1906, Kediri memperoleh bentuk pemerintahan kotapraja kolonial.",
        "Administrasi, jalan, kantor, pajak, dan aturan kota berkembang dalam sistem tersebut.",
        "Namun penduduk tidak diperlakukan setara; hukum dan kedudukan sosial dibedakan menurut ras serta kelompoknya.",
      ],
    }),
    scene({
      order: 18,
      slug: "1912-bridge-lift",
      title: "Jembatan Lama Ditinggikan",
      dateDisplay: "1912",
      sceneType: "hero",
      visualVariant: "structure",
      choreographyKey: "bridgeLift",
      epistemicStatus: "Detail teknis masih memerlukan verifikasi arsip",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik Jembatan Lama setelah ditinggikan; panel-panel detail teknik bersifat ilustratif dan belum terverifikasi arsip.",
      masterLine: "Pada 1912, Jembatan Lama disesuaikan dengan kondisi sungai.",
      paragraphs: [
        "Ketika kondisi sungai dan kebutuhan transportasi berubah, jembatan juga perlu disesuaikan.",
        "Arsip menunjukkan bahwa Jembatan Lama pernah ditinggikan pada 1912, meski detail tekniknya masih memerlukan verifikasi akhir.",
        "Perubahan ini menunjukkan bahwa infrastruktur kota harus mengikuti kondisi lingkungan dan kebutuhan masyarakat.",
      ],
    }),
    scene({
      order: 19,
      slug: "people-between-monuments",
      title: "Orang-Orang yang Menghidupkan Kota",
      dateDisplay: "People",
      sceneType: "interlude",
      visualVariant: "document",
      choreographyKey: "industrialExpansion",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik mozaik kehidupan sehari-hari Kediri: keluarga di beranda, pasar pagi, ruang kelas, ibadah, dan perahu di sungai.",
      masterLine: "Perubahan kota juga dialami oleh warganya.",
      paragraphs: [
        "Jalan, jembatan, pabrik, dan kantor mengubah bentuk kota, tetapi perubahan itu dijalani oleh warganya.",
        "Warga bekerja, berdagang, belajar, beribadah, membangun keluarga, dan mengelola kehidupan sehari-hari.",
        "Karena itu, sejarah Kediri juga merupakan sejarah kehidupan masyarakatnya dari hari ke hari.",
      ],
    }),
  ],
);

const ACT_7 = act(
  7,
  "occupation-revolution-republic",
  "Pendudukan, Revolusi, dan Republik",
  "1942–1950",
  "Pada 1942 hingga 1950, Kediri mengalami pendudukan Jepang, revolusi kemerdekaan, dan pembentukan pemerintahan kota dalam Republik Indonesia.",
  "occupationRevolution",
  [
    scene({
      order: 20,
      slug: "1942-world-war-arrives",
      title: "Perang Dunia Tiba di Kediri",
      dateDisplay: "1942",
      sceneType: "supporting",
      visualVariant: "document",
      epistemicStatus: "Memerlukan penguatan arsip Kediri-spesifik",
      choreographyKey: "politicalFracture",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik masa pendudukan 1942: kendaraan lapis baja dan tentara di depan stasiun Kediri, pesawat di langit, poster propaganda di dinding.",
      masterLine: "Pada 1942, pendudukan Jepang mengubah kehidupan Kediri.",
      paragraphs: [
        "Perubahan kota pada masa kolonial berlanjut ke masa perang.",
        "Pada 1942, pendudukan Jepang mengubah pemerintahan, produksi, transportasi, dan kehidupan sehari-hari di Kediri.",
        "Kehidupan banyak warga menjadi lebih tidak pasti.",
      ],
    }),
    scene({
      order: 21,
      slug: "1947-1948-sugar-weapons",
      title: "Pabrik dan Masa Revolusi",
      dateDisplay: "1947–1948",
      sceneType: "hero",
      visualVariant: "structure",
      choreographyKey: "revolutionMachine",
      epistemicStatus: "Klaim produksi mortir belum terverifikasi final",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik bersyarat interior pabrik gula Meritjan masa revolusi; mesin yang sama, tujuan yang berubah — klaim persenjataan belum terverifikasi.",
      masterLine:
        "Pada masa revolusi, fasilitas kota dapat mendukung perjuangan.",
      paragraphs: [
        "Sesudah pendudukan, jalan, jembatan, dan pabrik dapat menjadi bagian dari perjuangan mempertahankan kemerdekaan.",
        "Riset proyek ini mencatat kemungkinan fasilitas Meritjan turut digunakan untuk kebutuhan perjuangan.",
        "Kemungkinan ini belum cukup kuat untuk ditampilkan sebagai fakta pasti; jenis produksi dan bukti arsipnya masih perlu diverifikasi.",
      ],
    }),
    scene({
      order: 22,
      slug: "1950-city-republic",
      title: "Kota dalam Republik",
      dateDisplay: "1950",
      sceneType: "supporting",
      visualVariant: "document",
      choreographyKey: "manuscriptWorld",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik dokumen pemerintahan daerah tahun 1950 dengan lambang Garuda dan kantor pemerintah kota di latar belakang.",
      masterLine: "Pada 1950, Kediri berada dalam kerangka Republik Indonesia.",
      paragraphs: [
        "Sesudah revolusi, pemerintahan Kediri ditempatkan dalam kerangka Republik Indonesia pada 1950.",
        "Tahun 879, 1906, dan 1950 menjelaskan lapisan sejarah yang berbeda: tanggal yang diperingati, kotapraja kolonial, dan kota dalam Republik Indonesia.",
        "Ketiganya membantu menjelaskan perjalanan Kediri hingga memasuki masa industri.",
      ],
    }),
  ],
);

const ACT_8 = act(
  8,
  "industrial-city",
  "Kota Industri",
  "1958–2000",
  "Sejak akhir 1950-an, industri menjadi salah satu penggerak ekonomi, pekerjaan, dan perkembangan kota Kediri.",
  "industrialCity",
  [
    scene({
      order: 23,
      slug: "1958-from-1000-square-metres",
      title: "Dari Ruang yang Terbatas",
      dateDisplay: "1958",
      sceneType: "hero",
      visualVariant: "structure",
      choreographyKey: "industrialExpansion",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik ruang kerja tahun 1958 seluas seribu meter persegi: para pekerja melinting di meja kayu di bawah lampu gantung.",
      masterLine: "Industri menjadi salah satu penggerak pertumbuhan Kediri.",
      paragraphs: [
        "Setelah menjadi kota dalam Republik, Kediri memasuki masa pertumbuhan industri.",
        "Pada 1958, sebuah usaha rokok didirikan di Kediri dalam ruang yang terbatas.",
        "Pertumbuhannya kemudian membuka pekerjaan dan memperluas kegiatan industri di kota.",
        "Pabrik, jalan, lingkungan, dan kegiatan ekonomi kota ikut berubah.",
      ],
    }),
    scene({
      order: 24,
      slug: "1990-kediri-to-market",
      title: "Dari Kediri ke Pasar Modal",
      dateDisplay: "1990+",
      sceneType: "supporting",
      visualVariant: "document",
      choreographyKey: "industrialExpansion",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik jalan industri-perdagangan Kediri era 1990-an: truk, papan usaha, dan lalu lintas kota yang tumbuh bersama satu sektor besar.",
      masterLine: "Industri Kediri terhubung dengan ekonomi nasional.",
      paragraphs: [
        "Pertumbuhan industri membawa Kediri ke jaringan ekonomi yang lebih luas.",
        "Pada 1990, perusahaan yang berawal dari Kediri masuk ke pasar modal nasional.",
        "Industri menciptakan pekerjaan, produksi, dan pengaruh ekonomi bagi kota.",
        "Di sisi lain, kota perlu terus mengembangkan sumber pertumbuhan selain satu sektor utama.",
      ],
    }),
  ],
);

const ACT_9 = act(
  9,
  "city-connects",
  "Kediri yang Terhubung",
  "2000–2026",
  "Cara Kediri terhubung terus berubah: dari Brantas dan jembatan, ke jalan serta rel, hingga konektivitas udara pada masa kini.",
  "connectedModern",
  [
    scene({
      order: 25,
      slug: "two-bridges-two-centuries",
      title: "Dua Jembatan, Dua Abad",
      dateDisplay: "Two Bridges",
      sceneType: "hero",
      visualVariant: "structure",
      choreographyKey: "bridgeConstruction",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik dua zaman dalam satu bingkai: jembatan rangka besi bernuansa sepia berpadu dengan jembatan beton modern saat senja.",
      masterLine: "Dua jembatan menunjukkan perubahan kebutuhan kota.",
      paragraphs: [
        "Pertumbuhan ekonomi dan kota meningkatkan kebutuhan akan konektivitas.",
        "Di atas Brantas, Jembatan Lama dari abad ke-19 berdiri berdampingan dengan jembatan yang lebih baru.",
        "Jembatan yang lebih baru mengambil sebagian fungsi lalu lintas yang dahulu ditangani Jembatan Lama.",
        "Keduanya menunjukkan bagaimana infrastruktur Kediri menyesuaikan kebutuhan dari waktu ke waktu.",
      ],
    }),
    scene({
      order: 26,
      slug: "2024-2026-river-to-runway",
      title: "Dari Sungai ke Landasan Pacu",
      dateDisplay: "2024–2026",
      sceneType: "hero",
      visualVariant: "landscape",
      choreographyKey: "runwayTransition",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik Bandara Dhoho Kediri saat senja: pesawat lepas landas di atas terminal, sungai dan jalan raya mengalir di sisi barat.",
      masterLine: "Bandara Dhoho menambah pilihan konektivitas wilayah Kediri.",
      paragraphs: [
        "Dari jalur sungai dan jembatan, konektivitas Kediri berkembang ke jalan, rel, dan jalur udara.",
        "Bandara Dhoho menambah pilihan konektivitas bagi wilayah Kediri.",
        "Bandara ini melanjutkan perubahan cara orang dan barang bergerak di wilayah Kediri.",
        "Perjalanan itu membawa kita kembali ke Kediri hari ini.",
      ],
    }),
  ],
);

export const PRODUCTION_JOURNEY: JourneyManifestDto = {
  acts: [ACT_1, ACT_2, ACT_3, ACT_4, ACT_5, ACT_6, ACT_7, ACT_8, ACT_9],
  sceneCount: 26,
};

const PREVIEW_PATH_PREFIX = "/api/editorial-preview/";

/**
 * Daftar putih berkas pratinjau editorial, DITURUNKAN dari naskah produksi —
 * bukan daftar tangan yang bisa basi. Setiap slot siap menyumbang derivatif
 * 1536w dan 768w; route `/api/editorial-preview/` menolak nama di luar ini.
 */
export function editorialPreviewAssetNames(): ReadonlySet<string> {
  const names = new Set<string>();
  const add = (path: string | undefined): void => {
    if (!path?.startsWith(PREVIEW_PATH_PREFIX)) return;
    const filename = path.slice(PREVIEW_PATH_PREFIX.length);
    names.add(filename);
    names.add(filename.replace(/\.webp$/u, "-w768.webp"));
  };
  for (const item of PRODUCTION_JOURNEY.acts) {
    for (const sceneItem of item.scenes) {
      if (sceneItem.mediaSlot?.ready) add(sceneItem.mediaSlot.expectedPath);
    }
  }
  add(PRODUCTION_PROLOGUE.media?.path);
  add(PRODUCTION_FINALE.media?.path);
  return names;
}

/**
 * Menyambungkan relasi publik yang sudah lolos CMS ke naskah produksi penuh.
 * Copy, urutan, status epistemik, visual intent, dan anchor mengikuti keputusan
 * Chief; CMS tetap satu-satunya sumber event, bukti, dan media terbit.
 */
export function composeProductionJourney(
  published: JourneyManifestDto,
): JourneyManifestDto {
  const publishedScenes = new Map(
    published.acts
      .flatMap((item) => item.scenes)
      .map((item) => [item.slug, item]),
  );
  return {
    acts: PRODUCTION_JOURNEY.acts.map((item) => ({
      ...item,
      scenes: item.scenes.map((productionScene) => {
        const cmsScene = publishedScenes.get(productionScene.slug);
        if (!cmsScene) return productionScene;
        return {
          ...productionScene,
          id: cmsScene.id,
          subtitle: cmsScene.subtitle ?? productionScene.subtitle,
          primaryEvent: cmsScene.primaryEvent,
          featuredClaims: cmsScene.featuredClaims,
          heroMedia: cmsScene.heroMedia,
          themeSlugs: cmsScene.themeSlugs,
          evidenceBadgeMode: cmsScene.evidenceBadgeMode,
        };
      }),
    })),
    sceneCount: PRODUCTION_JOURNEY.sceneCount,
  };
}
