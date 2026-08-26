import { z } from "zod";

/**
 * Kontrak environment (Master Implementation Plan bagian 5).
 *
 * Skema dipisahkan dari instans `env` supaya kontraknya dapat diuji tanpa
 * memicu validasi process.env pada saat impor. `src/env.ts` yang mengubahnya
 * menjadi environment tervalidasi yang gagal cepat.
 *
 * Rahasia hanya hidup di berkas environment yang tidak dilacak git.
 * `.env.example` memuat nama variabel dan tidak pernah nilainya.
 */

/** Rahasia Payload pendek membuat sesi admin mudah ditebak. */
export const SECRET_MIN_LENGTH = 32;

export const serverEnvSchema = {
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Phase 2 menyediakan instans PostgreSQL-nya; kontraknya ditetapkan sekarang
  // supaya tidak ada kode yang membaca variabel yang tidak tervalidasi.
  DATABASE_URL: z.string().min(1),
  PAYLOAD_SECRET: z.string().min(SECRET_MIN_LENGTH),

  // Preview draft harus terautentikasi atau ditandatangani; opsional sampai
  // alur preview ada (Phase 4).
  PREVIEW_SECRET: z.string().min(SECRET_MIN_LENGTH).optional(),

  // Object storage S3-compatible (Phase 2). Bucket publik hanya memuat
  // derivatif yang bersih hak; bucket privat memuat master arsip dan dokumen
  // hak, dan tidak pernah dilayani ke browser.
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().min(1).optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_PUBLIC_BUCKET: z.string().min(1).optional(),
  S3_PRIVATE_BUCKET: z.string().min(1).optional(),
  S3_PUBLIC_BASE_URL: z.url().optional(),
} as const;

export const clientEnvSchema = {
  NEXT_PUBLIC_SITE_URL: z.url(),
} as const;
