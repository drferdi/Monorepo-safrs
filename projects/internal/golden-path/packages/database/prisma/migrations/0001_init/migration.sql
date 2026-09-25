CREATE TABLE "demos" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transaction_samples" (
    "id" BIGSERIAL NOT NULL,
    "demo_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_samples_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "transaction_samples_demo_id_idx" ON "transaction_samples"("demo_id");

ALTER TABLE "transaction_samples"
ADD CONSTRAINT "transaction_samples_demo_id_fkey"
FOREIGN KEY ("demo_id") REFERENCES "demos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
