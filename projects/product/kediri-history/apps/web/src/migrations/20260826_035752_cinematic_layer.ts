import { sql } from "@payloadcms/db-postgres";
import type {
  MigrateDownArgs,
  MigrateUpArgs,
} from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_scenes_visual_variant" AS ENUM('material', 'landscape', 'word', 'structure', 'document');
  CREATE TYPE "public"."enum__scenes_v_version_visual_variant" AS ENUM('material', 'landscape', 'word', 'structure', 'document');
  ALTER TABLE "scenes" ADD COLUMN "master_line" varchar;
  ALTER TABLE "scenes" ADD COLUMN "visual_variant" "enum_scenes_visual_variant";
  ALTER TABLE "_scenes_v" ADD COLUMN "version_master_line" varchar;
  ALTER TABLE "_scenes_v" ADD COLUMN "version_visual_variant" "enum__scenes_v_version_visual_variant";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "scenes" DROP COLUMN "master_line";
  ALTER TABLE "scenes" DROP COLUMN "visual_variant";
  ALTER TABLE "_scenes_v" DROP COLUMN "version_master_line";
  ALTER TABLE "_scenes_v" DROP COLUMN "version_visual_variant";
  DROP TYPE "public"."enum_scenes_visual_variant";
  DROP TYPE "public"."enum__scenes_v_version_visual_variant";`)
}
