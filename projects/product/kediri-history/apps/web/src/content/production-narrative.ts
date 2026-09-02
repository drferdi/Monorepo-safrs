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

export interface FramingNarrative {
  readonly eyebrow: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  /** Pengelompokan indeks paragraf menjadi ketukan editorial di dalam frame. */
  readonly beatGroups?: readonly (readonly number[])[];
  readonly masterLine: string;
  readonly media?: FramingMedia;
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
  // Direktif Chief 2026-08-28: halaman gelap pembuka memakai video opening;
  // citra 00-prologue tetap poster + fallback (Finale tetap citra statis).
  videoPath: "/journey-approved/00-prologue.mp4",
  continuationVideoPath: "/journey-approved/00-prologue-daha.mp4",
  altText:
    "Visualisasi artistik Kediri kontemporer saat senja: jembatan di atas Brantas, lalu lintas menyala, dan kota yang hidup di kedua tepian sungai.",
  continuationAltText:
    "Rekonstruksi artistik Daha abad XII berdasarkan konteks sejarah; bukan representasi arkeologis definitif.",
  label: "REKONSTRUKSI ARTISTIK · DAHA, ABAD XII",
  labelDetail:
    "Interpretasi visual berdasarkan konteks sejarah; bukan representasi arkeologis definitif.",
};

export const PRODUCTION_PROLOGUE: FramingNarrative = {
  eyebrow: "Kediri · Jawa Timur · 2026",
  title: "KEDIRI, 2026",
  beatGroups: [[0], [1]],
  paragraphs: [
    "Kediri hari ini adalah kota yang kita kenal: jalan yang ramai, pasar yang membuka pagi, kawasan industri, sekolah, rumah ibadah, dan dua tepian kota yang dipertemukan oleh jembatan di atas Brantas.",
    "Namun kota ini menyimpan perjalanan yang jauh lebih panjang daripada bangunan yang terlihat saat ini.",
  ],
  masterLine: "1.147 Tahun Sebelum Hari Ini",
  media: FRAMING_MEDIA_2026,
};

export const PRODUCTION_FINALE: FramingNarrative = {
  eyebrow: "Finale · 2026",
  title: "The City Continues",
  paragraphs: [
    "Kita kembali ke Kediri yang sama seperti ketika perjalanan dimulai.",
    "Brantas masih mengalir. Jembatan masih berdiri. Kendaraan melintas. Pasar bergerak. Orang-orang menjalani hidup mereka.",
    "Namun sekarang, pemandangan itu tidak lagi sama.",
    "Di bawah kota hari ini terdapat lapisan-lapisan waktu.",
    "Dari 27 Juli 879 hingga 2026 terbentang 1.147 tahun.",
    "Bukan 1.147 tahun sebuah pemerintahan yang tidak pernah berubah, tetapi 1.147 tahun sejak tanggal sejarah yang kini dipilih Kediri untuk mengingat perjalanan panjangnya.",
    "Kerajaan datang dan pergi. Kekuasaan berpindah. Jembatan menua. Industri berubah. Generasi berganti.",
    "Tetapi kota tidak pernah benar-benar selesai.",
    "Sebab sejarah bukan cerita tentang masa lalu yang berhenti. Sejarah adalah cara kita memahami mengapa dunia di depan kita menjadi seperti sekarang.",
    "Dan ketika perjalanan ini berakhir, Kediri tetap bergerak.",
  ],
  masterLine:
    "Bab berikutnya belum memiliki tanggal. Kota ini terus berlanjut.",
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
  "1,100+ Years of Kediri",
  "879–1042",
  [
    "Sebelum banyak kota modern memiliki nama, Kadhiri telah tercatat dalam sejarah Jawa.",
    "Jejaknya bermula pada 879 M. Namanya muncul pada 921 M. Daha kemudian menjadi pusat Panjalu, Jayabhaya membawa kerajaan menuju kejayaan, dan lebih dari sebelas abad kemudian, Kediri masih berdiri di tepian Brantas.",
    "Kerajaan berganti. Kekuasaan datang dan pergi. Nama Kediri tetap hidup.",
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
      // Tujuh ketukan pendek: setiap ketukan memuat satu gagasan dan tidak
      // pernah menumpuk lebih dari dua baris pada bidang baca desktop.
      beatGroups: [[0], [1], [2], [3], [4], [5], [6]],
      imageReady: true,
      // Crop lolos verifikasi Redo Register (REDO-ASSET-003); disajikan
      // statis, tanpa gerbang route pratinjau.
      imagePath: "/journey-approved/03-1015-name-endures.webp",
      previewAltText:
        "Visualisasi artistik lempeng tembaga gelap dengan jejak tulisan samar; nama Kadhiri hampir tak terbaca, sengaja menyisakan ketidakpastian.",
      masterLine: "Nama yang Kembali Muncul",
      paragraphs: [
        "Hampir satu abad kemudian, Kadhiri kembali hadir dalam jejak epigrafis.",
        "Prasasti Carama, bertarikh 7 Juni 1015, mencatat penganugerahan yang berkaitan dengan Sri Mahadewi yang bertakhta di Kadhiri.",
        "Basis sejarah proyek ini mencatat lempeng tembaganya kini berada di Frankfurt, Jerman.",
        "Bagi sejarawan, kemunculan nama yang berulang penting.",
        "Karena ia menunjukkan bahwa Kadhiri bukan sekadar sebuah nama yang kebetulan muncul sekali.",
        "Wilayah ini telah menjadi bagian dari dunia politik Jawa sebelum Kerajaan Panjalu mencapai kejayaannya.",
        "Tetapi perubahan terbesar baru terjadi pada 1042.",
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
        "Pada 1042, kekuasaan Airlangga dibagi menjadi dua wilayah: Panjalu dan Janggala.",
        "Pembagian ini mengubah peta politik Jawa Timur.",
        "Dalam tradisi kemudian, Mpu Bharada dikisahkan membelah tanah dengan air suci untuk menandai kedua wilayah.",
        "Kisah Mpu Bharada merupakan bagian dari tradisi, bukan catatan peristiwa yang dapat dipastikan secara langsung.",
        "Di antara kedua wilayah itu mengalir Brantas.",
        "Dari pembagian inilah Panjalu tumbuh, dengan Daha sebagai pusat kekuasaannya.",
      ],
    }),
  ],
);

const ACT_2 = act(
  2,
  "panjalu-rises",
  "Panjalu Rises",
  "c. 1042–1222",
  "Dari pembagian lahir persaingan. Dari persaingan lahir identitas. Panjalu tidak lagi berbicara sebagai bagian dari sesuatu yang telah pecah; ia mulai berbicara dengan suaranya sendiri.",
  "panjalu",
  [
    scene({
      order: 5,
      slug: "daha-centre-of-power",
      title: "Daha: The Centre of Power",
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
      masterLine:
        "Sebagian kota bertahan sebagai reruntuhan. Daha bertahan dalam teks, tempat, dan ingatan.",
      // Narasi Chief 2026-08-28; baris Jawa mendapat beat heningnya sendiri.
      beatGroups: [[0], [1], [2]],
      paragraphs: [
        "Tetapi pada abad ke-11 dan ke-12, Daha adalah pusat kekuasaan.",
        "Kene tau ana sawijining nagara.",
        "Di sinilah keputusan kerajaan dibuat. Di sinilah Panjalu memandang ke seberang dunia politiknya. Dan di sekitar bentang Sungai Brantas, sejarah Kediri bergerak dari satu generasi menuju generasi berikutnya.",
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
      previewAltText:
        "Visualisasi artistik permukaan batu prasasti makro; frasa Panjalu Jayati terukir tegas di antara barisan aksara kuno.",
      masterLine:
        "Sebuah kerajaan yang pernah terbelah telah menemukan suaranya.",
      paragraphs: [
        "Hampir satu abad setelah pembagian Airlangga, Panjalu bukan lagi sekadar salah satu sisi dari kerajaan yang pernah terbelah.",
        "Di bawah Jayabhaya, ia berbicara sebagai kekuasaan yang telah menemukan keyakinannya sendiri.",
        "Pada sebuah prasasti, dua kata bertahan: Panjalu Jayati. Panjalu menang.",
        "Namun kekuatan dua kata itu bukan hanya tentang kemenangan militer. Ia adalah deklarasi identitas.",
        "Sebuah kerajaan yang pernah lahir dari pembagian kini menyatakan bahwa ia tidak lagi hidup di bawah bayang-bayang masa lalu.",
      ],
    }),
    scene({
      order: 7,
      slug: "1157-words-become-monuments",
      title: "Words Become Monuments",
      dateDisplay: "1157",
      sceneType: "hero",
      visualVariant: "document",
      choreographyKey: "manuscriptWorld",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik naskah kuno terbuka bertinta emas; halaman kiri memuat iluminasi adegan kereta perang epos Bharatayuddha.",
      masterLine: "Raja menguasai masa kini. Penyair menjangkau masa depan.",
      paragraphs: [
        "Istana dapat runtuh. Tentara dapat dibubarkan. Wilayah kekuasaan dapat berpindah tangan.",
        "Namun sebuah kalimat dapat bertahan lebih lama daripada semuanya.",
        "Pada masa Kediri, sastra Jawa Kuno mencapai salah satu puncaknya. Bharatayuddha, melalui Mpu Sedah dan Mpu Panuluh, mengubah kisah perang menjadi karya yang terus dibaca jauh setelah dunia politik yang melahirkannya hilang.",
        "Di sinilah kita menemukan bentuk kekuasaan yang lain. Bukan kekuasaan atas tanah, tetapi kekuasaan atas ingatan.",
        "Seorang raja menguasai manusia selama masa pemerintahannya. Seorang penyair dapat berbicara kepada manusia yang belum lahir.",
      ],
    }),
    scene({
      order: 8,
      slug: "panji-story-left-kediri",
      title: "Panji: A Story That Left Kediri",
      dateDisplay: "Panji",
      sceneType: "supporting",
      visualVariant: "document",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik hamparan banyak naskah dari tradisi berbeda; kisah Panji yang sama hidup dalam gaya dan bahasa yang berlainan.",
      masterLine: "Kerajaan memiliki batas. Ceritanya tidak.",
      paragraphs: [
        "Kerajaan memiliki batas. Cerita tidak.",
        "Dunia Panji berakar pada lanskap budaya Kediri, Daha, dan Janggala. Namun dalam perjalanan waktu, kisahnya melampaui tempat kelahirannya.",
        "Ia berpindah dari manuskrip ke pertunjukan. Dari bahasa ke bahasa. Dari Jawa menuju kerajaan dan masyarakat lain di Asia Tenggara.",
        "Kekuasaan politik Kediri akhirnya berakhir. Tetapi imajinasinya terus berjalan.",
        "Dan mungkin inilah salah satu bentuk kemenangan paling panjang yang dapat dimiliki sebuah peradaban: ketika orang-orang yang tidak pernah melihat kerajaannya tetap mengenal ceritanya.",
      ],
    }),
  ],
);

const ACT_3 = act(
  3,
  "the-throne-breaks",
  "The Throne Breaks",
  "1222–1293",
  "Tidak ada pusat kekuasaan yang abadi. Kehancuran sebuah kerajaan tidak selalu berarti hilangnya suatu tempat; kadang-kadang pusat gravitasi sejarah hanya telah berpindah.",
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
      masterLine: "Kediri tidak lenyap. Kekuasaan berpindah.",
      paragraphs: [
        "Pada 1222, keseimbangan Jawa Timur berubah.",
        "Kediri kehilangan kedudukan politik utamanya. Tumapel bangkit. Dari sana, Singhasari akan tumbuh.",
        "Pertempuran Ganter sering diingat sebagai sebuah kekalahan. Namun perubahan paling penting bukanlah siapa yang berdiri di medan perang pada hari terakhir.",
        "Perubahan sesungguhnya adalah bahwa pusat kekuasaan telah bergerak.",
        "Kediri masih ada. Sungainya masih mengalir. Masyarakatnya masih hidup. Tetapi sejarah politik Jawa kini mulai berbicara dari tempat lain.",
      ],
    }),
    scene({
      order: 10,
      slug: "1292-the-return",
      title: "JAYAKATWANG",
      dateDisplay: "1292",
      sceneType: "supporting",
      visualVariant: "word",
      imageReady: true,
      previewAltText:
        "Rekonstruksi artistik suasana krisis 1292: bara istana dan lintasan kampanye tanpa potret tokoh yang dapat diautentikasi.",
      masterLine: "RAJA KEDIRIAN TERAKHIR",
      paragraphs: [
        "Tujuh puluh tahun setelah kehilangan primasi politiknya, Kediri kembali.",
        "Jayakatwang menjatuhkan Singhasari dan mengembalikan pusat kekuasaan ke Daha.",
        "Untuk sesaat, masa lalu tampak seperti hendak hidup kembali. Namun sejarah jarang berjalan mundur.",
        "Kerajaan yang kembali pada 1292 bukan lagi kerajaan yang pernah mendominasi abad sebelumnya. Dunia di sekitarnya telah berubah.",
        "Pada 1293, Jayakatwang dikalahkan oleh pasukan Raden Wijaya.",
      ],
    }),
    scene({
      order: 11,
      slug: "1293-last-kingdom",
      title: "The Last Kingdom",
      dateDisplay: "1293",
      sceneType: "hero",
      visualVariant: "landscape",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik montase tiga kekuatan tahun 1293: armada Yuan, peta strategi Jawa Timur, dan dua figur penguasa yang saling berhadapan.",
      masterLine: "Kerajaannya berakhir. Kediri tidak.",
      paragraphs: [
        "Pada 1293, beberapa kekuatan bertemu dalam satu titik sejarah: Jayakatwang, pasukan Yuan, dan Raden Wijaya.",
        "Aliansi berubah menjadi pengkhianatan. Musuh menjadi sekutu sementara. Sekutu berubah menjadi lawan.",
        "Dari kekacauan itu lahir Majapahit. Dan kekuasaan Kediri sebagai kerajaan berdaulat berakhir.",
        "Tetapi sebuah kerajaan bukan satu-satunya cara sebuah tempat dapat bertahan. Nama Kediri tidak hilang. Daha tidak sepenuhnya lenyap dari ingatan. Cerita-ceritanya terus hidup. Orang-orang tetap tinggal.",
        "Yang berakhir adalah sebuah negara. Bukan sebuah identitas.",
      ],
    }),
  ],
);

const ACT_4 = act(
  4,
  "after-the-kings",
  "After the Kings",
  "Setelah 1293",
  "Ketika kerajaan pergi, manusia mulai mengisi ruang yang ditinggalkannya dengan cerita. Sejarah berubah menjadi ingatan; ingatan berubah menjadi legenda.",
  "memory",
  [
    scene({
      order: 12,
      slug: "jayabaya-after-jayabaya",
      title: "Jayabaya After Jayabaya",
      dateDisplay: "Jayabaya",
      sceneType: "supporting",
      visualVariant: "document",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik penggambaran kemudian tentang raja di atas takhta di tengah kerumunan; bukan potret historis Jayabhaya, melainkan citra yang diwariskan tradisi.",
      masterLine:
        "Sebagian raja berkuasa selama puluhan tahun. Jayabaya berkuasa dalam imajinasi selama berabad-abad.",
      paragraphs: [
        "Ada Jayabhaya yang hidup di abad ke-12, seorang raja Panjalu yang namanya hadir dalam sejarah.",
        "Lalu ada Jayabaya yang hidup jauh setelah kematiannya: Jayabaya sang peramal, dari Zaman Edan, Ratu Adil, dan berbagai penafsiran zaman.",
        "Dua figur itu tidak boleh kita campurkan. Namun hubungan keduanya menunjukkan sesuatu yang lebih menarik daripada sebuah ramalan.",
        "Mengapa manusia terus meminjam nama seorang raja yang telah mati berabad-abad untuk berbicara tentang masa depan?",
        "Mungkin karena sebagian tokoh tidak bertahan melalui kekuasaan. Mereka bertahan karena generasi berikutnya terus membutuhkan mereka.",
      ],
    }),
    scene({
      order: 13,
      slug: "shadow-archive",
      title: "The Shadow Archive",
      dateDisplay: "Tradition",
      sceneType: "optional",
      visualVariant: "landscape",
      epistemicStatus: "Tradition · Folklore · Urban Legend",
      imageReady: true,
      previewAltText:
        "Visualisasi folklor: gunung Kelud bergolak, sosok banteng bertanduk, dan figur-figur legenda Kediri berlapis dalam kegelapan naskah.",
      masterLine:
        "Folklor bukan sejarah yang gagal. Ia adalah jejak dari cara manusia memberi makna pada dunia.",
      paragraphs: [
        "Tidak semua yang diwariskan manusia adalah fakta. Namun bukan berarti semuanya tidak berarti.",
        "Calon Arang. Lembu Suro. Kelud. Kutukan Kediri.",
        "Cerita-cerita ini berada di wilayah tempat sejarah, sastra, ketakutan, ritual, politik, dan imajinasi saling menyentuh.",
        "Kita tidak memperlakukannya sebagai bukti bahwa peristiwa supernatural benar-benar terjadi. Kita memperlakukannya sebagai bukti bahwa manusia mempercayai, mengingat, mengulang, dan membutuhkan cerita-cerita tersebut.",
        "Sejarah memberi tahu kita apa yang mungkin terjadi. Folklor memberi tahu kita bagaimana manusia mencoba memahami apa yang terjadi pada mereka.",
      ],
    }),
  ],
);

const ACT_5 = act(
  5,
  "empires-cross-brantas",
  "Empires Cross the Brantas",
  "1678",
  "Kerajaan telah berganti, tetapi Brantas masih berada di tempat yang sama. Sekali lagi sungai itu menentukan bagaimana manusia bergerak, bertahan, dan berperang.",
  "seventeenthCentury",
  [
    scene({
      order: 14,
      slug: "1678-river-fortress",
      title: "The River as Fortress",
      dateDisplay: "1678",
      sceneType: "hero",
      visualVariant: "landscape",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik masa konflik Trunajaya: perahu-perahu pasukan menyeberangi Brantas di antara palisade dan menara kayu.",
      masterLine: "Sungainya sama. Perangnya berbeda.",
      paragraphs: [
        "Pada masa konflik Trunajaya, Kediri kembali menjadi ruang perebutan kekuasaan.",
        "Brantas kini bukan lagi sekadar batas politik yang dikenang melalui Airlangga. Ia menjadi rintangan militer.",
        "Sungai yang dahulu memisahkan dua warisan kerajaan kini memisahkan pasukan. Airnya sama. Fungsinya berubah.",
        "Di situlah kita melihat salah satu hukum sejarah Kediri: tempat yang sama dapat memperoleh makna yang sama sekali berbeda dari satu abad ke abad berikutnya.",
      ],
    }),
  ],
);

const ACT_6 = act(
  6,
  "iron-sugar-modern-city",
  "Iron, Sugar & the Modern City",
  "Abad ke-19–1942",
  "Kediri memasuki dunia modal, mesin, perkebunan, rel, jembatan, birokrasi, dan kota modern—bukan lagi dunia raja dan prasasti.",
  "colonialIndustrial",
  [
    scene({
      order: 15,
      slug: "sugar-changes-land",
      title: "Sugar Changes the Land",
      dateDisplay: "Sugar",
      sceneType: "supporting",
      visualVariant: "landscape",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik kompleks pabrik gula Meritjan: cerobong, roda mesin, lori tebu, dan rel yang menjalin tanah menjadi satu sistem.",
      masterLine: "Tanah berubah menjadi sistem.",
      paragraphs: [
        "Tebu tidak hanya mengubah apa yang ditanam. Ia mengubah cara tanah diorganisasi.",
        "Lahan terhubung dengan pabrik. Pabrik dengan jalan. Jalan dengan rel. Rel dengan gudang. Gudang dengan pelabuhan dan pasar yang bahkan berada jauh dari Kediri.",
        "Sebuah tanaman berubah menjadi sistem ekonomi. Dan sistem itu mengubah kehidupan manusia di sekitarnya.",
        "Sebelum Kediri dikenal sebagai kota industri modern, tanahnya telah lebih dahulu masuk ke dalam mesin ekonomi yang jauh lebih besar.",
      ],
    }),
    scene({
      order: 16,
      slug: "1869-brantas-bridge",
      title: "Iron Across the Brantas",
      dateDisplay: "18 Maret 1869",
      sceneType: "hero",
      visualVariant: "structure",
      choreographyKey: "bridgeConstruction",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik jembatan rangka besi melintasi Brantas beserta diagram struktur penopangnya; besi mengubah pemisah menjadi penghubung.",
      masterLine:
        "Besi melintasi Brantas. Sungai yang memisahkan, kini mulai menghubungkan.",
      paragraphs: [
        "Selama berabad-abad, Brantas adalah sesuatu yang harus diseberangi. Pada 1869, manusia memutuskan untuk meletakkan besi di atasnya.",
        "Jembatan Lama bukan hanya sebuah struktur. Ia mengubah hubungan manusia dengan sungai.",
        "Jarak menjadi lebih pendek. Perdagangan bergerak lebih cepat. Kendaraan, barang, dan manusia dapat melintas dengan cara yang sebelumnya tidak mungkin.",
        "Empat belas tahun kemudian, Brooklyn Bridge akan dibuka di New York.",
        "Perbandingan itu bukan tentang siapa yang lebih hebat. Ia mengingatkan kita bahwa Kediri telah menjadi bagian dari zaman teknik modern jauh lebih awal daripada yang sering dibayangkan.",
      ],
    }),
    scene({
      order: 17,
      slug: "1906-city-on-paper",
      title: "A City on Paper",
      dateDisplay: "1906",
      sceneType: "supporting",
      visualVariant: "document",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik kota kolonial 1906: stasiun kereta, gereja, jalan beraspal, dan kehidupan yang tertata di atas kertas administrasi.",
      masterLine: "Pemerintahan modern datang. Kesetaraan modern belum.",
      paragraphs: [
        "Pada 1906, Kediri memperoleh bentuk pemerintahan kotapraja kolonial.",
        "Peta berubah. Administrasi bertambah. Jalan, kantor, pajak, dan aturan mulai membentuk wajah kota modern.",
        "Namun kita harus berhati-hati dengan satu kata: modern.",
        "Kota yang lebih teratur bukan berarti masyarakat yang lebih setara. Modernitas kolonial dibangun di dalam sistem yang membedakan manusia berdasarkan ras, hukum, dan kedudukan.",
        "Kemajuan administratif dan ketidakadilan dapat tumbuh pada waktu yang sama.",
      ],
    }),
    scene({
      order: 18,
      slug: "1912-bridge-lift",
      title: "Kediri Lifts a Bridge",
      dateDisplay: "1912",
      sceneType: "hero",
      visualVariant: "structure",
      choreographyKey: "bridgeLift",
      epistemicStatus: "Detail teknis masih memerlukan verifikasi arsip",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik Jembatan Lama setelah ditinggikan; panel-panel detail teknik bersifat ilustratif dan belum terverifikasi arsip.",
      masterLine:
        "Sungai berubah. Manusia harus menyesuaikan apa yang telah dibangunnya.",
      paragraphs: [
        "Manusia membangun jembatan seolah-olah alam akan tetap diam. Alam tidak pernah berjanji demikian.",
        "Brantas berubah. Sedimentasi berubah. Kebutuhan transportasi berubah. Dan akhirnya, infrastruktur harus ikut berubah.",
        "Arsip menunjukkan bahwa Jembatan Lama pernah ditinggikan. Detail tekniknya masih menunggu verifikasi final.",
        "Teknologi bukan kemenangan manusia atas alam. Teknologi adalah percakapan yang tidak pernah selesai antara manusia dan lingkungan tempat ia hidup.",
      ],
    }),
    scene({
      order: 19,
      slug: "people-between-monuments",
      title: "The People Between the Monuments",
      dateDisplay: "People",
      sceneType: "interlude",
      visualVariant: "document",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik mozaik kehidupan sehari-hari Kediri: keluarga di beranda, pasar pagi, ruang kelas, ibadah, dan perahu di sungai.",
      masterLine: "Monumen membentuk wajah kota. Manusia memberinya jiwa.",
      paragraphs: [
        "Sejarah sering mengingat yang besar: raja, perang, jembatan, pabrik, dan gedung.",
        "Tetapi kota tidak hidup karena monumennya.",
        "Kota hidup karena seseorang membuka pasar setiap pagi; karena pekerja berangkat sebelum matahari tinggi; karena anak-anak masuk sekolah; karena keluarga berpindah rumah; karena pedagang membangun usaha; karena komunitas berdoa, merayakan, kehilangan, dan memulai kembali.",
        "Jika monumen memberi kota bentuk, manusia memberinya kehidupan.",
      ],
    }),
  ],
);

const ACT_7 = act(
  7,
  "occupation-revolution-republic",
  "Occupation, Revolution, Republic",
  "1942–1950",
  "Kediri memasuki salah satu masa paling gelap dalam sejarah modernnya. Kekuasaan berubah cepat, dan kota harus bertahan di antara kekuatan yang jauh lebih besar daripada dirinya sendiri.",
  "occupationRevolution",
  [
    scene({
      order: 20,
      slug: "1942-world-war-arrives",
      title: "The World War Arrives",
      dateDisplay: "1942",
      sceneType: "supporting",
      visualVariant: "document",
      epistemicStatus: "Memerlukan penguatan arsip Kediri-spesifik",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik masa pendudukan 1942: kendaraan lapis baja dan tentara di depan stasiun Kediri, pesawat di langit, poster propaganda di dinding.",
      masterLine: "Perang dunia tidak lagi jauh. Ia telah tiba di Kediri.",
      paragraphs: [
        "Perang dunia terdengar seperti sesuatu yang terjadi jauh dari Kediri. Sampai 1942.",
        "Pendudukan Jepang mengubah pemerintahan, produksi, transportasi, dan kehidupan sehari-hari.",
        "Hal-hal yang sebelumnya terasa tetap menjadi tidak pasti.",
        "Sebuah perang global akhirnya tiba di jalan, pabrik, dan kehidupan manusia di kota ini. Sejarah Kediri sekali lagi menjadi bagian dari sejarah dunia.",
      ],
    }),
    scene({
      order: 21,
      slug: "1947-1948-sugar-weapons",
      title: "From Sugar to Weapons",
      dateDisplay: "1947–1948",
      sceneType: "hero",
      visualVariant: "structure",
      choreographyKey: "revolutionMachine",
      epistemicStatus: "Klaim produksi mortir belum terverifikasi final",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik bersyarat interior pabrik gula Meritjan masa revolusi; mesin yang sama, tujuan yang berubah — klaim persenjataan belum terverifikasi.",
      masterLine: "Mesinnya tetap. Tujuannya berubah.",
      paragraphs: [
        "Revolusi mengubah fungsi benda. Jalan menjadi jalur militer. Jembatan menjadi titik strategis. Pabrik yang dibangun untuk ekonomi dapat menjadi bagian dari perjuangan mempertahankan sebuah negara yang baru lahir.",
        "Riset saat ini menyimpan kemungkinan bahwa fasilitas Meritjan turut digunakan untuk kebutuhan perjuangan.",
        "Tetapi sejarah tidak boleh diselesaikan hanya karena sebuah cerita terasa dramatis.",
        "Selama mekanisme produksi, jenis senjata, dan ukurannya belum dapat dibuktikan dengan cukup kuat, adegan ini tetap bersyarat.",
        "Jika kelak bukti itu ditemukan, maknanya akan sangat kuat: mesin yang dibangun untuk menghasilkan komoditas pernah diarahkan untuk mempertahankan kemerdekaan.",
      ],
    }),
    scene({
      order: 22,
      slug: "1950-city-republic",
      title: "City of the Republic",
      dateDisplay: "1950",
      sceneType: "supporting",
      visualVariant: "document",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik dokumen pemerintahan daerah tahun 1950 dengan lambang Garuda dan kantor pemerintah kota di latar belakang.",
      masterLine: "Sebuah nama kuno. Kotapraja kolonial. Kota Republik.",
      paragraphs: [
        "Berapa umur Kediri? Pertanyaan itu tidak memiliki satu jawaban sederhana.",
        "879 memberi kita jangkar sejarah yang diperingati. 1906 memberi Kediri bentuk kotapraja kolonial. 1950 menempatkan pemerintahan kota ke dalam kerangka Republik Indonesia.",
        "Ketiga tanggal itu tidak saling membatalkan. Mereka menunjukkan bahwa sebuah kota dapat memiliki banyak lapisan kelahiran.",
        "Kediri tidak lahir sekali. Ia dibentuk kembali berkali-kali.",
      ],
    }),
  ],
);

const ACT_8 = act(
  8,
  "industrial-city",
  "The Industrial City",
  "1958–2000",
  "Setelah perang, industri mulai mengambil peran yang sangat besar dalam menentukan bagaimana kota bekerja dan bagaimana kehidupan dibentuk di dalamnya.",
  "industrialCity",
  [
    scene({
      order: 23,
      slug: "1958-from-1000-square-metres",
      title: "From 1,000 m²",
      dateDisplay: "1958",
      sceneType: "hero",
      visualVariant: "structure",
      choreographyKey: "industrialExpansion",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik ruang kerja tahun 1958 seluas seribu meter persegi: para pekerja melinting di meja kayu di bawah lampu gantung.",
      masterLine:
        "Industri tidak sekadar tumbuh di Kediri. Ia ikut membentuk ulang kota.",
      paragraphs: [
        "Perubahan besar jarang terlihat besar pada hari pertama. Pada 1958, sebuah usaha dimulai dari ruang yang terbatas.",
        "Tidak ada yang dapat melihat seluruh kota masa depan dari seribu meter persegi itu.",
        "Namun bisnis berkembang. Pabrik membesar. Pekerjaan bertambah. Jalan dan lingkungan berubah. Ekonomi kota mulai memiliki pusat gravitasi baru.",
        "Cerita ini bukan semata-mata tentang sebuah perusahaan menjadi besar. Ia adalah cerita tentang apa yang terjadi ketika pertumbuhan sebuah perusahaan menjadi cukup besar untuk ikut mengubah kehidupan sebuah kota.",
      ],
    }),
    scene({
      order: 24,
      slug: "1990-kediri-to-market",
      title: "From Kediri to the Market",
      dateDisplay: "1990+",
      sceneType: "supporting",
      visualVariant: "document",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik jalan industri-perdagangan Kediri era 1990-an: truk, papan usaha, dan lalu lintas kota yang tumbuh bersama satu sektor besar.",
      masterLine:
        "Industri memberi Kediri kekuatan. Ketergantungan mengingatkan Kediri untuk tetap berubah.",
      paragraphs: [
        "Apa yang bermula sebagai usaha lokal akhirnya masuk ke pasar modal nasional. Kediri kini terhubung bukan hanya melalui jalan dan jembatan, tetapi melalui modal.",
        "Pertumbuhan membawa pekerjaan. Produksi membawa kemakmuran. Skala membawa pengaruh.",
        "Namun kekuatan ekonomi yang sangat terkonsentrasi juga membawa pertanyaan: apa yang terjadi ketika nasib sebuah kota terlalu dekat dengan nasib satu sektor?",
        "Kemakmuran dan kerentanan tidak selalu berlawanan. Kadang-kadang keduanya tumbuh dari akar yang sama.",
      ],
    }),
  ],
);

const ACT_9 = act(
  9,
  "city-connects",
  "The City Connects",
  "2000–2026",
  "Setiap zaman menemukan cara baru untuk mengatasi jarak: dahulu sungai, kemudian jembatan, rel, jalan raya, dan akhirnya udara.",
  "connectedModern",
  [
    scene({
      order: 25,
      slug: "two-bridges-two-centuries",
      title: "Two Bridges, Two Centuries",
      dateDisplay: "Two Bridges",
      sceneType: "hero",
      visualVariant: "structure",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik dua zaman dalam satu bingkai: jembatan rangka besi bernuansa sepia berpadu dengan jembatan beton modern saat senja.",
      masterLine:
        "Infrastruktur yang dahulu menjadi masa depan, kini menjadi ingatan.",
      paragraphs: [
        "Di atas Brantas, dua zaman kini berdiri berdampingan.",
        "Jembatan Lama pernah menjadi lambang teknologi masa depan. Kini ia adalah warisan. Jembatan yang lebih baru mengambil fungsi yang dahulu dimilikinya.",
        "Tidak ada ironi di sana. Itulah perjalanan semua infrastruktur.",
        "Apa yang hari ini dianggap baru, suatu hari akan menjadi sejarah. Dalam satu pandangan ke sungai, Kediri dapat melihat masa lalu dan masa kini berdiri dalam frame yang sama.",
      ],
    }),
    scene({
      order: 26,
      slug: "2024-2026-river-to-runway",
      title: "From River to Runway",
      dateDisplay: "2024–2026",
      sceneType: "hero",
      visualVariant: "landscape",
      choreographyKey: "runwayTransition",
      imageReady: true,
      previewAltText:
        "Visualisasi artistik Bandara Dhoho Kediri saat senja: pesawat lepas landas di atas terminal, sungai dan jalan raya mengalir di sisi barat.",
      masterLine:
        "Kediri tumbuh di tepi sungai. Kini wilayahnya terhubung melalui langit.",
      paragraphs: [
        "Kediri tumbuh di tepi sungai. Selama berabad-abad, Brantas menentukan bagaimana manusia bergerak melintasi wilayah ini.",
        "Lalu manusia membangun jalan, jembatan, rel, dan kini landasan pacu.",
        "Dhoho bukan sekadar sebuah bandara. Dalam perjalanan panjang Kediri, ia adalah kelanjutan dari satu kebutuhan manusia yang sangat tua: untuk terhubung.",
        "Teknologinya berubah. Dorongannya tetap sama.",
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
