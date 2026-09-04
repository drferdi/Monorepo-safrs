#!/usr/bin/env node
/**
 * Generator aset merek: favicon, ikon aplikasi, dan citra Open Graph.
 *
 * Aset biner tidak boleh muncul di repositori tanpa asal-usul yang dapat
 * ditelusuri. Berkas ini adalah asal-usul itu: setiap keluaran diturunkan dari
 * sumber yang SUDAH ada di capsule ini, tidak ada identitas visual baru yang
 * dikarang, dan menjalankan ulang skrip ini menghasilkan berkas yang sama.
 *
 *   sumber ikon   apps/web/src/app/icon.svg          (logomark K, sudah dipakai)
 *   sumber OG     apps/web/public/journey-approved/00-prologue.webp
 *                 (visualisasi artistik Kediri 2026 yang sudah disetujui —
 *                  aset yang sama dengan bingkai Prolog dan Finale)
 *   warna         apps/web/src/modules/design-system/tokens/kediri.json
 *                 (dibaca saat jalan; nilai mentah tidak pernah ditulis di sini,
 *                  karena scripts/ ikut dipindai gerbang token)
 *
 * Menjalankan:  node scripts/generate-brand-assets.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const at = (relative) => `${ROOT}${relative}`;

const ICON_SOURCE = at("apps/web/src/app/icon.svg");
const OG_SOURCE = at("apps/web/public/journey-approved/00-prologue.webp");
const TOKENS = at("apps/web/src/modules/design-system/tokens/kediri.json");

/** Kanvas sinematik dari snapshot token — bukan warna yang dipilih di sini. */
const tokens = JSON.parse(readFileSync(TOKENS, "utf8"));
const canvas = tokens.cinemaDark["--cinema-canvas"].value;

const icon = readFileSync(ICON_SOURCE);

/**
 * Merender logomark pada ukuran persegi tertentu, DIRATAKAN ke atas kanvas
 * gelap. Perataan itu penting untuk ikon iOS: iOS menerapkan masker sudutnya
 * sendiri, dan sudut transparan milik SVG akan tampil hitam pekat di
 * layar beranda.
 */
const square = (size) =>
  sharp(icon, { density: 384 })
    .resize(size, size, { fit: "contain", background: canvas })
    .flatten({ background: canvas })
    .png({ compressionLevel: 9 })
    .toBuffer();

/**
 * Pembungkus ICO. Format ICO menerima muatan PNG (didukung setiap peramban
 * modern), jadi tidak ada dependensi tambahan yang dibutuhkan: header 6 bita,
 * satu entri direktori 16 bita per ukuran, lalu PNG-nya apa adanya.
 */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = [];
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // 0 berarti 256
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palet
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bit per piksel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(entry);
  }

  return Buffer.concat([
    header,
    ...entries,
    ...images.map((image) => image.data),
  ]);
}

const outputs = [];

/* favicon.ico — tiga ukuran klasik dalam satu wadah. */
const faviconSizes = [16, 32, 48];
const faviconImages = await Promise.all(
  faviconSizes.map(async (size) => ({ size, data: await square(size) })),
);
const faviconPath = at("apps/web/src/app/favicon.ico");
writeFileSync(faviconPath, ico(faviconImages));
outputs.push(["apps/web/src/app/favicon.ico", `${faviconSizes.join("/")} px`]);

/* apple-icon.png — 180x180 tepat, sesuai yang diminta iOS. */
const applePath = at("apps/web/src/app/apple-icon.png");
writeFileSync(applePath, await square(180));
outputs.push(["apps/web/src/app/apple-icon.png", "180x180"]);

/* Ikon manifest — minimum yang membuat aplikasi web dapat dipasang. */
for (const size of [192, 512]) {
  const target = `apps/web/public/icon-${size}.png`;
  writeFileSync(at(target), await square(size));
  outputs.push([target, `${size}x${size}`]);
}

/*
 * Citra Open Graph 1200x630. Sumbernya 3:2, jadi pemotongan ke 1,91:1
 * mengambil pita tengah; titik fokusnya digeser sedikit ke bawah agar bentang
 * jembatan dan pantulan Brantas tetap berada di dalam bingkai, sama seperti
 * pengarahan bingkai Prolog. JPEG, bukan WebP: sebagian konsumen Open Graph
 * (termasuk beberapa klien pesan) masih menolak WebP.
 */
const ogPath = at("apps/web/public/og-image.jpg");
writeFileSync(
  ogPath,
  await sharp(OG_SOURCE)
    .resize(1200, 630, { fit: "cover", position: "attention" })
    .jpeg({ quality: 84, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toBuffer(),
);
outputs.push(["apps/web/public/og-image.jpg", "1200x630"]);

for (const [file, note] of outputs) {
  console.log(`${file.padEnd(42)} ${note}`);
}
