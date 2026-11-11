-- Xendit payment lifecycle: durable subscription state, replay-safe events.
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "plan_code" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "current_period_ends_at" TIMESTAMP(3),
    "grace_ends_at" TIMESTAMP(3),
    "provider" TEXT NOT NULL DEFAULT 'xendit',
    "provider_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "lifecycle" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscriptions_workspace_id_key" ON "subscriptions"("workspace_id");
CREATE UNIQUE INDEX "subscriptions_provider_reference_key" ON "subscriptions"("provider_reference");
CREATE INDEX "subscriptions_user_id_state_idx" ON "subscriptions"("user_id", "state");
CREATE UNIQUE INDEX "payment_events_provider_provider_event_id_key" ON "payment_events"("provider", "provider_event_id");
CREATE INDEX "payment_events_workspace_id_created_at_idx" ON "payment_events"("workspace_id", "created_at");

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
