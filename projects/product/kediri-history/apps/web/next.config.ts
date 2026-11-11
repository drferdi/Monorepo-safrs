import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

/**
 * Konfigurasi Next dijaga seminimal mungkin. Payload dibungkus di sini karena
 * admin dan API-nya hidup di dalam app yang sama (modular monolith, Master
 * Implementation Plan §2 "Why one app").
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Server-first adalah kontrak arsitektur: halaman sejarah harus bermakna
  // sebelum JavaScript berjalan. Tidak ada konfigurasi yang boleh memaksa
  // seluruh Journey menjadi satu pohon klien.
  poweredByHeader: false,
};

export default withPayload(nextConfig);
