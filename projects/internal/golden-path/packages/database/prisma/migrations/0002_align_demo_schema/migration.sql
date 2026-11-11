ALTER TABLE "transaction_samples" DROP CONSTRAINT IF EXISTS "transaction_samples_demo_id_fkey";
DROP TABLE IF EXISTS "transaction_samples";
DROP SEQUENCE IF EXISTS "transaction_samples_id_seq";
ALTER TABLE "demos" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS "demos_name_key" ON "demos"("name");
