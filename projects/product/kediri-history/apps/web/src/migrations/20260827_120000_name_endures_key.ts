import { sql } from "@payloadcms/db-postgres";
import type { MigrateDownArgs, MigrateUpArgs } from "@payloadcms/db-postgres";

/**
 * Kunci koreografi ke-12: `nameEndures` (Scene 03 — 1015, The Name Endures).
 *
 * ADD VALUE pada enum diizinkan di dalam transaksi sejak PostgreSQL 12,
 * selama nilai barunya tidak dipakai pada transaksi yang sama — dan migrasi
 * ini memang hanya menambah nilainya. Enum tidak mendukung DROP VALUE, jadi
 * `down` memvalidasi tidak ada baris yang memakainya lalu membiarkan nilai
 * enum tetap ada: nilai tak terpakai tidak mengubah perilaku apa pun.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_scenes_choreography_key" ADD VALUE IF NOT EXISTS 'nameEndures';
  ALTER TYPE "public"."enum__scenes_v_version_choreography_key" ADD VALUE IF NOT EXISTS 'nameEndures';`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   UPDATE "scenes" SET "choreography_key" = NULL WHERE "choreography_key" = 'nameEndures';
  UPDATE "_scenes_v" SET "version_choreography_key" = NULL WHERE "version_choreography_key" = 'nameEndures';`);
}
