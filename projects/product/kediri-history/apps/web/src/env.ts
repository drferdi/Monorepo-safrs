import { createEnv } from "@t3-oss/env-nextjs";

import { clientEnvSchema, serverEnvSchema } from "./env.schema";

export { clientEnvSchema, serverEnvSchema } from "./env.schema";

/**
 * Environment tervalidasi. Mengimpor berkas ini memvalidasi kontraknya: nilai
 * kritis produksi yang hilang menggagalkan proses saat itu juga, bukan
 * belakangan di jalur permintaan.
 */
export const env = createEnv({
  server: serverEnvSchema,
  client: clientEnvSchema,
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    PAYLOAD_SECRET: process.env.PAYLOAD_SECRET,
    PREVIEW_SECRET: process.env.PREVIEW_SECRET,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_REGION: process.env.S3_REGION,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_PUBLIC_BUCKET: process.env.S3_PUBLIC_BUCKET,
    S3_PRIVATE_BUCKET: process.env.S3_PRIVATE_BUCKET,
    S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  emptyStringAsUndefined: true,
  // Satu-satunya jalan keluar yang sah adalah eksplisit dan dicatat, bukan
  // diam-diam memberi nilai default pada rahasia produksi.
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
});
