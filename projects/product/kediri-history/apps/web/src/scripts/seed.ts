import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Irisan vertikal kanonik (Master Implementation Plan Phase 7).
 *
 * Tiga irisan yang menguji tiga domain berbeda: 879 (epigrafi kuno), 1135
 * (kekuasaan kerajaan), dan 1869 (rekayasa kolonial).
 *
 * ATURAN YANG MENGIKAT SKRIP INI
 *
 * 1. Tidak ada informasi historis yang dikarang. Setiap catatan berasal dari
 *    kanon perencanaan yang sudah disetujui, dan setiap nomor inventaris yang
 *    dipakai adalah nomor yang memang disebut Visual Evidence Bible bagian 5.
 *
 * 2. Locator ditulis jujur. Ia menunjuk "catatan katalog D.9", bukan nomor
 *    baris prasasti yang belum pernah kami periksa. Ketepatan tanpa alamat
 *    bukan ketepatan.
 *
 * 3. Klaim yang belum punya sumber nyata TIDAK diterbitkan. Irisan 1869 sengaja
 *    berhenti pada status needs_review sampai materi arsip yang sebenarnya
 *    diperoleh (Visual Evidence Bible bagian 17, prioritas P0). Halaman
 *    arsipnya akan mengatakan apa adanya bahwa belum ada klaim terbit — itu
 *    bukan kekurangan skrip ini, itu gerbangnya bekerja.
 *
 * 4. Tidak ada media yang dibuat. Bila arsip belum memberi gambar, ketiadaan
 *    yang jujur dapat diterima.
 *
 * 5. Korpus riset TIDAK diimpor di sini. Skrip ini hanya menanam apa yang sudah
 *    ditinjau; impor korpus adalah pipeline terpisah yang berakhir di
 *    needs_review, bukan di published.
 *
 * Jalankan dari akar capsule:
 *   pnpm --filter @kediri/web exec payload run src/scripts/seed.ts
 */

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@kediri.local";
const REVIEWER_EMAIL =
  process.env.SEED_REVIEWER_EMAIL ?? "reviewer@kediri.local";
const SEED_PASSWORD = process.env.SEED_PASSWORD;

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Seeding is a development and staging operation. It never runs against production.",
    );
  }
  if (!SEED_PASSWORD || SEED_PASSWORD.length < 12) {
    throw new Error(
      "Set SEED_PASSWORD (at least 12 characters) in the untracked environment file before seeding.",
    );
  }

  const payload = await getPayload({ config });
  const log = (message: string) => payload.logger.info(message);

  /* ---------------- pengguna ---------------- */

  const existingUsers = await payload.count({ collection: "users" });
  if (existingUsers.totalDocs === 0) {
    await payload.create({
      collection: "users",
      data: {
        email: ADMIN_EMAIL,
        password: SEED_PASSWORD,
        displayName: "Seed Administrator",
        role: "admin",
      },
    });
    log("Created seed administrator");
  }

  const reviewerSearch = await payload.find({
    collection: "users",
    where: { email: { equals: REVIEWER_EMAIL } },
    limit: 1,
  });
  const reviewer =
    reviewerSearch.docs[0] ??
    (await payload.create({
      collection: "users",
      data: {
        email: REVIEWER_EMAIL,
        password: SEED_PASSWORD,
        displayName: "Seed Historical Reviewer",
        role: "historical_reviewer",
      },
    }));

  // Hook publikasi menuntut penerbit. Skrip seed berjalan dengan hak penuh
  // secara sengaja; alur editorial yang sebenarnya tetap melewati peran.
  const publisher = { role: "publisher" } as never;
  const reviewedAt = "2026-08-26T00:00:00.000Z";

  /* ---------------- tema ---------------- */

  const themeSeeds = [
    {
      title: "Brantas",
      order: 1,
      summary:
        "Sungai yang menyaksikan semuanya: batas, halangan militer, masalah rekayasa, sumbu kota.",
    },
    {
      title: "Raja dan Kekuasaan",
      order: 2,
      summary: "Bagaimana kekuasaan terbentuk, terbelah, dan berpindah.",
    },
    {
      title: "Kata dan Cerita",
      order: 3,
      summary: "Sastra, prasasti, dan cerita yang meninggalkan Kediri.",
    },
    {
      title: "Jembatan dan Perpindahan",
      order: 4,
      summary: "Menyeberangi sungai, dan apa yang berubah setelahnya.",
    },
    {
      title: "Kerja dan Industri",
      order: 5,
      summary: "Perkebunan, pabrik, dan kota yang dibentuknya.",
    },
    {
      title: "Perang dan Ketahanan",
      order: 6,
      summary: "Pendudukan, revolusi, dan yang bertahan.",
    },
  ];

  const themes: Record<string, number> = {};
  for (const seed of themeSeeds) {
    const slug = seed.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const existing = await payload.find({
      collection: "themes",
      where: { slug: { equals: slug } },
      limit: 1,
    });
    const doc =
      existing.docs[0] ??
      (await payload.create({
        collection: "themes",
        data: { ...seed, slug, _status: "published" },
        overrideAccess: true,
        user: publisher,
      }));
    themes[slug] = doc.id;
  }
  log(`Themes ready: ${Object.keys(themes).length}`);

  /* ---------------- sumber ---------------- */

  const kwakSource = await upsert(
    payload,
    "sources",
    "Prasasti Kwak I",
    {
      title: "Prasasti Kwak I — catatan katalog Museum Nasional Indonesia",
      sourceType: "museum_catalogue",
      institution: "Museum Nasional Indonesia",
      inventoryNumber: "E.6",
      reliabilityTier: "institutional",
      language: "id",
      citation:
        "Museum Nasional Indonesia, catatan katalog prasasti, nomor inventaris E.6.",
      notes:
        "Nomor inventaris diidentifikasi dalam tinjauan perencanaan (Visual Evidence Bible bagian 5). Citra resolusi tinggi, metadata katalog lengkap, dan izin reproduksi masih dalam proses akuisisi P0.",
      linkStatus: "active",
      _status: "published",
    },
    publisher,
  );

  const hantangSource = await upsert(
    payload,
    "sources",
    "Prasasti Hantang",
    {
      title:
        "Prasasti Hantang (Ngantang) — catatan katalog Museum Nasional Indonesia",
      sourceType: "museum_catalogue",
      institution: "Museum Nasional Indonesia",
      inventoryNumber: "D.9",
      reliabilityTier: "institutional",
      language: "id",
      citation:
        "Museum Nasional Indonesia, catatan katalog prasasti, nomor inventaris D.9.",
      notes:
        "Nomor inventaris diidentifikasi dalam tinjauan perencanaan (Visual Evidence Bible bagian 5). Akuisisi citra dan metadata lengkap masih berjalan.",
      linkStatus: "active",
      _status: "published",
    },
    publisher,
  );

  /* ---------------- orang, tempat, objek ---------------- */

  const jayabhaya = await upsert(
    payload,
    "people",
    "Jayabhaya",
    {
      canonicalName: "Jayabhaya",
      slug: "jayabhaya",
      aliases: ["Jayabaya", "Joyoboyo", "Jayabhaya Sri Maharaja"],
      representationPolicy: "no_known_likeness",
      summary:
        "Raja Panjalu yang namanya melekat pada prasasti 1135. Tidak ada rupa yang terdokumentasi; situs ini tidak menampilkan wajah untuknya.",
      _status: "published",
    },
    publisher,
  );

  const brantas = await upsert(
    payload,
    "places",
    "Sungai Brantas",
    {
      canonicalName: "Sungai Brantas",
      slug: "sungai-brantas",
      aliases: ["Brantas"],
      placeType: "river",
      historicalLocation: {
        certainty: "precise",
        description:
          "Sungai yang sama sepanjang seluruh rentang cerita ini: batas politik, halangan militer, masalah rekayasa, lalu sumbu kota.",
      },
      summary:
        "Tulang punggung naratif sejarah Kediri, dari 1042 hingga hari ini.",
      _status: "published",
    },
    publisher,
  );

  const panjalu = await upsert(
    payload,
    "places",
    "Panjalu",
    {
      canonicalName: "Panjalu",
      slug: "panjalu",
      aliases: ["Pañjalu"],
      placeType: "kingdom",
      historicalLocation: {
        certainty: "approximate_zone",
        description:
          "Kesarjanaan menopang zona pengaruh yang luas, bukan garis batas yang pasti. Situs ini tidak menggambar batas yang tidak didukung bukti.",
      },
      summary: "Wilayah kerajaan yang menjadi pusat kekuasaan Kediri.",
      _status: "published",
    },
    publisher,
  );

  const jembatanLama = await upsert(
    payload,
    "places",
    "Jembatan Lama Kediri",
    {
      canonicalName: "Jembatan Lama Kediri",
      slug: "jembatan-lama-kediri",
      aliases: ["Jembatan Lama", "Jembatan Brantas"],
      placeType: "bridge",
      historicalLocation: {
        certainty: "precise",
        description:
          "Jembatan besi yang melintasi Brantas di Kediri, masih berdiri di samping penerusnya yang modern.",
      },
      summary:
        "Rekayasa abad kesembilan belas yang mengubah halangan sungai menjadi infrastruktur.",
      _status: "published",
    },
    publisher,
  );

  const kwakArtifact = await upsert(
    payload,
    "artifacts",
    "Prasasti Kwak I",
    {
      canonicalName: "Prasasti Kwak I",
      slug: "prasasti-kwak-i",
      artifactType: "inscription",
      holdingInstitution: "Museum Nasional Indonesia",
      inventoryNumber: "E.6",
      chronology: {
        startYear: 879,
        startMonth: 7,
        startDay: 27,
        precision: "exact_day",
        display: "27 Juli 879",
      },
      provenance:
        "Objek ini berperan epigrafis dan sipil-historis bagi Kediri. Ia tidak boleh ditampilkan seolah digali di Kediri bila findspot terdokumentasinya berada di tempat lain.",
      summary:
        "Prasasti yang memuat tetapan kerajaan bertarikh 801 Saka, setara 27 Juli 879.",
      _status: "published",
    },
    publisher,
  );

  const hantangArtifact = await upsert(
    payload,
    "artifacts",
    "Prasasti Hantang",
    {
      canonicalName: "Prasasti Hantang",
      slug: "prasasti-hantang",
      aliases: ["Prasasti Ngantang"],
      artifactType: "inscription",
      holdingInstitution: "Museum Nasional Indonesia",
      inventoryNumber: "D.9",
      chronology: {
        startYear: 1135,
        precision: "year",
        display: "1135",
      },
      summary:
        "Prasasti yang memuat frasa Pañjalu Jayati, penanda paling terkenal dari masa Panjalu.",
      _status: "published",
    },
    publisher,
  );

  /* ---------------- klaim dan tautan bukti ---------------- */

  const kwakClaim = await upsertClaim(payload, publisher, {
    canonicalStatement:
      "Prasasti Kwak I memuat tetapan kerajaan bertarikh 801 Saka, yang setara dengan 27 Juli 879.",
    slug: "kwak-i-tetapan-801-saka",
    publicSummary:
      "Pada 27 Juli 879, sebuah keputusan kerajaan dituliskan ke logam.",
    evidenceClass: "primary_record",
    confidence: "high",
    artifacts: [kwakArtifact],
    reviewedBy: reviewer.id,
    reviewedAt,
    editorialNotes:
      "Tarikh ini adalah jangkar peringatan sipil Kediri. Ia BUKAN pernyataan bahwa kota modern berdiri pada abad kesembilan.",
  });
  await upsertLink(payload, publisher, {
    claim: kwakClaim,
    source: kwakSource,
    role: "supports",
    strength: "direct",
    locator: "catatan katalog E.6",
    note: "Identitas objek dan tarikhnya mengacu pada catatan katalog institusi penyimpan.",
  });

  const anniversaryClaim = await upsertClaim(payload, publisher, {
    canonicalStatement:
      "Dari 879 hingga 2026 terbentang 1.147 tahun sejak tanggal yang diperingati sebagai Hari Jadi Kediri.",
    slug: "879-ke-2026-1147-tahun",
    publicSummary:
      "Pada 2026, sudah 1.147 tahun sejak tanggal yang diperingati sebagai Hari Jadi Kediri.",
    evidenceClass: "historical_fact",
    confidence: "high",
    reviewedBy: reviewer.id,
    reviewedAt,
    editorialNotes:
      "Aritmetika dari tarikh yang diperingati. Ini BUKAN klaim bahwa sebuah kota modern berdiri tanpa putus selama 1.147 tahun. Materi riset yang menyebut 1.142 tahun keliru dan tidak boleh diulang sebagai fakta produksi.",
  });
  await upsertLink(payload, publisher, {
    claim: anniversaryClaim,
    source: kwakSource,
    role: "contextualizes",
    strength: "strong",
    locator: "catatan katalog E.6 (tarikh dasar)",
    note: "Sumber menetapkan tarikh dasarnya; selisih tahunnya adalah aritmetika langsung.",
  });

  const jayatiClaim = await upsertClaim(payload, publisher, {
    canonicalStatement: "Prasasti Hantang memuat frasa Pañjalu Jayati.",
    slug: "hantang-memuat-panjalu-jayati",
    publicSummary: "Prasasti itu membawa frasa Pañjalu Jayati.",
    evidenceClass: "primary_record",
    confidence: "high",
    artifacts: [hantangArtifact],
    people: [jayabhaya],
    reviewedBy: reviewer.id,
    reviewedAt,
  });
  await upsertLink(payload, publisher, {
    claim: jayatiClaim,
    source: hantangSource,
    role: "supports",
    strength: "direct",
    locator: "catatan katalog D.9",
  });

  const jayatiReadingClaim = await upsertClaim(payload, publisher, {
    canonicalStatement:
      "Frasa Pañjalu Jayati ditafsirkan sebagai penegasan kemenangan Panjalu atas Janggala.",
    slug: "panjalu-jayati-sebagai-penegasan-kemenangan",
    publicSummary:
      "Para ahli membaca frasa itu sebagai penegasan kemenangan Panjalu.",
    // Dua klaim terpisah karena hubungan buktinya berbeda: yang satu tentang
    // apa yang tertulis, yang lain tentang apa artinya.
    evidenceClass: "scholarly_interpretation",
    confidence: "moderate",
    artifacts: [hantangArtifact],
    people: [jayabhaya],
    reviewedBy: reviewer.id,
    reviewedAt,
  });
  await upsertLink(payload, publisher, {
    claim: jayatiReadingClaim,
    source: hantangSource,
    role: "supports",
    strength: "moderate",
    locator: "catatan katalog D.9",
    note: "Pembacaan interpretatif, bukan isi harfiah prasasti.",
  });

  // Tautan sudah terpasang: naikkan keempat klaim yang siap ke status terbit.
  for (const id of [
    kwakClaim,
    anniversaryClaim,
    jayatiClaim,
    jayatiReadingClaim,
  ]) {
    await publishClaim(payload, publisher, id);
  }

  /* Irisan 1869: sengaja berhenti sebelum terbit. */
  const bridgeClaim = await upsertClaim(payload, publisher, {
    canonicalStatement:
      "Jembatan besi yang melintasi Brantas di Kediri dibuka pada 1869.",
    slug: "jembatan-besi-brantas-dibuka-1869",
    publicSummary:
      "Jembatan besi melintasi Brantas dibuka pada 1869, empat belas tahun sebelum Brooklyn Bridge.",
    evidenceClass: "historical_fact",
    confidence: "moderate",
    places: [jembatanLama],
    status: "draft",
    editorialNotes:
      "MENUNGGU BUKTI. Tarikh pembukaan dan kronologi rekayasanya menunggu konfirmasi arsip langsung; target akuisisi P0 mencakup koleksi Wereldmuseum, Tropenmuseum, dan Nationaal Archief (Visual Evidence Bible bagian 5 dan 17). Perbandingan dengan Brooklyn Bridge adalah kronologi, bukan kesetaraan rancangan.",
  });

  /* ---------------- peristiwa ---------------- */

  const event879 = await upsertEvent(payload, publisher, {
    canonicalName: "Tetapan kerajaan 27 Juli 879",
    slug: "879-first-mark",
    chronology: {
      startYear: 879,
      startMonth: 7,
      startDay: 27,
      precision: "exact_day",
      display: "27 Juli 879",
    },
    summary:
      "Sebuah keputusan kerajaan dituliskan ke logam. Lebih dari sebelas abad kemudian, Kediri mengingat tanggal itu sebagai awal kronologi sipilnya.",
    artifacts: [kwakArtifact],
    claims: [kwakClaim, anniversaryClaim],
    themes: [
      themeId(themes, "kata-dan-cerita"),
      themeId(themes, "raja-dan-kekuasaan"),
    ],
    reviewStatus: "approved",
  });

  const event1135 = await upsertEvent(payload, publisher, {
    canonicalName: "Panjalu Jayati, 1135",
    slug: "1135-panjalu-jayati",
    chronology: { startYear: 1135, precision: "year", display: "1135" },
    summary:
      "Hampir satu abad setelah pembelahan, Panjalu tidak lagi sekadar separuh warisan politik Airlangga. Ia mengumumkan dirinya dengan dua kata.",
    people: [jayabhaya],
    places: [panjalu],
    artifacts: [hantangArtifact],
    claims: [jayatiClaim, jayatiReadingClaim],
    themes: [
      themeId(themes, "raja-dan-kekuasaan"),
      themeId(themes, "kata-dan-cerita"),
    ],
    reviewStatus: "approved",
  });

  const event1869 = await upsertEvent(payload, publisher, {
    canonicalName: "Besi melintasi Brantas, 1869",
    slug: "1869-brantas-bridge",
    chronology: { startYear: 1869, precision: "year", display: "1869" },
    summary:
      "Sungai yang selama berabad-abad menjadi batas dan halangan diseberangi oleh besi. Halangan berubah menjadi infrastruktur.",
    places: [jembatanLama, brantas],
    claims: [bridgeClaim],
    themes: [
      themeId(themes, "jembatan-dan-perpindahan"),
      themeId(themes, "brantas"),
    ],
    reviewStatus: "needs_review",
  });

  /* ---------------- babak dan scene ---------------- */

  const actI = await upsertAct(payload, publisher, {
    order: 1,
    title: "Tanah Mengingat",
    slug: "tanah-mengingat",
    dateRangeDisplay: "879 - 1042",
    introCopy: "Sebelum ada kerajaan bernama Kediri, sudah ada sebuah catatan.",
    visualEraKey: "ancient",
  });

  const actII = await upsertAct(payload, publisher, {
    order: 2,
    title: "Panjalu Bangkit",
    slug: "panjalu-bangkit",
    dateRangeDisplay: "1042 - 1222",
    introCopy: "Kerajaan yang pernah terbelah menemukan suaranya.",
    visualEraKey: "panjalu",
  });

  const actVI = await upsertAct(payload, publisher, {
    order: 6,
    title: "Besi, Gula, dan Kota Modern",
    slug: "besi-gula-kota-modern",
    dateRangeDisplay: "1849 - 1942",
    introCopy: "Tanah menjadi sistem, dan sungai menjadi soal rekayasa.",
    visualEraKey: "colonialIndustrial",
  });

  await upsertScene(payload, publisher, {
    order: 1,
    act: actI,
    title: "Tanda Pertama",
    slug: "879-first-mark",
    dateDisplay: "879",
    subtitle: "27 Juli 879",
    primaryEvent: event879,
    narrativeShort:
      "Gambar historis pertama bukan istana, bukan pasukan, bukan raja rekaan. Ia sebuah catatan.",
    featuredClaims: [kwakClaim, anniversaryClaim],
    featuredArtifacts: [kwakArtifact],
    themes: [themeId(themes, "kata-dan-cerita")],
    masterLine:
      "Sebelum ada kerajaan bernama Kediri, sudah ada sebuah catatan.",
    choreographyKey: "inscriptionReveal",
    visualVariant: "material",
    sceneType: "hero",
    evidenceBadgeMode: "auto",
  });

  await upsertScene(payload, publisher, {
    order: 2,
    act: actII,
    title: "Panjalu Jayati",
    slug: "1135-panjalu-jayati",
    dateDisplay: "1135",
    primaryEvent: event1135,
    narrativeShort:
      "Kerajaan yang pernah dibelah menemukan suaranya, dan menuliskannya dalam dua kata.",
    featuredClaims: [jayatiClaim, jayatiReadingClaim],
    featuredArtifacts: [hantangArtifact],
    featuredPeople: [jayabhaya],
    themes: [themeId(themes, "raja-dan-kekuasaan")],
    masterLine:
      "Kerajaan yang pernah dibelah menemukan satu suara, dan menuliskannya dalam dua kata.",
    choreographyKey: "royalConsolidation",
    visualVariant: "word",
    sceneType: "hero",
    evidenceBadgeMode: "auto",
  });

  await upsertScene(payload, publisher, {
    order: 3,
    act: actVI,
    title: "Besi Melintasi Brantas",
    slug: "1869-brantas-bridge",
    dateDisplay: "1869",
    primaryEvent: event1869,
    narrativeShort:
      "Sungai yang menjadi batas, lalu halangan militer, kini menjadi soal rekayasa — dan diseberangi.",
    // Tanpa featuredClaims: klaimnya belum terbit, dan Scene tidak boleh
    // menautkan klaim draft. Gerbangnya bekerja, bukan dilewati.
    featuredPlaces: [jembatanLama],
    themes: [themeId(themes, "jembatan-dan-perpindahan")],
    masterLine: "Sungai berhenti menjadi halangan dan menjadi soal rekayasa.",
    choreographyKey: "bridgeConstruction",
    visualVariant: "structure",
    sceneType: "hero",
    evidenceBadgeMode: "hidden",
  });

  log("Seed complete: 3 reviewed slices, 1 deliberately held at needs_review");
  process.exit(0);
}

/* ---------------- utilitas ---------------- */

/** Gagal keras bila sebuah tema hilang: relasi yang diam-diam kosong lebih buruk. */
function themeId(themes: Record<string, number>, slug: string): number {
  const id = themes[slug];
  if (id === undefined) throw new Error(`Seed theme missing: ${slug}`);
  return id;
}

type Payload = Awaited<ReturnType<typeof getPayload>>;

async function upsert(
  payload: Payload,
  collection: "sources" | "people" | "places" | "artifacts",
  matchTitle: string,
  data: Record<string, unknown>,
  user: never,
): Promise<number> {
  const field = collection === "sources" ? "title" : "canonicalName";
  const existing = await payload.find({
    // biome-ignore lint/suspicious/noExplicitAny: koleksi dipilih saat runtime
    collection: collection as any,
    where: { [field]: { like: matchTitle } },
    limit: 1,
  });
  if (existing.docs[0]) return existing.docs[0].id as number;
  const created = await payload.create({
    // biome-ignore lint/suspicious/noExplicitAny: koleksi dipilih saat runtime
    collection: collection as any,
    // biome-ignore lint/suspicious/noExplicitAny: bentuk data spesifik koleksi
    data: data as any,
    overrideAccess: true,
    user,
  });
  return created.id as number;
}

async function upsertClaim(
  payload: Payload,
  user: never,
  input: Record<string, unknown> & { slug: string; status?: "draft" },
): Promise<number> {
  const existing = await payload.find({
    collection: "evidence-claims",
    where: { slug: { equals: input.slug } },
    limit: 1,
  });
  if (existing.docs[0]) return existing.docs[0].id;
  const { status, ...rest } = input;
  // Klaim selalu lahir sebagai draf. Ia hanya naik menjadi terbit setelah
  // tautan buktinya ada — lihat publishClaim di bawah.
  const created = await payload.create({
    collection: "evidence-claims",
    // biome-ignore lint/suspicious/noExplicitAny: bentuk data spesifik koleksi
    data: { ...rest, _status: "draft" } as any,
    overrideAccess: true,
    user,
  });
  if (status === "draft") return created.id;
  return created.id;
}

/** Menaikkan klaim dari draf ke terbit setelah tautan buktinya terpasang. */
async function publishClaim(
  payload: Payload,
  user: never,
  id: number,
): Promise<void> {
  await payload.update({
    collection: "evidence-claims",
    id,
    data: { _status: "published" },
    overrideAccess: true,
    user,
  });
}

async function upsertLink(
  payload: Payload,
  user: never,
  input: Record<string, unknown>,
): Promise<number> {
  const existing = await payload.find({
    collection: "evidence-links",
    where: {
      and: [
        { claim: { equals: input.claim } },
        { source: { equals: input.source } },
      ],
    },
    limit: 1,
  });
  if (existing.docs[0]) return existing.docs[0].id;
  const created = await payload.create({
    collection: "evidence-links",
    // biome-ignore lint/suspicious/noExplicitAny: bentuk data spesifik koleksi
    data: { ...input, _status: "published" } as any,
    overrideAccess: true,
    user,
  });
  return created.id;
}

async function upsertEvent(
  payload: Payload,
  user: never,
  input: Record<string, unknown> & { slug: string },
): Promise<number> {
  const existing = await payload.find({
    collection: "events",
    where: { slug: { equals: input.slug } },
    limit: 1,
  });
  if (existing.docs[0]) return existing.docs[0].id;
  const created = await payload.create({
    collection: "events",
    // biome-ignore lint/suspicious/noExplicitAny: bentuk data spesifik koleksi
    data: { ...input, _status: "published" } as any,
    overrideAccess: true,
    user,
  });
  return created.id;
}

async function upsertAct(
  payload: Payload,
  user: never,
  input: Record<string, unknown> & { slug: string },
): Promise<number> {
  const existing = await payload.find({
    collection: "journey-acts",
    where: { slug: { equals: input.slug } },
    limit: 1,
  });
  if (existing.docs[0]) return existing.docs[0].id;
  const created = await payload.create({
    collection: "journey-acts",
    // biome-ignore lint/suspicious/noExplicitAny: bentuk data spesifik koleksi
    data: { ...input, _status: "published" } as any,
    overrideAccess: true,
    user,
  });
  return created.id;
}

async function upsertScene(
  payload: Payload,
  user: never,
  input: Record<string, unknown> & { slug: string },
): Promise<number> {
  const existing = await payload.find({
    collection: "scenes",
    where: { slug: { equals: input.slug } },
    limit: 1,
  });
  if (existing.docs[0]) return existing.docs[0].id;
  const created = await payload.create({
    collection: "scenes",
    // biome-ignore lint/suspicious/noExplicitAny: bentuk data spesifik koleksi
    data: { ...input, _status: "published" } as any,
    overrideAccess: true,
    user,
  });
  return created.id;
}

await main();
