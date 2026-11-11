-- CreateTable
CREATE TABLE "usage_reservations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "estimated_cost_micros" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "finalized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_ledger" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "cached_input_tokens" INTEGER NOT NULL DEFAULT 0,
    "actual_cost_micros" BIGINT NOT NULL,
    "price_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "usage_reservations_workspace_id_status_expires_at_idx" ON "usage_reservations"("workspace_id", "status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "usage_reservations_workspace_id_idempotency_key_key" ON "usage_reservations"("workspace_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "usage_ledger_reservation_id_key" ON "usage_ledger"("reservation_id");

-- CreateIndex
CREATE INDEX "usage_ledger_user_id_created_at_idx" ON "usage_ledger"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "usage_ledger_workspace_id_created_at_idx" ON "usage_ledger"("workspace_id", "created_at");

-- AddForeignKey
ALTER TABLE "usage_reservations" ADD CONSTRAINT "usage_reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_reservations" ADD CONSTRAINT "usage_reservations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "usage_reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
