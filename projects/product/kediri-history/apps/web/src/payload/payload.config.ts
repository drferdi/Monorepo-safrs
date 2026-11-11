import path from "node:path";
import { fileURLToPath } from "node:url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import { buildConfig } from "payload";
import sharp from "sharp";

import { env } from "../env";
import { Artifacts } from "./collections/Artifacts";
import { Events } from "./collections/Events";
import { EvidenceClaims } from "./collections/EvidenceClaims";
import { EvidenceLinks } from "./collections/EvidenceLinks";
import { JourneyActs } from "./collections/JourneyActs";
import { MediaAssets } from "./collections/MediaAssets";
import { MediaMasters } from "./collections/MediaMasters";
import { People } from "./collections/People";
import { Places } from "./collections/Places";
import { RightsDocuments } from "./collections/RightsDocuments";
import { Scenes } from "./collections/Scenes";
import { Sources } from "./collections/Sources";
import { Themes } from "./collections/Themes";
import { Users } from "./collections/Users";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Urutan koleksi mengikuti urutan pembuatan Master Implementation Plan bagian
 * 6: identitas dan hak lebih dulu, lalu sumber, lalu catatan historis, lalu
 * bukti, dan baru terakhir lapisan pengalaman. Urutan itu bukan gaya — ia
 * memastikan Scene tidak pernah dibangun sebelum ada kebenaran untuk disajikan.
 */

const objectStorageConfigured =
  env.S3_ENDPOINT !== undefined &&
  env.S3_ACCESS_KEY_ID !== undefined &&
  env.S3_SECRET_ACCESS_KEY !== undefined &&
  env.S3_PUBLIC_BUCKET !== undefined &&
  env.S3_PRIVATE_BUCKET !== undefined;

const s3ClientConfig = {
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION ?? "us-east-1",
  // MinIO lokal memerlukan path-style; penyedia S3 sungguhan mengabaikannya.
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? "",
  },
};

/**
 * Dua instans plugin, dua bucket. Ini bukan duplikasi: pemisahan publik dan
 * privat adalah aturan arsitektur (Technical Bible bagian 38). Master arsip
 * dan dokumen hak tidak pernah berada di bucket yang dapat dibaca anonim.
 */
const storagePlugins = objectStorageConfigured
  ? [
      s3Storage({
        collections: { "media-assets": true },
        bucket: env.S3_PUBLIC_BUCKET as string,
        acl: "public-read",
        config: s3ClientConfig,
      }),
      s3Storage({
        collections: {
          "media-masters": { signedDownloads: true },
          "rights-documents": { signedDownloads: true },
        },
        bucket: env.S3_PRIVATE_BUCKET as string,
        acl: "private",
        config: s3ClientConfig,
      }),
    ]
  : [];

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname, "../app/(payload)") },
    meta: {
      titleSuffix: " · Kediri",
    },
  },
  collections: [
    Users,
    RightsDocuments,
    MediaMasters,
    MediaAssets,
    Sources,
    People,
    Places,
    Artifacts,
    Themes,
    Events,
    EvidenceClaims,
    EvidenceLinks,
    JourneyActs,
    Scenes,
  ],
  editor: lexicalEditor(),
  // Satu entitas historis, bahasa publik yang dilokalkan. Tidak pernah ada
  // Event Indonesia dan Event Inggris yang terpisah (Technical Bible bagian 33).
  localization: {
    locales: ["id", "en"],
    defaultLocale: "id",
    fallback: true,
  },
  secret: env.PAYLOAD_SECRET,
  db: postgresAdapter({
    pool: { connectionString: env.DATABASE_URL },
    // Skema dikelola migrasi, bukan push otomatis. Push diam-diam membuat
    // basis data pengembang menyimpang dari migrasi yang benar-benar dijalankan
    // saat rilis, dan penyimpangan itu baru terlihat di produksi.
    push: false,
    migrationDir: path.resolve(dirname, "../migrations"),
  }),
  plugins: storagePlugins,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
});
